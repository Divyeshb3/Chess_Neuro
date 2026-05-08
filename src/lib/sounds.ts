/**
 * Retro synth sounds for NEURO-CHESS
 */

class SoundSystem {
  private ctx: AudioContext | null = null;

  private init() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    } catch (e) {
      console.error("AUDIO SYSTEM FAILURE:", e);
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = "square") {
    try {
      this.init();
      if (!this.ctx || this.ctx.state === "closed") return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Slient fail for audio
    }
  }

  playMove() {
    this.playTone(440, 0.1);
  }

  playCapture() {
    this.playTone(880, 0.05, "sawtooth");
    setTimeout(() => this.playTone(440, 0.1, "sawtooth"), 50);
  }

  playCheck() {
    this.playTone(220, 0.3, "sine");
    setTimeout(() => this.playTone(330, 0.3, "sine"), 100);
  }

  playGlitch() {
    this.playTone(Math.random() * 1000 + 100, 0.05, "custom" as any);
  }
}

export const sounds = new SoundSystem();
