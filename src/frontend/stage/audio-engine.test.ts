import { describe, expect, test, beforeEach } from "bun:test";
import { AudioEngine, createMockAudioPlayer, type AudioPlayerElement, formatAudioUrl } from "./audio-engine.js";

class FakeClock {
  currentTime = 1000;
  private nextId = 1;
  private intervals = new Map<number, { handler: () => void; timeout: number; nextRun: number }>();

  now = (): number => {
    return this.currentTime;
  };

  setInterval = (handler: () => void, timeout = 0): number => {
    const id = this.nextId++;
    const step = Math.max(1, timeout);
    this.intervals.set(id, {
      handler,
      timeout: step,
      nextRun: this.currentTime + step,
    });
    return id;
  };

  clearInterval = (id: unknown): void => {
    if (typeof id === "number") {
      this.intervals.delete(id);
    }
  };

  tick(ms: number): void {
    const targetTime = this.currentTime + ms;
    while (true) {
      let earliestTime: number | null = null;
      let earliestId: number | null = null;

      for (const [id, timer] of this.intervals.entries()) {
        if (timer.nextRun <= targetTime) {
          if (earliestTime === null || timer.nextRun < earliestTime) {
            earliestTime = timer.nextRun;
            earliestId = id;
          }
        }
      }

      if (earliestId === null || earliestTime === null) {
        break;
      }

      this.currentTime = earliestTime;
      const timer = this.intervals.get(earliestId);
      if (timer) {
        timer.nextRun += timer.timeout;
        timer.handler();
      }
    }
    this.currentTime = targetTime;
  }
}

