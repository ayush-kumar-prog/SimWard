/**
 * Integration Test Page
 * Tests Voice Input → API → FSM Integration
 * 
 * Access at: http://localhost:3000/test
 */

'use client';

import { useState, useCallback } from 'react';
import { VoiceInput } from '@/app/components/VoiceInput';
import { initializeScenario, getCurrentNode, getAvailableChoices } from '@/lib/engine/machine';
import { applyTransition, applyTimeout, isInEndState, getOutcome } from '@/lib/engine/transition';
import { mockScenario } from '@/lib/engine/mock-scenario';
import type { SimulationState, Choice } from '@/lib/types';

export default function TestPage() {
  const [state, setState] = useState<SimulationState>(() => 
    initializeScenario(mockScenario, 'teaching')
  );
  const [lastTranscript, setLastTranscript] = useState('');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle final transcript from voice input
  const handleTranscript = useCallback(async (transcript: string, isFinal: boolean) => {
    if (!isFinal) {
      setLastTranscript(transcript);
      return;
    }

    setLastTranscript(transcript);
    setLoading(true);
    setError(null);

    try {
      // Get current available actions
      const choices = getAvailableChoices(state, mockScenario);
      
      // Call API to parse action
      const response = await fetch('/api/parse-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          allowed: choices.map(c => ({
            id: c.id,
            label: c.label,
            aliases: c.voice_aliases || [],
          })),
        }),
      });

      const data = await response.json();
      setApiResponse(data);

      // Handle different response types
      if ('actionId' in data && data.actionId) {
        // Success - apply transition
        const newState = applyTransition(state, data.actionId, mockScenario);
        setState(newState);
      } else if (data.error === 'disambiguation_needed') {
        setError(`Need clarification. Did you mean: ${data.suggestions.map((s: any) => s.label).join(' OR ')}?`);
      } else if (data.error === 'no_match') {
        setError(`No match found. Try: ${data.suggestions.map((s: any) => s.label).join(', ')}`);
      } else {
        setError('Unknown response from API');
      }
    } catch (err) {
      console.error('API call failed:', err);
      setError(err instanceof Error ? err.message : 'API call failed');
    } finally {
      setLoading(false);
    }
  }, [state]);

  // Reset simulation
  const handleReset = () => {
    setState(initializeScenario(mockScenario, 'teaching'));
    setLastTranscript('');
    setApiResponse(null);
    setError(null);
  };

  // Manual action selection (for testing without voice)
  const handleManualAction = (choiceId: string) => {
    const newState = applyTransition(state, choiceId, mockScenario);
    setState(newState);
  };

  const currentNode = getCurrentNode(state, mockScenario);
  const choices = getAvailableChoices(state, mockScenario);
  const inEndState = isInEndState(state, mockScenario);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              🧪 Integration Test: Voice → API → FSM
            </h1>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Voice Input & API Response */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">1️⃣ Voice Input</h2>
                <VoiceInput
                  onTranscript={handleTranscript}
                  onError={(err) => setError(err)}
                  disabled={inEndState}
                  placeholder={inEndState ? "Simulation ended" : "Speak an action..."}
                />
                
                {loading && (
                  <div className="mt-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="text-sm text-gray-600 mt-2">Processing...</p>
                  </div>
                )}
                
                {lastTranscript && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm font-medium text-blue-900">Last Transcript:</p>
                    <p className="text-blue-700">"{lastTranscript}"</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">2️⃣ API Response</h2>
                {apiResponse ? (
                  <div className="space-y-2">
                    <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto max-h-48">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>
                    {'actionId' in apiResponse && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-900">
                          ✅ Matched Action: {apiResponse.actionId}
                        </p>
                        <p className="text-xs text-green-700">
                          Confidence: {(apiResponse.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No API response yet</p>
                )}
                
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm font-medium text-red-900">⚠️ Error:</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: FSM State */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">3️⃣ FSM State</h2>
                
                <div className="space-y-3">
                  <div className="p-3 bg-white border border-gray-200 rounded">
                    <p className="text-xs font-medium text-gray-500">Current Node</p>
                    <p className="text-lg font-bold text-gray-900">{state.nodeId}</p>
                  </div>

                  <div className="p-3 bg-white border border-gray-200 rounded">
                    <p className="text-xs font-medium text-gray-500">Vital Signs</p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>
                        <span className="text-gray-600">HR:</span>
                        <span className="ml-2 font-mono font-bold">{state.vitals.hr}</span>
                        <span className="text-gray-500 text-xs ml-1">bpm</span>
                      </div>
                      <div>
                        <span className="text-gray-600">BP:</span>
                        <span className="ml-2 font-mono font-bold">
                          {state.vitals.bp_sys}/{state.vitals.bp_dia}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">RR:</span>
                        <span className="ml-2 font-mono font-bold">{state.vitals.rr}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">SpO2:</span>
                        <span className="ml-2 font-mono font-bold">{state.vitals.spo2}</span>
                        <span className="text-gray-500 text-xs ml-1">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-gray-200 rounded">
                    <p className="text-xs font-medium text-gray-500">Checklist</p>
                    <div className="mt-2 space-y-1">
                      {state.checklist.length > 0 ? (
                        state.checklist.map(item => (
                          <div key={item} className="text-sm text-green-600">
                            ✓ {item}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 italic">No items checked</p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-gray-200 rounded">
                    <p className="text-xs font-medium text-gray-500">History</p>
                    <div className="mt-2 space-y-1 max-h-32 overflow-auto">
                      {state.history.length > 0 ? (
                        state.history.map((entry, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="text-gray-500">{entry.t}s:</span>
                            <span className="ml-2 font-medium">{entry.actionId}</span>
                            {entry.correct !== undefined && (
                              <span className={`ml-2 ${entry.correct ? 'text-green-600' : 'text-red-600'}`}>
                                {entry.correct ? '✓' : '✗'}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 italic">No actions yet</p>
                      )}
                    </div>
                  </div>

                  {inEndState && (
                    <div className="p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                      <p className="text-sm font-medium text-green-900">🎉 Simulation Complete!</p>
                      <p className="text-sm text-green-700 mt-1">{getOutcome(state, mockScenario)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Available Actions</h2>
                <div className="space-y-2">
                  {choices.map(choice => (
                    <div key={choice.id} className="p-3 bg-white border border-gray-200 rounded hover:border-blue-400 transition-colors">
                      <button
                        onClick={() => handleManualAction(choice.id)}
                        disabled={inEndState}
                        className="w-full text-left disabled:opacity-50"
                      >
                        <p className="font-medium text-gray-900">{choice.label}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          ID: {choice.id} → {choice.next}
                        </p>
                        {choice.voice_aliases && choice.voice_aliases.length > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            Try: "{choice.voice_aliases[0]}"
                          </p>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">🧪 How to Test</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Click the microphone button or press <kbd className="px-2 py-1 bg-white border border-blue-300 rounded">Space</kbd></li>
            <li>Say one of the suggested actions (e.g., "primary action" or "correct action")</li>
            <li>Watch the API response appear (should show matched actionId)</li>
            <li>See the FSM state update (node changes, vitals update, checklist ticked)</li>
            <li>Try multiple actions to reach an end state</li>
            <li>Or click "Manual" buttons to test FSM without voice</li>
          </ol>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm font-medium text-blue-900">Expected Flow:</p>
            <p className="text-sm text-blue-700">START → "correct action" → GOOD_PATH → "secondary action" → END_SUCCESS ✅</p>
          </div>
        </div>
      </div>
    </div>
  );
}

