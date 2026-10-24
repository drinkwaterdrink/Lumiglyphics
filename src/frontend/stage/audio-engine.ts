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
}

const DEFAULT_CROSSFADE_DURATION_MS = 1500;

export class AudioEngine {
  private bgmVolume: number;
  private bgmAttenuation=1;
  private speechDucking=1;
  private readonly bgmTracks=new Set<ActiveBgm>();
  private sfxVolume: number;
  private readonly crossfadeDuration: number;
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

  /** Presentation-only gain: keep the track and its playback position. */
  setBgmAttenuation(factor:number):void {
    this.bgmAttenuation=Number.isFinite(factor)?Math.max(0,Math.min(1,factor)):1;
    for(const item of this.bgmTracks)this.setTrackVolume(item,item.gain);
  }

  /** Duck BGM while speech/TTS playback is active, then restore cleanly. */
  setSpeechDucking(active:boolean):void {
    const next=active?0.38:1;
    if(this.speechDucking===next)return;
    this.speechDucking=next;
    for(const item of this.bgmTracks)this.setTrackVolume(item,item.gain);
  }

  private setTrackVolume(item:ActiveBgm,gain:number):void {
    item.gain=Math.max(0,Math.min(1,gain));
    item.player.volume=item.gain*this.bgmVolume*this.bgmAttenuation*this.speechDucking;
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

    const bgm: ActiveBgm = { player, src: cleanSrc, gain:0 };
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

    if (this.activeSfx.size >= 6) {
      const oldest = this.activeSfx.values().next().value;
      if (oldest) {
        oldest.pause();
        this.activeSfx.delete(oldest);
      }
    }
    const player = this.audioFactory(cleanSrc);
    player.loop = false;
    const sfxVol = Math.max(0, Math.min(1, (options.volume ?? 1) * this.sfxVolume));
    player.volume = sfxVol;

    this.activeSfx.add(player);

    const onEnded = () => {
      this.activeSfx.delete(player);
      player.removeEventListener("ended", onEnded);
      player.removeEventListener("error", onEnded);
    };

    player.addEventListener("ended", onEnded);
    player.addEventListener("error", onEnded);

    player.play().catch(() => {
      this.activeSfx.delete(player);
    });
  }

  /**
   * Stop all audio immediately.
   */
  stopAll(): void {
    for(const item of this.bgmTracks){this.clearFade(item);item.player.pause();}
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
      const eased = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      const newVolume = startVolume + (targetVolume - startVolume) * eased;
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
      const eased = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      const newVolume = startVolume * (1 - eased);
      this.setTrackVolume(item,newVolume);

      if (progress >= 1) {
        this.clearFade(item);
        item.player.pause();
        this.bgmTracks.delete(item);
        if (this.outgoingBgm === item) this.outgoingBgm = null;
      }
    }, intervalMs);
  }
}
