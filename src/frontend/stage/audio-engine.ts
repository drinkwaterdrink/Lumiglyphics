export interface AudioPlayerElement {
  src: string;
  volume: number;
  loop: boolean;
  paused: boolean;
  currentTime: number;
  play(): Promise<void>;
  pause(): void;
  addEventListener(event: string, listener: (...args: unknown[]) => void): void;
  removeEventListener(event: string, listener: (...args: unknown[]) => void): void;
}

export type AudioFactory = (src: string) => AudioPlayerElement;

export function createMockAudioPlayer(src: string): AudioPlayerElement {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  let currentVolume = 1;
  let isPaused = true;

  return {
    src,
    loop: false,
    currentTime: 0,
    get volume() {
      return currentVolume;
    },
    set volume(val: number) {
      currentVolume = Math.max(0, Math.min(1, val));
    },
    get paused() {
      return isPaused;
    },
    async play() {
      isPaused = false;
      const playListeners = listeners.get("play");
      playListeners?.forEach((fn) => fn());
    },
    pause() {
      isPaused = true;
      const pauseListeners = listeners.get("pause");
      pauseListeners?.forEach((fn) => fn());
    },
    addEventListener(event: string, listener: (...args: unknown[]) => void) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(listener);
    },
    removeEventListener(event: string, listener: (...args: unknown[]) => void) {
      listeners.get(event)?.delete(listener);
    },
  };
}

export function formatAudioUrl(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (/^[a-zA-Z]:[\\/]/.test(trimmed)) {
    return `file:///${trimmed.replace(/\\/g, "/")}`;
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/api/")) {
    return `file://${trimmed}`;
  }
  return trimmed;
}

function defaultAudioFactory(src: string): AudioPlayerElement {
  const formatted = formatAudioUrl(src);
  if (typeof Audio !== "undefined") {
    const audio = new Audio(formatted);
    return audio as unknown as AudioPlayerElement;
  }
  return createMockAudioPlayer(formatted);
}

export type TimerHandle = unknown;

export interface AudioEngineOptions {
  bgmVolume?: number;
  sfxVolume?: number;
  crossfadeDuration?: number;
  /** F12: duration of the eased presentation-duck ramp. 0 restores instant steps. */
  attenuationRampMs?: number;
  audioFactory?: AudioFactory;
  now?: () => number;
  setInterval?: (handler: () => void, timeout?: number) => TimerHandle;
  clearInterval?: (handle: TimerHandle) => void;
}

interface ActiveBgm {
  /** Fade envelope independent of global music volume and presentation attenuation. */
  gain: number;
  player: AudioPlayerElement;
  src: string;
  fadeTimer?: TimerHandle | undefined;
  /** F12: timer driving the eased attenuation ramp, independent of fadeTimer. */
  attenTimer?: TimerHandle | undefined;
  /** Effective attenuation while a ramp is in flight; equals bgmAttenuation when idle. */
  attenLevel: number;
}

const DEFAULT_CROSSFADE_DURATION_MS = 1500;
/** F12: ducking ("Quiet"/"Mute" boundaries) eases over this window by default. */
const DEFAULT_ATTENUATION_RAMP_MS = 420;
/** F14: stalled SFX elements that never fire ended/error must not accumulate forever. */
export const MAX_ACTIVE_SFX = 32;

export class AudioEngine {
  private bgmVolume: number;
  private bgmAttenuation=1;
  private readonly bgmTracks=new Set<ActiveBgm>();
  private sfxVolume: number;
  private readonly crossfadeDuration: number;
  private readonly attenuationRampMs: number;
  private readonly audioFactory: AudioFactory;
  private readonly now: () => number;
  private readonly setInterval: (handler: () => void, timeout?: number) => TimerHandle;
  private readonly clearInterval: (handle: TimerHandle) => void;
  private activeBgm: ActiveBgm | null = null;
  private outgoingBgm: ActiveBgm | null = null;
  private activeSfx = new Set<AudioPlayerElement>();
  private destroyed = false;

