// Ambient sounds generated in the browser with the Web Audio API.
// Nothing is downloaded: rain, ocean, wind, forest and birdsong are synthesised
// from filtered noise and short oscillator chirps, so the app ships no audio files
// and has no licensing questions.

export interface SoundConfig {
  id: string;
  name: string;
  category: 'nature' | 'ambient' | 'white-noise' | 'binaural';
  loop: boolean;
  volume: number;
  description: string;
  icon: string;
  color: string;
}

type NoiseColor = 'white' | 'pink' | 'brown';

function noiseBuffer(ctx: AudioContext, color: NoiseColor, seconds = 4): AudioBuffer {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (color === 'white') {
        data[i] = white * 0.5;
      } else if (color === 'pink') {
        // Paul Kellet's refined pink-noise filter
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    }
  }
  return buffer;
}

/** One playing sound: a small node graph feeding a gain we can fade. */
class Voice {
  readonly output: GainNode;
  private sources: AudioScheduledSourceNode[] = [];
  private timers: number[] = [];

  constructor(private ctx: AudioContext, destination: AudioNode) {
    this.output = ctx.createGain();
    this.output.gain.value = 0;
    this.output.connect(destination);
  }

  noise(color: NoiseColor, ...chain: AudioNode[]): void {
    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer(this.ctx, color);
    src.loop = true;
    let node: AudioNode = src;
    for (const next of chain) {
      node.connect(next);
      node = next;
    }
    node.connect(this.output);
    src.start();
    this.sources.push(src);
  }

  filter(type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = q;
    return f;
  }

  gain(value: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = value;
    return g;
  }

  /** Slowly swing an AudioParam around its value (waves, gusts). */
  lfo(param: AudioParam, rate: number, depth: number): void {
    const osc = this.ctx.createOscillator();
    const amount = this.ctx.createGain();
    osc.frequency.value = rate;
    amount.gain.value = depth;
    osc.connect(amount).connect(param);
    osc.start();
    this.sources.push(osc);
  }

  /** Short rising-falling sine chirps at random intervals, like distant birds. */
  chirps(level: number, everyMs: [number, number]): void {
    const schedule = () => {
      const phrase = 2 + Math.floor(Math.random() * 4);
      const base = 2200 + Math.random() * 1800;
      let t = this.ctx.currentTime + 0.05;
      for (let i = 0; i < phrase; i++) {
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        const pan = this.ctx.createStereoPanner();
        pan.pan.value = Math.random() * 1.6 - 0.8;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(base, t);
        osc.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.4), t + 0.07);
        osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.12);
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(level, t + 0.015);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
        osc.connect(env).connect(pan).connect(this.output);
        osc.start(t);
        osc.stop(t + 0.15);
        t += 0.14 + Math.random() * 0.1;
      }
      const wait = everyMs[0] + Math.random() * (everyMs[1] - everyMs[0]);
      this.timers.push(window.setTimeout(schedule, wait));
    };
    schedule();
  }

  fadeTo(value: number, seconds = 0.6): void {
    const now = this.ctx.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setValueAtTime(this.output.gain.value, now);
    this.output.gain.linearRampToValueAtTime(value, now + seconds);
  }

  stop(): void {
    this.fadeTo(0, 0.4);
    this.timers.forEach(t => window.clearTimeout(t));
    this.timers = [];
    const sources = this.sources;
    this.sources = [];
    window.setTimeout(() => {
      sources.forEach(s => {
        try { s.stop(); } catch { /* already stopped */ }
      });
      this.output.disconnect();
    }, 500);
  }
}

const RECIPES: Record<string, (v: Voice) => void> = {
  rain: v => {
    v.noise('white', v.filter('highpass', 500), v.filter('lowpass', 7000), v.gain(0.45));
    v.noise('pink', v.filter('bandpass', 1200, 0.4), v.gain(0.5));
  },
  ocean: v => {
    const swell = v.gain(0.55);
    v.noise('brown', v.filter('lowpass', 900), swell);
    v.lfo(swell.gain, 0.08, 0.4);
  },
  wind: v => {
    const band = v.filter('bandpass', 600, 0.9);
    const gust = v.gain(0.6);
    v.noise('pink', band, gust);
    v.lfo(band.frequency, 0.05, 300);
    v.lfo(gust.gain, 0.11, 0.3);
  },
  forest: v => {
    v.noise('pink', v.filter('lowpass', 1400), v.gain(0.35));
    v.chirps(0.05, [3500, 8000]);
  },
  birds: v => {
    v.noise('pink', v.filter('lowpass', 800), v.gain(0.08));
    v.chirps(0.09, [900, 2600]);
  },
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private voices = new Map<string, Voice>();
  private levels = new Map<string, number>();

  private context(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Kept for API compatibility: synthesised sounds need no loading. */
  async loadSound(_soundId: string, _config: SoundConfig): Promise<true> {
    return true;
  }

  async preloadSounds(_configs: SoundConfig[]): Promise<void> {}

  async playSound(soundId: string, _config: SoundConfig, volume = 1): Promise<void> {
    const recipe = RECIPES[soundId];
    if (!recipe) throw new Error(`Unknown sound: ${soundId}`);
    this.stopSound(soundId);
    const ctx = this.context();
    const voice = new Voice(ctx, ctx.destination);
    recipe(voice);
    const level = Math.max(0, Math.min(1, volume));
    voice.fadeTo(level, 1.2);
    this.voices.set(soundId, voice);
    this.levels.set(soundId, level);
  }

  stopSound(soundId: string): void {
    this.voices.get(soundId)?.stop();
    this.voices.delete(soundId);
  }

  setVolume(soundId: string, volume: number): void {
    const level = Math.max(0, Math.min(1, volume));
    this.levels.set(soundId, level);
    this.voices.get(soundId)?.fadeTo(level, 0.2);
  }

  stopAllSounds(): void {
    for (const id of Array.from(this.voices.keys())) this.stopSound(id);
  }

  isPlaying(soundId: string): boolean {
    return this.voices.has(soundId);
  }

  dispose(): void {
    this.stopAllSounds();
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const audioManager = new AudioManager();
