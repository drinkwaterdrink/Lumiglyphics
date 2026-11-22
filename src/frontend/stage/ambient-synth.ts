/**
 * Pure Web Audio API procedural soundscape & foley synthesizer.
 * Zero external files, zero network requests, safe no-op in headless/test runtimes.
 */

export type AmbientPresetKind =
  | "rain"
  | "heavy_rain"
  | "storm"
  | "candlelight_warmth"
  | "embers"
  | "snow"
  | "snowstorm"
  | "cold_mist"
  | "fog"
  | "fireflies"
  | "forest"
  | "ocean"
  | "underwater_bubbles"
  | "room_tone"
  | "tavern"
  | "neon_haze";

export type FoleyKind = "parchment" | "bond_chime" | "dice_roll" | "page_turn";

const KNOWN_PRESETS: ReadonlySet<string> = new Set<AmbientPresetKind>([
  "rain",
  "heavy_rain",
  "storm",
  "candlelight_warmth",
  "embers",
  "snow",
  "snowstorm",
  "cold_mist",
  "fog",
  "fireflies",
  "forest",
  "ocean",
  "underwater_bubbles",
  "room_tone",
  "tavern",
  "neon_haze",
]);

export function normalizeAmbientPreset(raw?: string | null): AmbientPresetKind | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!cleaned || cleaned === "none" || cleaned === "off" || cleaned === "clear") return null;
  if (KNOWN_PRESETS.has(cleaned)) return cleaned as AmbientPresetKind;
  if (cleaned.includes("thunder") || cleaned.includes("storm")) return "storm";
  if (cleaned.includes("heavy") && cleaned.includes("rain")) return "heavy_rain";
  if (cleaned.includes("rain") || cleaned.includes("drizzle")) return "rain";
  if (cleaned.includes("snow") || cleaned.includes("blizzard")) return "snow";
  if (cleaned.includes("mist") || cleaned.includes("frost")) return "cold_mist";
  if (cleaned.includes("fog")) return "fog";
  if (cleaned.includes("ember") || cleaned.includes("fire") || cleaned.includes("hearth")) return "embers";
  if (cleaned.includes("candle")) return "candlelight_warmth";
  if (cleaned.includes("underwater") || cleaned.includes("bubble")) return "underwater_bubbles";
  if (cleaned.includes("ocean") || cleaned.includes("sea") || cleaned.includes("wave")) return "ocean";
  if (cleaned.includes("forest") || cleaned.includes("woods")) return "forest";
  if (cleaned.includes("firefl") || cleaned.includes("night")) return "fireflies";
  if (cleaned.includes("tavern") || cleaned.includes("inn") || cleaned.includes("pub")) return "tavern";
  if (cleaned.includes("neon") || cleaned.includes("cyber") || cleaned.includes("synth")) return "neon_haze";
  if (cleaned.includes("room") || cleaned.includes("indoor") || cleaned.includes("quiet")) return "room_tone";
  return null;
}

