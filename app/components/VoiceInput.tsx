/**
 * Voice Input Component
 * Phase 3: Voice Interface & Action Parsing
 * 
 * Complete voice input UI with:
 * - Push-to-talk button
 * - Space bar support
 * - Interim transcript display
 * - Visual feedback
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MicButton } from './MicButton';
import {
  SpeechRecognitionManager,
  isSpeechRecognitionAvailable,
  type TranscriptResult,
} from '@/lib/voice/stt';

export interface VoiceInputProps {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function VoiceInput({
  onTranscript,
  onError,
  disabled = false,
  placeholder = 'Press Space or click mic to speak...',
  className = '',
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recognition, setRecognition] = useState<SpeechRecognitionManager | null>(null);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechRecognitionAvailable()) {
      setAvailable(false);
      const errorMsg = 'Speech recognition not available in this browser';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    const manager = new SpeechRecognitionManager(
      {
        continuous: false,
        interimResults: true,
        lang: 'en-US',
      },
      {
        onTranscript: (result: TranscriptResult) => {
          if (result.isFinal) {
            setTranscript(result.transcript);
            setInterimTranscript('');
            onTranscript(result.transcript, true);
          } else {
            setInterimTranscript(result.transcript);
            onTranscript(result.transcript, false);
          }
        },
        onError: (err: string) => {
          console.error('Speech recognition error:', err);
          setError(err);
          setIsListening(false);
          onError?.(err);
        },
        onStart: () => {
          setIsListening(true);
          setTranscript('');
          setInterimTranscript('');
          setError(null);
        },
        onEnd: () => {
          setIsListening(false);
        },
      }
    );

    setRecognition(manager);

    return () => {
      manager.stop();
    };
  }, [onTranscript, onError]);

  // Handle microphone button click
  const handleMicClick = useCallback(() => {
    if (disabled || !recognition || !available) return;

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }, [disabled, recognition, available, isListening]);

  // Handle keyboard events (Space bar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle space if not typing in an input
      if (
        e.code === 'Space' &&
        !disabled &&
        recognition &&
        available &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        if (!isListening) {
          recognition.start();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !disabled &&
        recognition &&
        available &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        if (isListening) {
          recognition.stop();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [disabled, recognition, available, isListening]);

  if (!available) {
    return (
      <div className={`text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <p className="text-yellow-800 text-sm">
          ⚠️ Speech recognition is not available in your browser.
          <br />
          Please use Chrome, Edge, or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Microphone Button */}
      <div className="relative">
        <MicButton
          isListening={isListening}
          onClick={handleMicClick}
          disabled={disabled}
        />
        
        {/* Keyboard Hint */}
        {!isListening && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
          >
            <span className="text-xs text-gray-500">
              Press <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">Space</kbd>
            </span>
          </motion.div>
        )}
      </div>

      {/* Transcript Display */}
      <AnimatePresence mode="wait">
        {(transcript || interimTranscript || isListening) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-md"
          >
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[60px]">
              {isListening && !transcript && !interimTranscript ? (
                <p className="text-gray-400 text-sm italic">Listening...</p>
              ) : (
                <div className="space-y-1">
                  {transcript && (
                    <p className="text-gray-900 font-medium">{transcript}</p>
                  )}
                  {interimTranscript && (
                    <p className="text-gray-500 italic text-sm">{interimTranscript}</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-md"
          >
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">⚠️ {error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placeholder */}
      {!isListening && !transcript && !interimTranscript && (
        <p className="text-gray-500 text-sm text-center max-w-md">
          {placeholder}
        </p>
      )}
    </div>
  );
}

