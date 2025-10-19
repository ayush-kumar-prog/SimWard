/**
 * Animation Easing Functions
 * Phase 4: Visual Rendering & Monitor Animations
 * 
 * Smooth interpolation for vital signs and visual feedback
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import type { VitalSigns } from '@/lib/types';

/**
 * Easing function: cubic ease-in-out
 * Creates smooth acceleration and deceleration
 * 
 * @param t - Progress value (0-1)
 * @returns Eased value (0-1)
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Easing function: ease-out (decelerating)
 */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Easing function: ease-in (accelerating)
 */
export function easeIn(t: number): number {
  return t * t * t;
}

/**
 * Linear interpolation between two numbers
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Interpolate between two vital sign states
 * 
 * @param start - Starting vital signs
 * @param end - Target vital signs
 * @param progress - Progress (0-1)
 * @param easingFn - Easing function to apply
 * @returns Interpolated vital signs
 */
export function interpolateVitals(
  start: VitalSigns,
  end: VitalSigns,
  progress: number,
  easingFn: (t: number) => number = easeInOutCubic
): VitalSigns {
  const t = easingFn(Math.max(0, Math.min(1, progress)));

  return {
    hr: Math.round(lerp(start.hr, end.hr, t)),
    bp_sys: Math.round(lerp(start.bp_sys, end.bp_sys, t)),
    bp_dia: Math.round(lerp(start.bp_dia, end.bp_dia, t)),
    rr: Math.round(lerp(start.rr, end.rr, t)),
    spo2: Math.round(lerp(start.spo2, end.spo2, t)),
  };
}

/**
 * React hook for animating vital signs
 * Smoothly transitions from current to target vitals
 * 
 * @param targetVitals - Target vital signs
 * @param duration - Animation duration in milliseconds (default: 800)
 * @returns Current animated vital signs
 */
export function useVitalAnimation(
  targetVitals: VitalSigns,
  duration: number = 800
): VitalSigns {
  const [currentVitals, setCurrentVitals] = useState<VitalSigns>(targetVitals);
  const [isAnimating, setIsAnimating] = useState(false);
  const startVitalsRef = useRef<VitalSigns>(targetVitals);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // Check if vitals actually changed
    const hasChanged = Object.keys(targetVitals).some(
      key => targetVitals[key as keyof VitalSigns] !== currentVitals[key as keyof VitalSigns]
    );

    if (!hasChanged) return;

    // Start animation
    startVitalsRef.current = currentVitals;
    startTimeRef.current = performance.now();
    setIsAnimating(true);

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      const interpolated = interpolateVitals(
        startVitalsRef.current,
        targetVitals,
        progress
      );

      setCurrentVitals(interpolated);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetVitals, duration]);

  return currentVitals;
}

/**
 * Get severity level for a vital sign value
 * Used for color-coding
 */
export interface VitalRange {
  critical_low?: number;
  warning_low?: number;
  normal_low: number;
  normal_high: number;
  warning_high?: number;
  critical_high?: number;
}

export type SeverityLevel = 'critical' | 'warning' | 'normal';

export function getVitalSeverity(
  value: number,
  range: VitalRange
): SeverityLevel {
  if (range.critical_low !== undefined && value <= range.critical_low) {
    return 'critical';
  }
  if (range.critical_high !== undefined && value >= range.critical_high) {
    return 'critical';
  }
  if (range.warning_low !== undefined && value <= range.warning_low) {
    return 'warning';
  }
  if (range.warning_high !== undefined && value >= range.warning_high) {
    return 'warning';
  }
  return 'normal';
}

/**
 * Standard vital sign ranges for adults
 */
export const VITAL_RANGES = {
  hr: {
    critical_low: 40,
    warning_low: 50,
    normal_low: 60,
    normal_high: 100,
    warning_high: 110,
    critical_high: 140,
  },
  bp_sys: {
    critical_low: 70,
    warning_low: 90,
    normal_low: 100,
    normal_high: 140,
    warning_high: 160,
    critical_high: 180,
  },
  bp_dia: {
    critical_low: 40,
    warning_low: 60,
    normal_low: 60,
    normal_high: 90,
    warning_high: 100,
    critical_high: 110,
  },
  rr: {
    critical_low: 8,
    warning_low: 10,
    normal_low: 12,
    normal_high: 20,
    warning_high: 24,
    critical_high: 30,
  },
  spo2: {
    critical_low: 85,
    warning_low: 90,
    normal_low: 95,
    normal_high: 100,
  },
};

/**
 * Get color class for severity level
 */
export function getSeverityColor(severity: SeverityLevel): {
  text: string;
  bg: string;
  border: string;
} {
  switch (severity) {
    case 'critical':
      return {
        text: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-500',
      };
    case 'warning':
      return {
        text: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-500',
      };
    case 'normal':
      return {
        text: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-500',
      };
  }
}
