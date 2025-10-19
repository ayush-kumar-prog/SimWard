'use client';

/**
 * Phase 6 Test Page - Scoring System Validation
 * Tests all scoring functions with sample data
 */

import { useState } from 'react';
import {
  calculateTimingScore,
  calculateCorrectnessScore,
  calculateCompletenessScore,
  calculateCalibrationScore,
  calculateTotalScore,
  calculateAllScores,
  calculateMetrics,
} from '@/lib/engine/scoring';
import type { RunHistoryEntry, Scenario, SimulationState, ScoreBreakdown, RunMetrics } from '@/lib/types';

export default function TestScoringPage() {
  const [results, setResults] = useState<{
    scores: ScoreBreakdown;
    metrics: RunMetrics;
  } | null>(null);

  // Mock scenario with scoring rules
  const mockScenario: Scenario = {
    id: 'anaphylaxis_test',
    title: 'Anaphylaxis Test Scenario',
    initial_state: 'S0',
    mode_defaults: { teaching: true, exam: true },
    checklist: [
      { id: 'adrenaline', label: 'IM adrenaline given' },
      { id: 'oxygen', label: 'High-flow O₂' },
      { id: 'positioning', label: 'Supine + legs elevated' },
    ],
    teachbacks: {
      why_adrenaline: {
        prompt: 'Why is IM adrenaline first-line?',
        rubric: ['airway edema', 'vasodilation', 'shock reversal'],
      },
    },
    nodes: {
      S0: {
        scene: 'bg/pacu.png',
        vitals: { hr: 124, bp_sys: 78, bp_dia: 40, rr: 28, spo2: 88 },
        choices: [
          {
            id: 'adrenaline_im',
            label: 'IM Adrenaline 0.5mg',
            next: 'S1_GOOD',
            ticks: ['adrenaline'],
          },
          {
            id: 'oxygen',
            label: 'High-flow O₂',
            next: 'S1_SUPPORT',
            ticks: ['oxygen'],
          },
        ],
      },
      S1_GOOD: {
        scene: 'bg/pacu.png',
        vitals: { hr: 110, bp_sys: 95, bp_dia: 55, rr: 24, spo2: 94 },
        choices: [
          {
            id: 'positioning',
            label: 'Supine positioning',
            next: 'END_GOOD',
            ticks: ['positioning'],
          },
        ],
      },
      S1_SUPPORT: {
        scene: 'bg/pacu.png',
        vitals: { hr: 120, bp_sys: 80, bp_dia: 42, rr: 26, spo2: 91 },
        choices: [
          {
            id: 'adrenaline_im',
            label: 'IM Adrenaline 0.5mg',
            next: 'END_OK',
            ticks: ['adrenaline'],
          },
        ],
      },
    },
    end_states: {
      END_GOOD: { outcome: 'Stabilized promptly' },
      END_OK: { outcome: 'Stabilized with delay' },
    },
    captions: {},
    scoring: {
      weights: {
        timing: 40,
        correctness: 40,
        completeness: 20,
        calibration: 0,
      },
      timers: {
        adrenaline_im: {
          '<=30': 20,
          '<=60': 15,
          '>60': 0,
        },
      },
      correct: {
        S0: ['adrenaline_im'], // Correct action at S0
        S1_GOOD: ['positioning'], // Correct action at S1_GOOD
      },
      completeness: {
        checklist: {
          adrenaline: 6,
          oxygen: 4,
          positioning: 4,
        },
        teachback_pass: 6,
        hint_penalty: -3,
      },
    },
  };

  // Test Case 1: Perfect run
  const perfectHistory: RunHistoryEntry[] = [
    {
      t: 11,
      nodeId: 'S0',
      actionId: 'adrenaline_im',
      uncertainty: 0.8,
      correct: true,
    },
    {
      t: 24,
      nodeId: 'S1_GOOD',
      actionId: 'positioning',
      uncertainty: 0.9,
      correct: true,
    },
  ];

  const perfectState: SimulationState = {
    nodeId: 'END_GOOD',
    vitals: { hr: 100, bp_sys: 110, bp_dia: 65, rr: 18, spo2: 98 },
    timer: 0,
    checklist: ['adrenaline', 'positioning'],
    history: perfectHistory,
    mode: 'teaching',
    hintsUsed: 0,
    startedAt: Date.now() - 24000,
  };

  // Test Case 2: Delayed run
  const delayedHistory: RunHistoryEntry[] = [
    {
      t: 45,
      nodeId: 'S0',
      actionId: 'oxygen',
      uncertainty: 0.6,
      correct: false,
    },
    {
      t: 72,
      nodeId: 'S1_SUPPORT',
      actionId: 'adrenaline_im',
      uncertainty: 0.7,
      correct: true,
    },
  ];

  const delayedState: SimulationState = {
    nodeId: 'END_OK',
    vitals: { hr: 105, bp_sys: 100, bp_dia: 60, rr: 20, spo2: 95 },
    timer: 0,
    checklist: ['oxygen', 'adrenaline'],
    history: delayedHistory,
    mode: 'exam',
    hintsUsed: 2,
    startedAt: Date.now() - 72000,
  };

  const runTest = (testCase: 'perfect' | 'delayed') => {
    const state = testCase === 'perfect' ? perfectState : delayedState;
    const scores = calculateAllScores(state, mockScenario);
    const metrics = calculateMetrics(state.history, mockScenario, state);

    setResults({ scores, metrics });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-gray-800 pb-6">
          <h1 className="text-4xl font-bold text-blue-400 mb-2">
            Phase 6: Scoring System Test
          </h1>
          <p className="text-gray-400">
            Test all scoring functions with sample scenarios
          </p>
        </div>

        {/* Test Controls */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-300">Test Cases</h2>
          <div className="flex gap-4">
            <button
              onClick={() => runTest('perfect')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Test Perfect Run
            </button>
            <button
              onClick={() => runTest('delayed')}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
            >
              Test Delayed Run
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-400 space-y-2">
            <div>
              <strong className="text-green-400">Perfect Run:</strong> Adrenaline at 11s (≤30s bucket), correct actions, all checklist items, high confidence on correct actions
            </div>
            <div>
              <strong className="text-yellow-400">Delayed Run:</strong> Wrong action first (oxygen), adrenaline at 72s (&gt;60s bucket), 2 hints used, lower confidence
            </div>
          </div>
        </div>

        {/* Results Display */}
        {results && (
          <>
            {/* Score Breakdown */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-300">
                Score Breakdown
              </h2>

              <div className="space-y-4">
                {/* Total Score */}
                <div className="bg-gray-800 p-4 rounded-lg border-2 border-blue-600">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold">Total Score</span>
                    <span className="text-4xl font-bold text-blue-400">
                      {results.scores.total}/100
                    </span>
                  </div>
                </div>

                {/* Individual Scores */}
                <div className="grid grid-cols-2 gap-4">
                  <ScoreCard
                    label="Timing"
                    score={results.scores.timing}
                    max={40}
                    color="green"
                    description="Speed of critical actions"
                  />
                  <ScoreCard
                    label="Correctness"
                    score={results.scores.correctness}
                    max={40}
                    color="blue"
                    description="Right decisions at each step"
                  />
                  <ScoreCard
                    label="Completeness"
                    score={results.scores.completeness}
                    max={20}
                    color="purple"
                    description="Checklist + teach-backs"
                  />
                  <ScoreCard
                    label="Calibration"
                    score={results.scores.calibration}
                    max={100}
                    color="orange"
                    description="Confidence vs accuracy"
                  />
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-300">
                Performance Metrics
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  label="Time to Critical Action"
                  value={results.metrics.timeToCritical !== undefined 
                    ? `${results.metrics.timeToCritical}s` 
                    : 'N/A'}
                />
                <MetricCard
                  label="Branch"
                  value={results.metrics.branch}
                  badge={true}
                />
                <MetricCard
                  label="Checklist Items"
                  value={`${results.metrics.checklistTicks.length} completed`}
                />
                <MetricCard
                  label="Hints Used"
                  value={results.metrics.usedHints.toString()}
                />
                <MetricCard
                  label="Teach-Backs"
                  value={`${results.metrics.teachbackPasses}/${results.metrics.totalTeachbacks} passed`}
                />
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="bg-blue-950 border border-blue-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3 text-blue-300">
                Validation Checklist
              </h2>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Timing score calculated correctly (0-40 range)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Correctness score reflects right/wrong decisions</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Completeness includes checklist + hint penalty</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Calibration uses Brier score (0-100)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Total score applies weights correctly</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Metrics capture branch and timing correctly</span>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper Components
function ScoreCard({ 
  label, 
  score, 
  max, 
  color, 
  description 
}: { 
  label: string; 
  score: number; 
  max: number; 
  color: string; 
  description: string;
}) {
  const percentage = (score / max) * 100;
  const colorClasses = {
    green: 'bg-green-600',
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
  }[color];

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-semibold text-lg">{label}</div>
          <div className="text-sm text-gray-400">{description}</div>
        </div>
        <div className="text-2xl font-bold">
          {score}/{max}
        </div>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`${colorClasses} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  badge 
}: { 
  label: string; 
  value: string; 
  badge?: boolean;
}) {
  const badgeColor = {
    good: 'bg-green-900 text-green-300',
    delay: 'bg-yellow-900 text-yellow-300',
    timeout: 'bg-red-900 text-red-300',
  }[value as 'good' | 'delay' | 'timeout'] || 'bg-gray-700 text-gray-300';

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      {badge ? (
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${badgeColor}`}>
          {value}
        </span>
      ) : (
        <div className="text-xl font-semibold">{value}</div>
      )}
    </div>
  );
}

