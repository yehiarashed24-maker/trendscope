/**
 * Ambient Cosmic / Earth Planetary Soundscape Generator
 * Built using the Web Audio API for zero external dependencies, 100% offline reliability,
 * and cinematic audio quality (deep planetary drone, harmonic resonance, solar wind noise).
 */

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private initialized = false;

  private init() {
    if (this.initialized && this.ctx) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output volume gain node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Warm low-pass filter (deep space warmth)
      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(320, this.ctx.currentTime);
      lowpass.Q.setValueAtTime(1.8, this.ctx.currentTime);
      lowpass.connect(this.masterGain);

      // Deep harmonic drone chords (55Hz A1, 82.4Hz E2, 110Hz A2, 164.8Hz E3)
      const frequencies = [55, 82.4, 110, 164.8];
      frequencies.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Slow organic drift / shimmer LFO
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.06 + idx * 0.025, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(1.4, this.ctx.currentTime);
        lfo.connect(osc.frequency);
        lfo.start();

        const baseVol = 0.07 / (idx * 0.8 + 1);
        oscGain.gain.setValueAtTime(baseVol, this.ctx.currentTime);
        osc.connect(oscGain);
        oscGain.connect(lowpass);
        osc.start();
      });

      // Atmospheric solar wind noise (pink noise buffer)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(360, this.ctx.currentTime);
      noiseFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.03, this.ctx.currentTime);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start();

      this.initialized = true;
    } catch (err) {
      console.warn('Web Audio API not supported or blocked:', err);
    }
  }

  public async toggle(): Promise<boolean> {
    this.init();
    if (!this.ctx || !this.masterGain) return false;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    if (this.isPlaying) {
      // Smooth fade-out (0.6s)
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
      this.isPlaying = false;
    } else {
      // Smooth fade-in (1.2s)
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(this.masterGain.gain.value, 0.0001), now);
      this.masterGain.gain.linearRampToValueAtTime(0.38, now + 1.2);
      this.isPlaying = true;
    }

    return this.isPlaying;
  }

  public getStatus(): boolean {
    return this.isPlaying;
  }

  public stop() {
    if (this.ctx && this.masterGain && this.isPlaying) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      this.isPlaying = false;
    }
  }
}

export const ambientSound = new AmbientSoundEngine();

