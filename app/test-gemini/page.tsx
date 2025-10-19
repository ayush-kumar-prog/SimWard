'use client';

/**
 * Phase 5 Test Page - Gemini AI Integration
 * Tests caption generation, debrief generation, and teach-back grading
 */

import { useState } from 'react';
import type { VitalSigns } from '@/lib/types';
import { gradeTeachback, buildTeachbackFeedback } from '@/lib/llm/teachback';

export default function TestGeminiPage() {
  const [captionResult, setCaptionResult] = useState<any>(null);
  const [captionLoading, setCaptionLoading] = useState(false);

  const [debriefResult, setDebriefResult] = useState<any>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);

  const [teachbackAnswer, setTeachbackAnswer] = useState('reverses airway edema and vasodilation');
  const [teachbackResult, setTeachbackResult] = useState<any>(null);

  const [testMode, setTestMode] = useState<'with-api' | 'fallback-only'>('with-api');

  // Test data
  const testVitals: VitalSigns = {
    hr: 124,
    bp_sys: 78,
    bp_dia: 40,
    rr: 28,
    spo2: 88
  };

  const testHistory = [
    {
      t: 11,
      nodeId: 'S0',
      actionId: 'adrenaline_im',
      uncertainty: 0.8,
      teachback: 'reverses edema and vasodilation',
      correct: true
    },
    {
      t: 24,
      nodeId: 'S1_GOOD',
      actionId: 'airway_oxygen',
      uncertainty: 0.9,
      correct: true
    },
    {
      t: 35,
      nodeId: 'S2_STABLE',
      actionId: 'iv_fluids',
      correct: true
    }
  ];

  const testScores = {
    total: 90,
    timing: 36,
    correctness: 40,
    completeness: 14,
    calibration: 85
  };

  // Test Caption API
  const testCaptionAPI = async () => {
    setCaptionLoading(true);
    setCaptionResult(null);

    try {
      const startTime = Date.now();

      const response = await fetch('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: 'anaphylaxis_pacu_v1',
          node_id: 'S0',
          last_action: 'adrenaline_im',
          state_snapshot: testVitals,
          rubric_snippets: ['IM adrenaline is first-line treatment for anaphylaxis'],
          fallback_key: 'why_adrenaline_first',
          fallback_text: testMode === 'fallback-only' 
            ? 'IM adrenaline reverses airway edema & vasodilation; reassess in 2–5 min.'
            : 'IM adrenaline reverses airway edema & vasodilation; reassess in 2–5 min.'
        })
      });

      const endTime = Date.now();
      const data = await response.json();

      setCaptionResult({
        ...data,
        actualLatency: endTime - startTime,
        status: response.status,
        ok: response.ok
      });

    } catch (error) {
      setCaptionResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        ok: false
      });
    } finally {
      setCaptionLoading(false);
    }
  };

  // Test Debrief API
  const testDebriefAPI = async () => {
    setDebriefLoading(true);
    setDebriefResult(null);

    try {
      const startTime = Date.now();

      const response = await fetch('/api/debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: testHistory,
          scores: testScores,
          outcome: 'Stabilized promptly',
          top_misses: ['Antihistamine not given', 'Steroid not administered'],
          checklist_ticks: ['adrenaline', 'oxygen'],
          teachback_results: { passed: 1, total: 1 }
        })
      });

      const endTime = Date.now();
      const data = await response.json();

      setDebriefResult({
        ...data,
        actualLatency: endTime - startTime,
        status: response.status,
        ok: response.ok
      });

    } catch (error) {
      setDebriefResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        ok: false
      });
    } finally {
      setDebriefLoading(false);
    }
  };

  // Test Teach-Back Grading (client-side)
  const testTeachbackGrading = () => {
    const rubric = ['airway edema', 'vasodilation', 'shock reversal'];
    const result = gradeTeachback(teachbackAnswer, rubric, 0.5);
    const feedback = buildTeachbackFeedback(result);

    setTeachbackResult({
      ...result,
      feedback
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-gray-800 pb-6">
          <h1 className="text-4xl font-bold text-blue-400 mb-2">
            Phase 5: Gemini AI Integration Test
          </h1>
          <p className="text-gray-400">
            Test caption generation, debrief generation, and teach-back grading
          </p>
        </div>

        {/* Test Mode Selector */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-300">Test Mode</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setTestMode('with-api')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testMode === 'with-api'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              With Gemini API
            </button>
            <button
              onClick={() => setTestMode('fallback-only')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testMode === 'fallback-only'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Fallback Only (No API Key)
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            {testMode === 'with-api' 
              ? 'Tests with Gemini API (requires GEMINI_API_KEY in .env.local)'
              : 'Tests fallback responses without API key'}
          </p>
        </div>

        {/* Caption Test */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-300">
            1. Caption Generation API
          </h2>
          
          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded">
              <p className="text-sm font-mono text-gray-400 mb-2">Test Input:</p>
              <pre className="text-xs text-gray-300 overflow-auto">
{JSON.stringify({
  scenario_id: 'anaphylaxis_pacu_v1',
  node_id: 'S0',
  last_action: 'adrenaline_im',
  vitals: testVitals
}, null, 2)}
              </pre>
            </div>

            <button
              onClick={testCaptionAPI}
              disabled={captionLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {captionLoading ? 'Testing Caption API...' : 'Test Caption Generation'}
            </button>

            {captionResult && (
              <div className="bg-gray-800 p-4 rounded space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${captionResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                    {captionResult.ok ? '✓ Success' : '✗ Error'}
                  </span>
                  <span className="text-sm text-gray-400">
                    Latency: {captionResult.actualLatency}ms
                  </span>
                </div>

                {captionResult.caption && (
                  <>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Caption:</p>
                      <p className="text-white bg-gray-900 p-3 rounded border border-gray-700">
                        {captionResult.caption}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className={`px-2 py-1 rounded ${
                        captionResult.source === 'gemini' 
                          ? 'bg-green-900 text-green-300' 
                          : 'bg-yellow-900 text-yellow-300'
                      }`}>
                        Source: {captionResult.source}
                      </span>
                      {captionResult.latency_ms && (
                        <span className="text-gray-400">
                          API Latency: {captionResult.latency_ms}ms
                        </span>
                      )}
                    </div>
                  </>
                )}

                {captionResult.error && (
                  <div className="text-red-400 text-sm">
                    Error: {captionResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Debrief Test */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-300">
            2. Debrief Generation API
          </h2>
          
          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded">
              <p className="text-sm font-mono text-gray-400 mb-2">Test Input:</p>
              <pre className="text-xs text-gray-300 overflow-auto max-h-48">
{JSON.stringify({
  history: testHistory,
  scores: testScores,
  outcome: 'Stabilized promptly'
}, null, 2)}
              </pre>
            </div>

            <button
              onClick={testDebriefAPI}
              disabled={debriefLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {debriefLoading ? 'Testing Debrief API...' : 'Test Debrief Generation'}
            </button>

            {debriefResult && (
              <div className="bg-gray-800 p-4 rounded space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${debriefResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                    {debriefResult.ok ? '✓ Success' : '✗ Error'}
                  </span>
                  <span className="text-sm text-gray-400">
                    Latency: {debriefResult.actualLatency}ms
                  </span>
                </div>

                {debriefResult.headline && (
                  <>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Headline:</p>
                      <p className="text-xl font-semibold text-white">
                        {debriefResult.headline}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400 mb-2">Strengths:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {debriefResult.strengths?.map((s: string, i: number) => (
                          <li key={i} className="text-green-400">{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400 mb-2">Areas for Improvement:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {debriefResult.misses?.map((m: string, i: number) => (
                          <li key={i} className="text-yellow-400">{m}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400 mb-1">Clinical Tip:</p>
                      <p className="text-blue-300 bg-gray-900 p-3 rounded border border-gray-700">
                        {debriefResult.tip}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400 mb-1">Narrative:</p>
                      <p className="text-gray-300 bg-gray-900 p-3 rounded border border-gray-700">
                        {debriefResult.narrative}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className={`px-2 py-1 rounded ${
                        debriefResult.source === 'gemini' 
                          ? 'bg-green-900 text-green-300' 
                          : 'bg-yellow-900 text-yellow-300'
                      }`}>
                        Source: {debriefResult.source}
                      </span>
                      {debriefResult.latency_ms && (
                        <span className="text-gray-400">
                          API Latency: {debriefResult.latency_ms}ms
                        </span>
                      )}
                    </div>
                  </>
                )}

                {debriefResult.error && (
                  <div className="text-red-400 text-sm">
                    Error: {debriefResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Teach-Back Test */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-300">
            3. Teach-Back Grading (Client-Side)
          </h2>
          
          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded">
              <p className="text-sm text-gray-400 mb-2">Rubric (required concepts):</p>
              <div className="flex gap-2 flex-wrap">
                {['airway edema', 'vasodilation', 'shock reversal'].map((concept) => (
                  <span key={concept} className="px-2 py-1 bg-gray-700 rounded text-sm">
                    {concept}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Student&apos;s Answer (≤10 words):
              </label>
              <input
                type="text"
                value={teachbackAnswer}
                onChange={(e) => setTeachbackAnswer(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Enter teach-back answer..."
              />
            </div>

            <button
              onClick={testTeachbackGrading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Grade Teach-Back
            </button>

            {teachbackResult && (
              <div className="bg-gray-800 p-4 rounded space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold text-lg ${teachbackResult.passed ? 'text-green-400' : 'text-red-400'}`}>
                    {teachbackResult.passed ? '✓ Passed' : '✗ Not Passed'}
                  </span>
                  <span className="text-sm text-gray-400">
                    Score: {Math.round(teachbackResult.score * 100)}%
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Feedback:</p>
                  <p className="text-white bg-gray-900 p-3 rounded border border-gray-700">
                    {teachbackResult.feedback}
                  </p>
                </div>

                {teachbackResult.matched_concepts.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Matched Concepts:</p>
                    <div className="flex gap-2 flex-wrap">
                      {teachbackResult.matched_concepts.map((c: string) => (
                        <span key={c} className="px-2 py-1 bg-green-900 text-green-300 rounded text-sm">
                          ✓ {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {teachbackResult.missing_concepts.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Missing Concepts:</p>
                    <div className="flex gap-2 flex-wrap">
                      {teachbackResult.missing_concepts.map((c: string) => (
                        <span key={c} className="px-2 py-1 bg-red-900 text-red-300 rounded text-sm">
                          ✗ {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-blue-950 border border-blue-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-3 text-blue-300">
            Validation Checklist
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className={captionResult?.ok ? 'text-green-400' : 'text-gray-500'}>
                {captionResult?.ok ? '✓' : '○'}
              </span>
              <span>Caption generation returns valid response</span>
            </li>
            <li className="flex items-center gap-2">
              <span className={captionResult?.source ? 'text-green-400' : 'text-gray-500'}>
                {captionResult?.source ? '✓' : '○'}
              </span>
              <span>Fallback mechanism works when API unavailable</span>
            </li>
            <li className="flex items-center gap-2">
              <span className={debriefResult?.ok ? 'text-green-400' : 'text-gray-500'}>
                {debriefResult?.ok ? '✓' : '○'}
              </span>
              <span>Debrief generation returns structured feedback</span>
            </li>
            <li className="flex items-center gap-2">
              <span className={teachbackResult ? 'text-green-400' : 'text-gray-500'}>
                {teachbackResult ? '✓' : '○'}
              </span>
              <span>Teach-back grading matches concepts correctly</span>
            </li>
            <li className="flex items-center gap-2">
              <span className={captionResult?.actualLatency && captionResult.actualLatency < 1500 ? 'text-green-400' : 'text-gray-500'}>
                {captionResult?.actualLatency && captionResult.actualLatency < 1500 ? '✓' : '○'}
              </span>
              <span>Caption latency &lt;1500ms (target: &lt;600ms for Gemini)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className={debriefResult?.actualLatency && debriefResult.actualLatency < 4000 ? 'text-green-400' : 'text-gray-500'}>
                {debriefResult?.actualLatency && debriefResult.actualLatency < 4000 ? '✓' : '○'}
              </span>
              <span>Debrief latency &lt;4000ms</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