export class AmbientSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enclosureFilter: BiquadFilterNode | null = null;
  private duckGain: GainNode | null = null;
  private bedNodes: Array<{ stop?: () => void; disconnect: () => void }> = [];
  private bedTimers: Array<ReturnType<typeof setInterval>> = [];
  private activePreset: AmbientPresetKind | null = null;
  private indoor = false;
  private enabled = true;
  private volume = 0.45;
  private duckFactor = 1;
  private userTrackActive = false;
  private disposed = false;

  setEnabled(enabled: boolean): void {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.teardownBed();
    } else if (this.activePreset && !this.userTrackActive) {
      this.rebuildBed();
    }
    this.updateGainTargets();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0.45));
    this.updateGainTargets();
  }

  setSpeechDucking(active: boolean): void {
    this.duckFactor = active ? 0.38 : 1;
    this.updateGainTargets();
  }

  setUserTrackActive(active: boolean): void {
    if (this.userTrackActive === active) return;
    this.userTrackActive = active;
    if (active) {
      this.updateGainTargets();
    } else if (this.enabled && this.activePreset) {
      if (this.bedNodes.length === 0) this.rebuildBed();
      this.updateGainTargets();
    }
  }

  setAtmosphere(preset?: string | null, options: { indoor?: boolean } = {}): void {
    if (this.disposed) return;
    const normalized = normalizeAmbientPreset(preset);
    const nextIndoor = Boolean(options.indoor);
    const presetChanged = normalized !== this.activePreset;
    const indoorChanged = nextIndoor !== this.indoor;
    this.activePreset = normalized;
    this.indoor = nextIndoor;

    if (!normalized || !this.enabled) {
      this.teardownBed();
      return;
    }
    if (presetChanged || this.bedNodes.length === 0) {
      this.rebuildBed();
    }
    if (presetChanged || indoorChanged) {
      this.updateEnclosureFilter();
      this.updateGainTargets();
    }
  }

  playFoley(kind: FoleyKind, sfxVolume = 0.8): void {
    if (this.disposed || !this.enabled || sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const vol = Math.max(0, Math.min(1, sfxVolume)) * 0.25;
    const now = ctx.currentTime;

    if (kind === "bond_chime") {
      // Warm crystalline harmonic triad (C5 - E5 - G5)
      for (const [idx, freq] of [523.25, 659.25, 783.99].entries()) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.045);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(vol * 0.35, now + idx * 0.045 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.6);
      }
      return;
    }

    if (kind === "dice_roll") {
      // 3 crisp woody clicks
      for (const offset of [0, 0.055, 0.12]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(240 + offset * 600, now + offset);
        osc.frequency.exponentialRampToValueAtTime(90, now + offset + 0.035);
        gain.gain.setValueAtTime(vol * 0.5, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.05);
      }
      return;
    }

    // parchment / page_turn: short band-passed noise rustle
    const duration = kind === "parchment" ? 0.22 : 0.12;
    const buf = this.createNoiseBuffer(ctx, duration, "pink");
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(kind === "parchment" ? 2100 : 1600, now);
    filter.Q.setValueAtTime(1.4, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol * 0.45, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  stop(): void {
    this.activePreset = null;
    this.teardownBed();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    if (this.ctx) {
      try { void this.ctx.close(); } catch { /* ignore */ }
      this.ctx = null;
    }
    this.masterGain = null;
    this.enclosureFilter = null;
    this.duckGain = null;
  }

  private ensureContext(): AudioContext | null {
    if (this.disposed) return null;
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        try { void this.ctx.resume(); } catch { /* ignore */ }
      }
      return this.ctx;
    }
    const g = globalThis as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = g.AudioContext ?? g.webkitAudioContext;
    if (!Ctor) return null;
    try {
      const ctx = new Ctor();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = this.indoor ? 650 : 18000;
      const duck = ctx.createGain();
      duck.gain.value = this.duckFactor;
      const master = ctx.createGain();
      master.gain.value = 0;

      filter.connect(duck);
      duck.connect(master);
      master.connect(ctx.destination);

      this.ctx = ctx;
      this.enclosureFilter = filter;
      this.duckGain = duck;
      this.masterGain = master;
      return ctx;
    } catch {
      return null;
    }
  }

  private updateEnclosureFilter(): void {
    if (!this.ctx || !this.enclosureFilter) return;
    const targetFreq = this.indoor ? 650 : 18000;
    try {
      this.enclosureFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.25);
    } catch {
      this.enclosureFilter.frequency.value = targetFreq;
    }
  }

  private updateGainTargets(): void {
    if (!this.ctx || !this.masterGain || !this.duckGain) return;
    const indoorScale = this.indoor ? 0.68 : 1;
    const targetMaster = !this.enabled || this.userTrackActive || !this.activePreset
      ? 0
      : this.volume * 0.26 * indoorScale;
    try {
      this.masterGain.gain.setTargetAtTime(targetMaster, this.ctx.currentTime, 0.2);
      this.duckGain.gain.setTargetAtTime(this.duckFactor, this.ctx.currentTime, 0.15);
    } catch {
      this.masterGain.gain.value = targetMaster;
      this.duckGain.gain.value = this.duckFactor;
    }
  }

  private teardownBed(): void {
    for (const timer of this.bedTimers) clearInterval(timer);
    this.bedTimers = [];
    for (const node of this.bedNodes) {
      try { node.stop?.(); } catch { /* ignore */ }
      try { node.disconnect(); } catch { /* ignore */ }
    }
    this.bedNodes = [];
  }

  private createNoiseBuffer(ctx: AudioContext, seconds: number, color: "pink" | "brown"): AudioBuffer {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (color === "brown") {
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = Math.max(-1, Math.min(1, lastOut * 3.2));
      } else {
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.1848) * 0.14));
      }
    }
    return buffer;
  }

  private rebuildBed(): void {
    this.teardownBed();
    if (!this.activePreset || !this.enabled || this.disposed) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.enclosureFilter) return;

    const preset = this.activePreset;
    const out = this.enclosureFilter;

    if (preset === "rain" || preset === "heavy_rain" || preset === "storm") {
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 3, "pink");
      noise.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = preset === "rain" ? 1300 : 1750;
      bp.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.value = preset === "rain" ? 0.7 : 1.0;
      noise.connect(bp);
      bp.connect(gain);
      gain.connect(out);
      noise.start();
      this.bedNodes.push(noise, bp, gain);

      if (preset === "storm") {
        const thunderTimer = setInterval(() => {
          if (this.disposed || !this.ctx || !this.enclosureFilter || !this.enabled || this.userTrackActive) return;
          const now = this.ctx.currentTime;
          const sub = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          sub.type = "triangle";
          sub.frequency.setValueAtTime(62, now);
          sub.frequency.exponentialRampToValueAtTime(34, now + 2.4);
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.42, now + 0.35);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
          sub.connect(g);
          g.connect(this.enclosureFilter);
          sub.start(now);
          sub.stop(now + 2.7);
        }, 11_000);
        this.bedTimers.push(thunderTimer);
      }
      return;
    }

    if (preset === "candlelight_warmth" || preset === "embers") {
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 3, "brown");
      noise.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      const gain = ctx.createGain();
      gain.gain.value = 0.75;
      noise.connect(lp);
      lp.connect(gain);
      gain.connect(out);
      noise.start();
      this.bedNodes.push(noise, lp, gain);

      const crackleTimer = setInterval(() => {
        if (this.disposed || !this.ctx || !this.enclosureFilter || !this.enabled || this.userTrackActive) return;
        if (Math.random() > 0.55) return;
        const now = this.ctx.currentTime;
        const pop = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        pop.type = "square";
        pop.frequency.setValueAtTime(1400 + Math.random() * 1800, now);
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
        pop.connect(g);
        g.connect(this.enclosureFilter);
        pop.start(now);
        pop.stop(now + 0.032);
      }, 420);
      this.bedTimers.push(crackleTimer);
      return;
    }

    if (preset === "snow" || preset === "snowstorm" || preset === "cold_mist" || preset === "fog" || preset === "ocean" || preset === "underwater_bubbles") {
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 4, preset === "underwater_bubbles" ? "brown" : "pink");
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = preset === "ocean" || preset === "underwater_bubbles" ? "lowpass" : "bandpass";
      filter.frequency.value = preset === "underwater_bubbles" ? 320 : preset === "ocean" ? 520 : 680;
      filter.Q.value = preset === "ocean" ? 0.9 : 1.5;

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = preset === "ocean" ? 0.14 : 0.09;
      lfoGain.gain.value = preset === "underwater_bubbles" ? 120 : 280;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      const gain = ctx.createGain();
      gain.gain.value = preset === "snowstorm" ? 0.85 : 0.6;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      noise.start();
      lfo.start();
      this.bedNodes.push(noise, lfo, lfoGain, filter, gain);
      return;
    }

    if (preset === "neon_haze") {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 110;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 380;
      const gain = ctx.createGain();
      gain.gain.value = 0.25;
      osc.connect(lp);
      lp.connect(gain);
      gain.connect(out);
      osc.start();
      this.bedNodes.push(osc, lp, gain);
      return;
    }

    // fireflies / forest / room_tone / tavern: soft warm ambient noise bed
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 3, "brown");
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = preset === "forest" || preset === "fireflies" ? 900 : 480;
    const gain = ctx.createGain();
    gain.gain.value = 0.42;
    noise.connect(lp);
    lp.connect(gain);
    gain.connect(out);
    noise.start();
    this.bedNodes.push(noise, lp, gain);
  }
}