  constructor(options: AudioEngineOptions = {}) {
    this.bgmVolume = Math.max(0, Math.min(1, options.bgmVolume ?? 0.7));
    this.sfxVolume = Math.max(0, Math.min(1, options.sfxVolume ?? 0.8));
    this.crossfadeDuration = options.crossfadeDuration ?? DEFAULT_CROSSFADE_DURATION_MS;
    this.attenuationRampMs = options.attenuationRampMs ?? DEFAULT_ATTENUATION_RAMP_MS;
    this.audioFactory = options.audioFactory ?? defaultAudioFactory;
    this.now = options.now ?? (() => Date.now());
    this.setInterval = options.setInterval ?? ((handler, timeout) => setInterval(handler, timeout));
    this.clearInterval = options.clearInterval ?? ((handle) => clearInterval(handle as ReturnType<typeof setInterval>));
  }

  getBgmVolume(): number {
    return this.bgmVolume;
  }

  setBgmVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    for(const item of this.bgmTracks)this.setTrackVolume(item,item===this.activeBgm&&item.fadeTimer===undefined?1:item.gain);
  }

  /**
   * Presentation-only gain: keep the track and its playback position. F12 —
   * the factor eases in over `attenuationRampMs` instead of snapping, so a
   * "Quiet"/"Mute" boundary reads as a deliberate music-bed change. The ramp
   * timer is independent of the crossfade envelope (fadeTimer); retargeting
   * mid-ramp starts again from the level currently heard.
   */
  setBgmAttenuation(factor:number,rampMs:number=this.attenuationRampMs):void {
    const next=Number.isFinite(factor)?Math.max(0,Math.min(1,factor)):1;
    const previous=this.bgmAttenuation;
    this.bgmAttenuation=next;
    for(const item of this.bgmTracks){
      this.clearAtten(item);
      if(rampMs<=0||previous===next){
        item.attenLevel=next;
        this.setTrackVolume(item,item.gain);
        continue;
      }
      const startLevel=item.attenLevel;
      const startedAt=this.now();
      const intervalMs=25;
      item.attenTimer=this.setInterval(()=>{
        const progress=Math.min(1,(this.now()-startedAt)/rampMs);
        // Ease-out: fast initial duck, gentle settle.
        const eased=1-(1-progress)*(1-progress);
        item.attenLevel=startLevel+(next-startLevel)*eased;
        this.setTrackVolume(item,item.gain);
        if(progress>=1){
          this.clearAtten(item);
          item.attenLevel=next;
          this.setTrackVolume(item,item.gain);
        }
      },intervalMs);
    }
  }

  private clearAtten(item:ActiveBgm):void {
    if(item.attenTimer!==undefined){
      this.clearInterval(item.attenTimer);
      item.attenTimer=undefined;
    }
  }

  private setTrackVolume(item:ActiveBgm,gain:number):void {
    item.gain=Math.max(0,Math.min(1,gain));
    item.player.volume=item.gain*this.bgmVolume*item.attenLevel;
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    for (const sfx of this.activeSfx) {
      sfx.volume = this.sfxVolume;
    }
  }

  getCurrentBgm(): string | null {
    return this.activeBgm?.src ?? null;
  }

  /**
   * Play or crossfade to a new BGM track.
   * If the track is already playing, maintains playback and ensures volume is restored.
   * If a previous track is playing, smoothly fades it out over 1.5s while fading in the new track.
   */
  playBgm(src: string, options: { crossfadeDuration?: number } = {}): void {
    if (this.destroyed) return;
    const cleanSrc = src ? src.trim() : "";
    if (!cleanSrc) {
      this.stopBgm(options);
      return;
    }

    const duration = options.crossfadeDuration ?? this.crossfadeDuration;

    // Already playing the exact same track?
    if (this.activeBgm && this.activeBgm.src === cleanSrc) {
      if (this.activeBgm.player.paused) {
        this.activeBgm.player.play().catch(() => {});
      }
      this.fadeVolume(this.activeBgm, 1, duration);
      return;
    }

    // Fade out previous active track
    if (this.activeBgm) {
      this.fadeOutAndCleanup(this.activeBgm, duration);
      this.activeBgm = null;
    }

    // Create and start new BGM track
    const player = this.audioFactory(cleanSrc);
    player.loop = true;
    player.volume = 0;

    const bgm: ActiveBgm = { player, src: cleanSrc, gain:0, attenLevel:this.bgmAttenuation };
    this.bgmTracks.add(bgm);
    this.activeBgm = bgm;

    player.play().catch(() => {
      // Browser autoplay policy or headless stub error
    });

    this.fadeVolume(bgm, 1, duration);
  }

  /**
   * Stop current BGM with a smooth fade-out.
   */
  stopBgm(options: { fadeDuration?: number; crossfadeDuration?: number } = {}): void {
    const duration = options.fadeDuration ?? options.crossfadeDuration ?? this.crossfadeDuration;
    if (this.activeBgm) {
      this.fadeOutAndCleanup(this.activeBgm, duration);
      this.activeBgm = null;
    }
    if (this.outgoingBgm) {
      this.fadeOutAndCleanup(this.outgoingBgm, duration);
      this.outgoingBgm = null;
    }
  }

  /**
   * Play a one-shot SFX cue.
   */
  playSfx(src: string, options: { volume?: number } = {}): void {
    if (this.destroyed) return;
    const cleanSrc = src ? src.trim() : "";
    if (!cleanSrc || this.sfxVolume <= 0) return;

    const player = this.audioFactory(cleanSrc);
    player.loop = false;
    const sfxVol = Math.max(0, Math.min(1, (options.volume ?? 1) * this.sfxVolume));
    player.volume = sfxVol;

    const onEnded = () => {
      this.activeSfx.delete(player);
      player.removeEventListener("ended", onEnded);
      player.removeEventListener("error", onEnded);
    };

    player.addEventListener("ended", onEnded);
    player.addEventListener("error", onEnded);
    this.activeSfx.add(player);

    // F14: a stalled network element can fire neither ended nor error
    // (mobile background tabs, interrupted requests). Bound the set so such
    // players can never accumulate for the whole reading session.
    if (this.activeSfx.size > MAX_ACTIVE_SFX) {
      const oldest = this.activeSfx.values().next().value;
      if (oldest) {
        // Its own ended/error closure self-removes if the paused element
        // ever settles later; the set eviction is what bounds retention.
        oldest.pause();
        this.activeSfx.delete(oldest);
      }
    }

    player.play().catch(() => {
      this.activeSfx.delete(player);
    });
  }

  /**
   * Stop all audio immediately.
   */
  stopAll(): void {
    for(const item of this.bgmTracks){this.clearFade(item);this.clearAtten(item);item.player.pause();}
    this.bgmTracks.clear();
    this.activeBgm = null;
    this.outgoingBgm = null;
    for (const sfx of this.activeSfx) {
      sfx.pause();
    }
    this.activeSfx.clear();
  }

  destroy(): void {
    this.destroyed = true;
    this.stopAll();
  }

  private clearFade(item: ActiveBgm): void {
    if (item.fadeTimer !== undefined) {
      this.clearInterval(item.fadeTimer);
      item.fadeTimer = undefined;
    }
  }

  private fadeVolume(item: ActiveBgm, targetVolume: number, durationMs: number): void {
    this.clearFade(item);
    if (durationMs <= 0) {
      this.setTrackVolume(item,targetVolume);
      return;
    }

    const startVolume = item.gain;
    const startTime = this.now();
    const intervalMs = 25;

    item.fadeTimer = this.setInterval(() => {
      const elapsed = this.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const newVolume = startVolume + (targetVolume - startVolume) * progress;
      this.setTrackVolume(item,newVolume);

      if (progress >= 1) {
        this.clearFade(item);
        this.setTrackVolume(item,targetVolume);
      }
    }, intervalMs);
  }

  private fadeOutAndCleanup(item: ActiveBgm, durationMs: number): void {
    this.clearFade(item);
    this.outgoingBgm = item;

    if (durationMs <= 0) {
      item.player.pause();
      this.clearAtten(item);
      this.bgmTracks.delete(item);
      if (this.outgoingBgm === item) this.outgoingBgm = null;
      return;
    }

    const startVolume = item.gain;
    const startTime = this.now();
    const intervalMs = 25;

    item.fadeTimer = this.setInterval(() => {
      const elapsed = this.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const newVolume = startVolume * (1 - progress);
      this.setTrackVolume(item,newVolume);

      if (progress >= 1) {
        this.clearFade(item);
        this.clearAtten(item);
        item.player.pause();
        this.bgmTracks.delete(item);
        if (this.outgoingBgm === item) this.outgoingBgm = null;
      }
    }, intervalMs);
  }
}
