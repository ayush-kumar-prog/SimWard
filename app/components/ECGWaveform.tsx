/**
 * ECG Waveform Component
 * Phase 4: Visual Rendering & Monitor Animations
 * 
 * Real-time ECG trace rendering using HTML Canvas
 * Scrolls right-to-left with QRS complexes based on heart rate
 */

'use client';

import { useRef, useEffect, useState } from 'react';

export interface ECGWaveformProps {
  hr: number; // Heart rate in bpm
  rhythm?: 'normal' | 'tachycardia' | 'bradycardia' | 'irregular';
  color?: string;
  height?: number;
  className?: string;
  showBeep?: boolean;
  onBeat?: () => void;
}

export function ECGWaveform({
  hr,
  rhythm = 'normal',
  color = '#00ff00',
  height = 120,
  className = '',
  showBeep = false,
  onBeat,
}: ECGWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [isActive, setIsActive] = useState(true);
  
  // ECG waveform state
  const xOffsetRef = useRef(0);
  const lastBeatTimeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    updateSize();

    const width = canvas.width / window.devicePixelRatio;
    const centerY = height / 2;

    // Calculate beat interval in milliseconds
    const beatInterval = (60 / hr) * 1000;

    let lastTimestamp = 0;

    const draw = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      // Clear canvas with fade effect (trail)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, width, height);

      // Draw baseline grid
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
      ctx.lineWidth = 0.5;
      
      // Horizontal lines
      for (let y = 0; y <= height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Vertical lines
      for (let x = 0; x <= width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Update scroll position
      xOffsetRef.current += deltaTime * 0.15; // Scroll speed
      const xOffset = xOffsetRef.current;

      // Draw ECG waveform
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      let firstPoint = true;

      for (let x = 0; x < width; x += 2) {
        const time = xOffset + x;
        
        // Check if we should draw a QRS complex
        const beatPhase = (time % beatInterval) / beatInterval;
        
        let y = centerY;

        if (beatPhase < 0.1) {
          // QRS complex (the spike)
          const qrsPhase = beatPhase / 0.1;
          if (qrsPhase < 0.2) {
            // Q wave (small dip)
            y = centerY + 5 * Math.sin(qrsPhase * Math.PI * 5);
          } else if (qrsPhase < 0.5) {
            // R wave (tall spike)
            const rPhase = (qrsPhase - 0.2) / 0.3;
            y = centerY - 40 * Math.sin(rPhase * Math.PI);
          } else {
            // S wave (small dip after spike)
            const sPhase = (qrsPhase - 0.5) / 0.5;
            y = centerY + 8 * Math.sin(sPhase * Math.PI);
          }
          
          // Trigger beat callback on R wave peak
          if (qrsPhase >= 0.3 && qrsPhase < 0.35) {
            const currentBeatTime = Math.floor(time / beatInterval);
            if (currentBeatTime > lastBeatTimeRef.current) {
              lastBeatTimeRef.current = currentBeatTime;
              onBeat?.();
            }
          }
        } else if (beatPhase > 0.1 && beatPhase < 0.25) {
          // T wave (recovery wave)
          const tPhase = (beatPhase - 0.1) / 0.15;
          y = centerY - 10 * Math.sin(tPhase * Math.PI);
        }

        // Add some noise for realism
        y += (Math.random() - 0.5) * 0.5;

        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Continue animation
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(draw);
      }
    };

    // Start animation
    animationFrameRef.current = requestAnimationFrame(draw);

    // Handle resize
    window.addEventListener('resize', updateSize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', updateSize);
    };
  }, [hr, rhythm, color, height, isActive, onBeat]);

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="absolute top-2 left-2 z-10 flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-green-500 text-xs font-mono font-bold">ECG</span>
        </div>
        <span className="text-green-500 text-xs font-mono">
          {hr} BPM
        </span>
        {rhythm !== 'normal' && (
          <span className="text-yellow-500 text-xs font-mono uppercase">
            {rhythm}
          </span>
        )}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="block"
      />

      {/* Controls */}
      <div className="absolute bottom-2 right-2 z-10">
        <button
          onClick={() => setIsActive(!isActive)}
          className="px-2 py-1 text-xs bg-gray-800 text-green-500 rounded border border-green-500 hover:bg-gray-700 transition-colors"
        >
          {isActive ? 'Pause' : 'Resume'}
        </button>
      </div>

      {/* Beat indicator (optional visual cue) */}
      {showBeep && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}

