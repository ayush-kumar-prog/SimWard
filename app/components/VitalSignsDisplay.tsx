/**
 * Vital Signs Display Component
 * Phase 4: Visual Rendering & Monitor Animations
 * 
 * Medical monitor-style display with animated transitions and color-coding
 */

'use client';

import { motion } from 'framer-motion';
import type { VitalSigns } from '@/lib/types';
import {
  useVitalAnimation,
  getVitalSeverity,
  getSeverityColor,
  VITAL_RANGES,
  type SeverityLevel,
} from '@/lib/anim/easing';

export interface VitalSignsDisplayProps {
  vitals: VitalSigns;
  animated?: boolean;
  className?: string;
}

interface VitalItemProps {
  label: string;
  value: number;
  unit: string;
  severity: SeverityLevel;
  icon?: string;
}

function VitalItem({ label, value, unit, severity, icon }: VitalItemProps) {
  const colors = getSeverityColor(severity);

  return (
    <motion.div
      className={`p-4 rounded-lg border-2 ${colors.bg} ${colors.border} transition-colors duration-300`}
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </span>
        <span className="text-xs text-gray-500">{unit}</span>
      </div>
      <motion.div
        className={`mt-2 text-4xl font-mono font-bold ${colors.text} tabular-nums`}
        key={value}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.div>
    </motion.div>
  );
}

export function VitalSignsDisplay({
  vitals,
  animated = true,
  className = '',
}: VitalSignsDisplayProps) {
  // Use animated vitals if enabled
  const displayVitals = animated ? useVitalAnimation(vitals, 800) : vitals;

  // Calculate severity for each vital
  const hrSeverity = getVitalSeverity(displayVitals.hr, VITAL_RANGES.hr);
  const bpSysSeverity = getVitalSeverity(displayVitals.bp_sys, VITAL_RANGES.bp_sys);
  const bpDiaSeverity = getVitalSeverity(displayVitals.bp_dia, VITAL_RANGES.bp_dia);
  const rrSeverity = getVitalSeverity(displayVitals.rr, VITAL_RANGES.rr);
  const spo2Severity = getVitalSeverity(displayVitals.spo2, VITAL_RANGES.spo2);

  // Overall severity (worst of all)
  const severities: SeverityLevel[] = [
    hrSeverity,
    bpSysSeverity,
    bpDiaSeverity,
    rrSeverity,
    spo2Severity,
  ];
  const overallSeverity = severities.includes('critical')
    ? 'critical'
    : severities.includes('warning')
    ? 'warning'
    : 'normal';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Vital Signs</h3>
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              overallSeverity === 'critical'
                ? 'bg-red-500 animate-pulse'
                : overallSeverity === 'warning'
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
          />
          <span className="text-sm text-gray-600 capitalize">{overallSeverity}</span>
        </div>
      </div>

      {/* Vital Signs Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Heart Rate */}
        <VitalItem
          label="HR"
          value={displayVitals.hr}
          unit="bpm"
          severity={hrSeverity}
          icon="💓"
        />

        {/* Oxygen Saturation */}
        <VitalItem
          label="SpO₂"
          value={displayVitals.spo2}
          unit="%"
          severity={spo2Severity}
          icon="🫁"
        />

        {/* Blood Pressure */}
        <div
          className={`p-4 rounded-lg border-2 ${
            bpSysSeverity === 'critical' || bpDiaSeverity === 'critical'
              ? 'bg-red-50 border-red-500'
              : bpSysSeverity === 'warning' || bpDiaSeverity === 'warning'
              ? 'bg-yellow-50 border-yellow-500'
              : 'bg-green-50 border-green-500'
          } transition-colors duration-300`}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
              <span className="mr-2">🩸</span>
              BP
            </span>
            <span className="text-xs text-gray-500">mmHg</span>
          </div>
          <motion.div
            className={`mt-2 text-4xl font-mono font-bold tabular-nums ${
              bpSysSeverity === 'critical' || bpDiaSeverity === 'critical'
                ? 'text-red-600'
                : bpSysSeverity === 'warning' || bpDiaSeverity === 'warning'
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}
            key={`${displayVitals.bp_sys}-${displayVitals.bp_dia}`}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {displayVitals.bp_sys}
            <span className="text-2xl mx-1">/</span>
            {displayVitals.bp_dia}
          </motion.div>
        </div>

        {/* Respiratory Rate */}
        <VitalItem
          label="RR"
          value={displayVitals.rr}
          unit="/min"
          severity={rrSeverity}
          icon="🌬️"
        />
      </div>

      {/* Reference Ranges (optional, can be toggled) */}
      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer hover:text-gray-700">Reference Ranges</summary>
        <div className="mt-2 space-y-1 pl-4">
          <div>HR: 60-100 bpm</div>
          <div>BP: 100-140 / 60-90 mmHg</div>
          <div>RR: 12-20 /min</div>
          <div>SpO₂: 95-100%</div>
        </div>
      </details>
    </div>
  );
}

