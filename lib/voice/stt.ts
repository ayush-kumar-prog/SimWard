/**
 * Speech-to-Text (STT) using Web Speech API
 * Phase 3: Voice Interface & Action Parsing
 * 
 * Client-side speech recognition for medical terminology
 */

'use client';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = {
  new (): SpeechRecognitionInstance;
};

/**
 * Check if Web Speech API is available in the browser
 */
export function isSpeechRecognitionAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

/**
 * Get the SpeechRecognition constructor
 */
function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

/**
 * Configuration for speech recognition
 */
export interface SpeechConfig {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  maxAlternatives?: number;
}

/**
 * Transcript result
 */
export interface TranscriptResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

/**
 * Callbacks for speech recognition events
 */
export interface SpeechCallbacks {
  onTranscript?: (result: TranscriptResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Speech Recognition Manager
 * Handles Web Speech API with browser compatibility
 */
export class SpeechRecognitionManager {
  private recognition: SpeechRecognitionInstance | null = null;
  private callbacks: SpeechCallbacks = {};
  private isListening = false;

  constructor(config: SpeechConfig = {}, callbacks: SpeechCallbacks = {}) {
    if (!isSpeechRecognitionAvailable()) {
      console.warn('Speech recognition not available in this browser');
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.callbacks = callbacks;

    // Configure recognition
    this.recognition.continuous = config.continuous ?? false;
    this.recognition.interimResults = config.interimResults ?? true;
    this.recognition.lang = config.lang ?? 'en-US';
    this.recognition.maxAlternatives = config.maxAlternatives ?? 1;

    // Set up event handlers
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.recognition) return;

    // Handle results
    this.recognition.addEventListener('result', (event: Event) => {
      const e = event as SpeechRecognitionEvent;
      const results = e.results;
      
      for (let i = e.resultIndex; i < results.length; i++) {
        const result = results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        const isFinal = result.isFinal;

        if (this.callbacks.onTranscript) {
          this.callbacks.onTranscript({
            transcript,
            confidence,
            isFinal,
          });
        }
      }
    });

    // Handle errors
    this.recognition.addEventListener('error', (event: Event) => {
      const e = event as SpeechRecognitionErrorEvent;
      console.error('Speech recognition error:', e.error);
      
      if (this.callbacks.onError) {
        this.callbacks.onError(e.error);
      }
      
      this.isListening = false;
    });

    // Handle start
    this.recognition.addEventListener('start', () => {
      this.isListening = true;
      if (this.callbacks.onStart) {
        this.callbacks.onStart();
      }
    });

    // Handle end
    this.recognition.addEventListener('end', () => {
      this.isListening = false;
      if (this.callbacks.onEnd) {
        this.callbacks.onEnd();
      }
    });
  }

  /**
   * Start listening
   */
  public start(): void {
    if (!this.recognition) {
      console.error('Speech recognition not initialized');
      return;
    }

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Failed to start');
      }
    }
  }

  /**
   * Stop listening
   */
  public stop(): void {
    if (!this.recognition) return;
    
    if (this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Abort listening
   */
  public abort(): void {
    if (!this.recognition) return;
    
    if (this.isListening) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  /**
   * Check if currently listening
   */
  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Update callbacks
   */
  public setCallbacks(callbacks: SpeechCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}

/**
 * Simple function-based interface for basic use cases
 */
export function initializeSpeechRecognition(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError?: (error: string) => void
): () => void {
  if (!isSpeechRecognitionAvailable()) {
    console.error('Speech recognition not available');
    onError?.('Speech recognition not available in this browser');
    return () => {};
  }

  const manager = new SpeechRecognitionManager(
    {
      continuous: false,
      interimResults: true,
      lang: 'en-US',
    },
    {
      onTranscript: (result) => {
        onTranscript(result.transcript, result.isFinal);
      },
      onError,
    }
  );

  manager.start();

  // Return cleanup function
  return () => {
    manager.stop();
  };
}
