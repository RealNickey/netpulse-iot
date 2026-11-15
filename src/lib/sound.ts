// Web Audio API Sound Synthesizer for IoT Alerts
class SoundAlertSystem {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.3;

  constructor() {
    const savedMute = localStorage.getItem("netpulse_muted");
    if (savedMute !== null) {
      this.isMuted = savedMute === "true";
    }
  }

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem("netpulse_muted", String(muted));
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // Warning Alert Sound (Chime: 659Hz -> 880Hz)
  public playWarning() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(880.0, now + 0.12); // A5

      gain.gain.setValueAtTime(this.volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      // AudioContext could be blocked if user has not interacted with page
    }
  }

  // Critical Alarm Sound (Emergency 2-tone Klaxon / Siren)
  public playCritical() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Pulse 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(950, now);
      osc1.frequency.exponentialRampToValueAtTime(500, now + 0.18);

      gain1.gain.setValueAtTime(this.volume * 0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.18);

      // Pulse 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(1150, now + 0.22);
      osc2.frequency.exponentialRampToValueAtTime(600, now + 0.45);

      gain2.gain.setValueAtTime(this.volume * 0.6, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.22);
      osc2.stop(now + 0.45);
    } catch (e) {
      // AudioContext blocked
    }
  }

  // Test sound to verify audio output
  public playTestBeep() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now); // C5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }
}

export const soundManager = new SoundAlertSystem();
