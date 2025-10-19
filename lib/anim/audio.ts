/**
 * Audio Cues System
 * Phase 4: Visual Rendering & Monitor Animations
 * 
 * Synthesized audio for medical monitor sounds
 * QRS beeps, timer warnings, action confirmations
 */

'use client';

/**
 * Audio context singleton
 */
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a simple beep tone
 * 
 * @param frequency - Frequency in Hz
 * @param duration - Duration in milliseconds
 * @param volume - Volume (0-1)
 */
export function playBeep(frequency: number = 800, duration: number = 100, volume: number = 0.3): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (error) {
    console.warn('Audio playback failed:', error);
  }
}

/**
 * QRS Beat Sound
 * Characteristic beep for each heartbeat on ECG monitor
 */
export function playQRSBeep(): void {
  playBeep(1000, 50, 0.2);
}

/**
 * Action Confirmation Sound
 * Subtle click when an action is confirmed
 */
export function playActionConfirm(): void {
  playBeep(600, 80, 0.15);
}

/**
 * Timer Warning Sound
 * Escalating urgency based on time remaining
 * 
 * @param timeRemaining - Seconds remaining
 */
export function playTimerWarning(timeRemaining: number): void {
  if (timeRemaining <= 2) {
    // Very urgent: rapid double beep
    playBeep(1200, 100, 0.4);
    setTimeout(() => playBeep(1200, 100, 0.4), 150);
  } else if (timeRemaining <= 5) {
    // Urgent: higher pitch, louder
    playBeep(1000, 120, 0.35);
  } else if (timeRemaining <= 10) {
    // Warning: moderate pitch
    playBeep(800, 150, 0.25);
  }
}

/**
 * Critical Alarm Sound
 * For critical vital sign values
 */
export function playCriticalAlarm(): void {
  try {
    const ctx = getAudioContext();
    
    // Play alarm sequence: high-low-high pattern
    const times = [0, 0.2, 0.4];
    const frequencies = [1400, 1000, 1400];
    
    times.forEach((time, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = frequencies[index];
      oscillator.type = 'square';
      
      const startTime = ctx.currentTime + time;
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.15);
    });
  } catch (error) {
    console.warn('Alarm sound failed:', error);
  }
}

/**
 * Success Chime
 * For completing actions or reaching good outcomes
 */
export function playSuccessChime(): void {
  const frequencies = [523.25, 659.25, 783.99]; // C, E, G (C major chord)
  frequencies.forEach((freq, index) => {
    setTimeout(() => {
      playBeep(freq, 200, 0.2);
    }, index * 100);
  });
}

/**
 * Error Sound
 * For invalid actions or mistakes
 */
export function playErrorSound(): void {
  playBeep(300, 250, 0.3);
}

/**
 * Audio Manager Hook
 * Manages audio preferences and playback
 */
export class AudioManager {
  private enabled: boolean = true;
  private qrsBeepEnabled: boolean = true;
  private timerWarningEnabled: boolean = true;
  private volume: number = 1.0;

  constructor() {
    // Load preferences from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('simward_audio_prefs');
      if (saved) {
        try {
          const prefs = JSON.parse(saved);
          this.enabled = prefs.enabled ?? true;
          this.qrsBeepEnabled = prefs.qrsBeep ?? true;
          this.timerWarningEnabled = prefs.timerWarning ?? true;
          this.volume = prefs.volume ?? 1.0;
        } catch (error) {
          console.warn('Failed to load audio preferences');
        }
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.savePreferences();
  }

  setQRSBeepEnabled(enabled: boolean): void {
    this.qrsBeepEnabled = enabled;
    this.savePreferences();
  }

  setTimerWarningEnabled(enabled: boolean): void {
    this.timerWarningEnabled = enabled;
    this.savePreferences();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.savePreferences();
  }

  playQRSBeep(): void {
    if (this.enabled && this.qrsBeepEnabled) {
      playBeep(1000, 50, 0.2 * this.volume);
    }
  }

  playTimerWarning(timeRemaining: number): void {
    if (this.enabled && this.timerWarningEnabled) {
      playTimerWarning(timeRemaining);
    }
  }

  playActionConfirm(): void {
    if (this.enabled) {
      playActionConfirm();
    }
  }

  playCriticalAlarm(): void {
    if (this.enabled) {
      playCriticalAlarm();
    }
  }

  playSuccessChime(): void {
    if (this.enabled) {
      playSuccessChime();
    }
  }

  playErrorSound(): void {
    if (this.enabled) {
      playErrorSound();
    }
  }

  private savePreferences(): void {
    if (typeof window !== 'undefined') {
      const prefs = {
        enabled: this.enabled,
        qrsBeep: this.qrsBeepEnabled,
        timerWarning: this.timerWarningEnabled,
        volume: this.volume,
      };
      localStorage.setItem('simward_audio_prefs', JSON.stringify(prefs));
    }
  }

  getPreferences() {
    return {
      enabled: this.enabled,
      qrsBeepEnabled: this.qrsBeepEnabled,
      timerWarningEnabled: this.timerWarningEnabled,
      volume: this.volume,
    };
  }
}

// Export singleton instance
export const audioManager = new AudioManager();

