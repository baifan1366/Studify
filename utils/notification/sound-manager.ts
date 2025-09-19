/**
 * Sound Manager for handling notification sounds with fallbacks
 */

class SoundManager {
  private audioContext: AudioContext | null = null;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    // Check if audio is supported
    if (typeof window !== 'undefined' && !window.Audio) {
      console.warn('Audio not supported in this browser');
      this.isEnabled = false;
    }
  }

  /**
   * Enable or disable sound notifications
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Check if sound is enabled
   */
  isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Preload audio files for better performance
   */
  preloadSound(soundPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isEnabled) {
        resolve();
        return;
      }

      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = 0.5;
        
        audio.addEventListener('canplaythrough', () => {
          this.audioCache.set(soundPath, audio);
          resolve();
        }, { once: true });

        audio.addEventListener('error', (e) => {
          console.warn(`Failed to preload sound: ${soundPath}`, e);
          reject(e);
        }, { once: true });

        audio.src = soundPath;
      } catch (error) {
        console.warn(`Error preloading sound: ${soundPath}`, error);
        reject(error);
      }
    });
  }

  /**
   * Play notification sound with fallbacks
   */
  async playNotificationSound(customPath?: string): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    // Priority order of sound files to try
    const soundPaths = [
      customPath,
      '/notification-sound.mp3',
      '/notification.mp3',
      '/sounds/notification.mp3',
      '/audio/notification.mp3'
    ].filter(Boolean) as string[];

    for (const soundPath of soundPaths) {
      try {
        await this.playSound(soundPath);
        return; // Success, exit early
      } catch (error) {
        console.warn(`Failed to play sound: ${soundPath}`, error);
        continue; // Try next fallback
      }
    }

    // If all sounds fail, try browser notification API as last resort
    this.playSystemNotification();
  }

  /**
   * Play a specific sound file
   */
  private async playSound(soundPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Check if we have a cached version
        let audio = this.audioCache.get(soundPath);
        
        if (!audio) {
          audio = new Audio(soundPath);
          audio.volume = 0.5;
          audio.preload = 'auto';
        }

        // Reset audio to beginning if it was played before
        audio.currentTime = 0;

        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log(`Successfully played sound: ${soundPath}`);
              resolve();
            })
            .catch((error) => {
              reject(new Error(`Play failed: ${error.message}`));
            });
        } else {
          // Older browsers that don't return a promise
          resolve();
        }

        // Handle audio errors
        audio.addEventListener('error', (e) => {
          reject(new Error(`Audio error: ${e.type}`));
        }, { once: true });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Fallback to system notification sound (beep)
   */
  private playSystemNotification() {
    try {
      // Create a short beep using Web Audio API
      if (!this.audioContext && window.AudioContext) {
        this.audioContext = new AudioContext();
      }

      if (this.audioContext) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);

        console.log('Played system beep as fallback');
      }
    } catch (error) {
      console.warn('System notification fallback failed:', error);
    }
  }

  /**
   * Test if audio can be played (useful for settings)
   */
  async testAudio(): Promise<boolean> {
    try {
      await this.playNotificationSound();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.audioCache.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Export a singleton instance
export const soundManager = new SoundManager();

// Preload notification sounds on module load
if (typeof window !== 'undefined') {
  soundManager.preloadSound('/notification-sound.mp3').catch(() => {
    // Ignore preload errors, fallbacks will handle this
  });
}

// Export convenience function
export const playNotificationSound = (customPath?: string) => {
  return soundManager.playNotificationSound(customPath);
};

export const setSoundEnabled = (enabled: boolean) => {
  soundManager.setEnabled(enabled);
};

export const testNotificationSound = () => {
  return soundManager.testAudio();
};