describe("AudioEngine", () => {
  let createdPlayers: AudioPlayerElement[];
  let playerFactory: (src: string) => AudioPlayerElement;
  let clock: FakeClock;

  beforeEach(() => {
    createdPlayers = [];
    playerFactory = (src: string) => {
      const p = createMockAudioPlayer(src);
      createdPlayers.push(p);
      return p;
    };
    clock = new FakeClock();
  });

  test('music attenuation survives fades, restores the same track and never changes sound effects',()=>{
    const engine=new AudioEngine({bgmVolume:.8,sfxVolume:.6,crossfadeDuration:50,audioFactory:playerFactory,now:clock.now,setInterval:clock.setInterval,clearInterval:clock.clearInterval});
    engine.playBgm('theme.mp3');clock.tick(25);const track=createdPlayers[0]!;track.currentTime=123;
    (engine as any).setBgmAttenuation(0);expect(track.volume).toBe(0);clock.tick(100);expect(track.volume).toBe(0);
    engine.playSfx('bell.mp3');expect(createdPlayers[1]!.volume).toBe(.6);
    (engine as any).setBgmAttenuation(.35);expect(track.volume).toBeCloseTo(.28);
    (engine as any).setBgmAttenuation(1);expect(track.volume).toBe(.8);expect(track.currentTime).toBe(123);expect(engine.getBgmVolume()).toBe(.8);expect(createdPlayers).toHaveLength(2);engine.destroy();
  });

  test('music caps cover all outgoing crossfades and cannot override global mute',()=>{
    const engine=new AudioEngine({bgmVolume:.8,crossfadeDuration:100,audioFactory:playerFactory,now:clock.now,setInterval:clock.setInterval,clearInterval:clock.clearInterval});
    engine.playBgm('one');clock.tick(25);engine.playBgm('two');clock.tick(25);engine.playBgm('three');
    (engine as any).setBgmAttenuation(0);expect(createdPlayers.every(p=>p.volume===0)).toBe(true);clock.tick(200);expect(createdPlayers.every(p=>p.volume===0)).toBe(true);
    engine.setBgmVolume(0);(engine as any).setBgmAttenuation(1);expect(createdPlayers.every(p=>p.volume===0)).toBe(true);engine.stopAll();expect(createdPlayers.every(p=>p.paused)).toBe(true);
  });

  test('changing global volume during a fade cannot later escape its ceiling',()=>{
    const engine=new AudioEngine({bgmVolume:.8,crossfadeDuration:100,audioFactory:playerFactory,now:clock.now,setInterval:clock.setInterval,clearInterval:clock.clearInterval});
    engine.playBgm('theme');clock.tick(25);engine.setBgmVolume(0);clock.tick(150);expect(createdPlayers[0]!.volume).toBe(0);
    engine.setBgmVolume(.4);expect(createdPlayers[0]!.volume).toBe(.4);engine.destroy();
  });

  test('raising global volume from zero during a fade restores the live configured volume',()=>{
    const engine=new AudioEngine({bgmVolume:0,crossfadeDuration:100,audioFactory:playerFactory,now:clock.now,setInterval:clock.setInterval,clearInterval:clock.clearInterval});
    engine.playBgm('theme');clock.tick(25);engine.setBgmVolume(.8);clock.tick(150);expect(createdPlayers[0]!.volume).toBe(.8);
    engine.setBgmAttenuation(.35);expect(createdPlayers[0]!.volume).toBeCloseTo(.28);engine.destroy();
  });

  test("initializes with default or custom volumes and clamps values", () => {
    const engine = new AudioEngine({
      audioFactory: playerFactory,
      now: clock.now,
      setInterval: clock.setInterval,
      clearInterval: clock.clearInterval,
    });
    expect(engine.getBgmVolume()).toBe(0.7);
    expect(engine.getSfxVolume()).toBe(0.8);

    engine.setBgmVolume(0.4);
    expect(engine.getBgmVolume()).toBe(0.4);

    engine.setBgmVolume(-1);
    expect(engine.getBgmVolume()).toBe(0);

    engine.setBgmVolume(5);
    expect(engine.getBgmVolume()).toBe(1);

    engine.setSfxVolume(0.2);
    expect(engine.getSfxVolume()).toBe(0.2);
  });

  test("playBgm initializes track, loops it, and fades in volume", () => {
    const engine = new AudioEngine({
      bgmVolume: 0.8,
      crossfadeDuration: 50,
      audioFactory: playerFactory,
      now: clock.now,
      setInterval: clock.setInterval,
      clearInterval: clock.clearInterval,
    });

    engine.playBgm("bgm_peaceful.mp3");

    expect(createdPlayers.length).toBe(1);
    const p = createdPlayers[0]!;
    expect(p.src).toBe("bgm_peaceful.mp3");
    expect(p.loop).toBe(true);
    expect(p.paused).toBe(false);

    // Initial volume is 0
    expect(p.volume).toBe(0);

    // Step halfway (25ms)
    clock.tick(25);
    expect(p.volume).toBeCloseTo(0.4, 2);

    // Step to completion (another 25ms => 50ms total)
    clock.tick(25);
    expect(p.volume).toBeCloseTo(0.8, 2);
  });

  test("playBgm crossfades between tracks over the duration", () => {
    const engine = new AudioEngine({
      bgmVolume: 0.6,
      crossfadeDuration: 60,
      audioFactory: playerFactory,
      now: clock.now,
      setInterval: clock.setInterval,
      clearInterval: clock.clearInterval,
    });

    engine.playBgm("track_a.mp3");
    const playerA = createdPlayers[0]!;

    // Complete initial fade-in for track A (interval is 25ms, so at 75ms >= 60ms it finishes)
    clock.tick(75);
    expect(playerA.volume).toBeCloseTo(0.6, 2);

    // Crossfade to track B
    engine.playBgm("track_b.mp3");
    expect(createdPlayers.length).toBe(2);
    const playerB = createdPlayers[1]!;

    expect(playerB.src).toBe("track_b.mp3");
    expect(playerB.loop).toBe(true);
    expect(playerB.volume).toBe(0);

    // In the middle of crossfade (25ms in)
    clock.tick(25);
    expect(playerA.volume).toBeLessThan(0.6);
    expect(playerA.volume).toBeGreaterThan(0);
    expect(playerB.volume).toBeGreaterThan(0);
    expect(playerB.volume).toBeLessThan(0.6);

    // Complete the crossfade (another 50ms => 75ms elapsed since crossfade start)
    clock.tick(50);

    // Track A should be paused and faded out
    expect(playerA.volume).toBe(0);
    expect(playerA.paused).toBe(true);

    // Track B should be at target volume
    expect(playerB.volume).toBeCloseTo(0.6, 2);
    expect(playerB.paused).toBe(false);
  });

  test("playBgm with identical track preserves playback without restart", () => {
    const engine = new AudioEngine({
      bgmVolume: 0.5,
      audioFactory: playerFactory,
      now: clock.now,
      setInterval: clock.setInterval,
      clearInterval: clock.clearInterval,
    });

    engine.playBgm("same_track.mp3");
    expect(createdPlayers.length).toBe(1);

    engine.playBgm("same_track.mp3");
    expect(createdPlayers.length).toBe(1); // No new player created
  });

  test("stopBgm smoothly fades out and pauses track", () => {
    const engine = new AudioEngine({
      bgmVolume: 0.7,
      crossfadeDuration: 50,
      audioFactory: playerFactory,
      now: clock.now,
      setInterval: clock.setInterval,
      clearInterval: clock.clearInterval,
    });

    engine.playBgm("theme.mp3");
    const p = createdPlayers[0]!;
    clock.tick(50);
    expect(p.volume).toBeCloseTo(0.7, 2);

    engine.stopBgm({ fadeDuration: 50 });
    clock.tick(25);
    expect(p.volume).toBeCloseTo(0.35, 2);
    expect(p.paused).toBe(false);

    clock.tick(25);
    expect(p.volume).toBe(0);
    expect(p.paused).toBe(true);
    expect(engine.getCurrentBgm()).toBeNull();
  });

  test("playSfx plays one-shot audio with loop=false and scaled volume", () => {
    const engine = new AudioEngine({
      sfxVolume: 0.5,
      audioFactory: playerFactory,
      now: clock.now,
      setInterval: clock.setInterval,
      clearInterval: clock.clearInterval,
    });

    engine.playSfx("slash.wav");
    expect(createdPlayers.length).toBe(1);
    const p = createdPlayers[0]!;
    expect(p.src).toBe("slash.wav");
    expect(p.loop).toBe(false);
    expect(p.volume).toBe(0.5);
    expect(p.paused).toBe(false);

    engine.playSfx("explosion.wav", { volume: 0.5 });
    const p2 = createdPlayers[1]!;
    expect(p2.volume).toBe(0.25);
  });

  test("stopAll halts all BGM and SFX immediately", () => {
    const engine = new AudioEngine({
      audioFactory: playerFactory,
      now: clock.now,
      setInterval: clock.setInterval,
      clearInterval: clock.clearInterval,
    });

    engine.playBgm("bgm.mp3");
    engine.playSfx("sfx.wav");

    const bgm = createdPlayers[0]!;
    const sfx = createdPlayers[1]!;

    engine.stopAll();

    expect(bgm.paused).toBe(true);
    expect(sfx.paused).toBe(true);
    expect(engine.getCurrentBgm()).toBeNull();
  });

  test("formatAudioUrl converts Windows and POSIX absolute paths to file:// URLs", () => {
    expect(formatAudioUrl("C:\\Users\\music\\track.mp3")).toBe("file:///C:/Users/music/track.mp3");
    expect(formatAudioUrl("D:/sound/hit.wav")).toBe("file:///D:/sound/hit.wav");
    expect(formatAudioUrl("/home/user/bgm.ogg")).toBe("file:///home/user/bgm.ogg");
    expect(formatAudioUrl("https://example.com/stream.mp3")).toBe("https://example.com/stream.mp3");
    expect(formatAudioUrl("/api/v1/audio/123")).toBe("/api/v1/audio/123");
  });
});
