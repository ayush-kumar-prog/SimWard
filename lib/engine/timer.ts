/**
 * Timer System for FSM
 * Phase 2: Deterministic FSM Engine
 * 
 * Manages countdown timers for simulation nodes
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Timer hook for managing countdown per node
 * 
 * @param initialTime - Starting time in seconds
 * @param onTimeout - Callback when timer reaches 0
 * @param isPaused - Whether timer is paused
 * @returns Object with time remaining and control functions
 */
export function useTimer(
  initialTime: number,
  onTimeout: () => void,
  isPaused: boolean = false
) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeoutRef = useRef(onTimeout);

  // Keep onTimeout reference updated
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Reset timer when initialTime changes (e.g., new node)
  useEffect(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);

  // Start/stop countdown based on pause state
  useEffect(() => {
    if (isPaused || timeRemaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start countdown
    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const next = prev - 1;
        
        // Trigger timeout when reaching 0
        if (next <= 0) {
          onTimeoutRef.current();
          return 0;
        }
        
        return next;
      });
    }, 1000);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, timeRemaining]);

  const reset = useCallback((newTime?: number) => {
    setTimeRemaining(newTime ?? initialTime);
  }, [initialTime]);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    timeRemaining,
    reset,
    pause,
    isExpired: timeRemaining <= 0,
  };
}

/**
 * Get timer status for UI feedback
 * 
 * @param timeRemaining - Seconds remaining
 * @param totalTime - Total time for the node
 * @returns Status object with color and urgency level
 */
export function getTimerStatus(timeRemaining: number, totalTime: number): {
  color: 'green' | 'yellow' | 'red';
  urgency: 'normal' | 'warning' | 'critical';
  percentage: number;
} {
  const percentage = totalTime > 0 ? (timeRemaining / totalTime) * 100 : 0;

  if (timeRemaining <= 5) {
    return { color: 'red', urgency: 'critical', percentage };
  } else if (timeRemaining <= 10) {
    return { color: 'yellow', urgency: 'warning', percentage };
  } else {
    return { color: 'green', urgency: 'normal', percentage };
  }
}

/**
 * Format time for display
 * 
 * @param seconds - Time in seconds
 * @returns Formatted string (MM:SS or SS)
 */
export function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

/**
 * Calculate beep cadence for audio cues based on time remaining
 * 
 * @param timeRemaining - Seconds remaining
 * @returns Interval in milliseconds between beeps (0 = no beep)
 */
export function getBeepCadence(timeRemaining: number): number {
  if (timeRemaining <= 2) {
    return 250; // Very fast beeping (4 per second)
  } else if (timeRemaining <= 5) {
    return 500; // Fast beeping (2 per second)
  } else if (timeRemaining <= 10) {
    return 1000; // Moderate beeping (1 per second)
  } else if (timeRemaining <= 20) {
    return 2000; // Slow beeping (every 2 seconds)
  }
  return 0; // No beeping
}

