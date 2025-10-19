/**
 * Timer Component
 * Phase 4: Visual Rendering & Monitor Animations
 * 
 * Circular countdown timer with color transitions and pulse animation
 */

'use client';

import { motion } from 'framer-motion';
import { formatTime } from '@/lib/engine/timer';

export interface TimerProps {
  timeRemaining: number; // seconds
  totalTime: number; // seconds
  onTimeout?: () => void;
  className?: string;
  size?: number;
}

export function Timer({
  timeRemaining,
  totalTime,
  onTimeout,
  className = '',
  size = 120,
}: TimerProps) {
  // Calculate progress percentage
  const progress = totalTime > 0 ? (timeRemaining / totalTime) * 100 : 0;
  
  // Determine color based on time remaining
  const getColor = () => {
    if (timeRemaining <= 5) return { stroke: '#ef4444', text: 'text-red-600', bg: 'bg-red-50' };
    if (timeRemaining <= 10) return { stroke: '#eab308', text: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { stroke: '#22c55e', text: 'text-green-600', bg: 'bg-green-50' };
  };

  const color = getColor();
  const shouldPulse = timeRemaining <= 5;

  // Calculate SVG circle properties
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Trigger timeout callback when time reaches 0
  if (timeRemaining === 0 && onTimeout) {
    onTimeout();
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Background circle with pulse effect */}
      <motion.div
        className={`absolute inset-0 rounded-full ${color.bg} opacity-50`}
        animate={shouldPulse ? {
          scale: [1, 1.1, 1],
        } : {}}
        transition={{
          duration: 0.8,
          repeat: shouldPulse ? Infinity : 0,
          ease: "easeInOut"
        }}
        style={{ width: size, height: size }}
      />

      {/* SVG Circle Progress */}
      <svg
        width={size}
        height={size}
        className="relative z-10"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </svg>

      {/* Time display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className={`text-3xl font-bold font-mono ${color.text}`}
          key={timeRemaining}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {timeRemaining}
        </motion.div>
        <div className="text-xs text-gray-500 mt-1">seconds</div>
      </div>

      {/* Warning indicators */}
      {timeRemaining <= 10 && timeRemaining > 0 && (
        <motion.div
          className={`absolute -top-2 -right-2 w-4 h-4 rounded-full ${
            timeRemaining <= 5 ? 'bg-red-500' : 'bg-yellow-500'
          }`}
          animate={{
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Timeout state */}
      {timeRemaining === 0 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-90 rounded-full"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-white font-bold">
            TIMEOUT
          </div>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Compact Timer Bar (alternative layout)
 */
export function TimerBar({
  timeRemaining,
  totalTime,
  onTimeout,
  className = '',
}: Omit<TimerProps, 'size'>) {
  const progress = totalTime > 0 ? (timeRemaining / totalTime) * 100 : 0;
  
  const getColor = () => {
    if (timeRemaining <= 5) return { bg: 'bg-red-500', text: 'text-red-600' };
    if (timeRemaining <= 10) return { bg: 'bg-yellow-500', text: 'text-yellow-600' };
    return { bg: 'bg-green-500', text: 'text-green-600' };
  };

  const color = getColor();

  if (timeRemaining === 0 && onTimeout) {
    onTimeout();
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Time Remaining</span>
        <span className={`text-lg font-bold font-mono ${color.text}`}>
          {formatTime(timeRemaining)}
        </span>
      </div>
      
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color.bg}`}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {timeRemaining === 0 && (
        <div className="mt-2 text-center text-red-600 font-bold text-sm">
          ⚠️ TIME'S UP
        </div>
      )}
    </div>
  );
}

