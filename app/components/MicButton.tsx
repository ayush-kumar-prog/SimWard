/**
 * Microphone Button Component
 * Phase 3: Voice Interface & Action Parsing
 * 
 * Push-to-talk button with visual feedback
 * Supports Space bar activation
 */

'use client';

import { motion } from 'framer-motion';

export interface MicButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function MicButton({
  isListening,
  onClick,
  disabled = false,
  className = '',
}: MicButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex items-center justify-center
        w-16 h-16 rounded-full
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
            : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      animate={
        isListening
          ? {
              boxShadow: [
                '0 0 0 0 rgba(239, 68, 68, 0.7)',
                '0 0 0 10px rgba(239, 68, 68, 0)',
              ],
            }
          : {}
      }
      transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
      aria-label={isListening ? 'Stop recording' : 'Start recording'}
      aria-pressed={isListening}
    >
      {/* Microphone Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        {isListening ? (
          // Stop icon when listening
          <rect x="6" y="6" width="12" height="12" strokeWidth={2} />
        ) : (
          // Microphone icon when not listening
          <>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </>
        )}
      </svg>
    </motion.button>
  );
}

