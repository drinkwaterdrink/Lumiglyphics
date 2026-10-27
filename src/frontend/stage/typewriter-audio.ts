export type TypewriterAudioMode = "off" | "blip" | "click" | "pip";

/**
 * Web Audio procedural typewriter click/blip synthesizer.
 * Completely self-contained, zero external network sound assets, zero latency.
 */
export class TypewriterAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private mode: TypewriterAudioMode = "blip";
  private volume = 0.35;
  private lastPlayTime = 0;
  private readonly minIntervalMs = 38;

  constructor(mode: TypewriterAudioMode = "blip", volume = 0.35) {
    this.mode = mode;
    this.volume = Math.max(0, Math.min(1, volume));
  }

  setMode(mode: TypewriterAudioMode): void {
    this.mode = mode;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getMode(): TypewriterAudioMode {
    return this.mode;
  }

  private initContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    try {
      this.ctx = new AudioContextClass();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  play(): void {
    if (this.mode === "off" || this.volume <= 0) return;
    const now = Date.now();
    if (now - this.lastPlayTime < this.minIntervalMs) return;
    this.lastPlayTime = now;

    const ctx = this.initContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    try {
      switch (this.mode) {
        case "click":
          this.playClick(ctx);
          break;
        case "pip":
          this.playPip(ctx);
          break;
        case "blip":
        default:
          this.playBlip(ctx);
          break;
      }
    } catch {
      // Audio autoplay or device permissions safe fallback
    }
  }

  private playBlip(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;

    osc.type = "sine";
    // Pitch micro-decay for organic game chatter feel (680Hz -> 540Hz)
    osc.frequency.setValueAtTime(680, t);
    osc.frequency.exponentialRampToValueAtTime(540, t + 0.025);

    const masterVol = this.volume * 0.15;
    gain.gain.setValueAtTime(masterVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.026);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.028);
  }

  private playClick(ctx: AudioContext): void {
    // Mechanical micro-click: brief bandpassed noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.012);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1600;
    filter.Q.value = 2.5;

    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(this.volume * 0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(t);
  }

  private playPip(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1150, t);
    osc.frequency.exponentialRampToValueAtTime(920, t + 0.02);

    const masterVol = this.volume * 0.12;
    gain.gain.setValueAtTime(masterVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.024);
  }

  destroy(): void {
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
