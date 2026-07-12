/**
 * Shared mute + unlock (browser autoplay) for SFX / TTS.
 */
type Listener = (muted: boolean) => void;

class AppAudio {
  private muted = false;
  private unlocked = false;
  private listeners = new Set<Listener>();

  isMuted() {
    return this.muted;
  }

  isUnlocked() {
    return this.unlocked;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn(this.muted));
  }

  async unlock() {
    this.unlocked = true;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.emit();
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }
}

export const appAudio = new AppAudio();
