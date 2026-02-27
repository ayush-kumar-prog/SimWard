/**
 * Simulation Runner - Main UI Integration
 * Phase 8: Integrate all systems into the main simulation interface
 * 
 * This page brings together:
 * - FSM engine (Phases 2)
 * - Voice input (Phase 3)
 * - Visual rendering (Phase 4)
 * - Gemini AI (Phase 5)
 * - Scoring system (Phase 6)
 * - Scenario loading (Phase 7)
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Components
import { VitalSignsDisplay } from '@/app/components/VitalSignsDisplay';
import { ECGWaveform } from '@/app/components/ECGWaveform';
import { Timer } from '@/app/components/Timer';
import { VoiceInput } from '@/app/components/VoiceInput';

// Engine & Logic
import { loadScenario } from '@/lib/engine/loader';
import {
  initializeScenario,
  getCurrentNode,
  getAvailableChoices,
  getChoiceById,
  isEndState,
} from '@/lib/engine/machine';
import {
  applyTransition,
  applyTimeout,
  updateTimer,
  endSimulation,
  getOutcome,
  useHint,
  isInEndState,
} from '@/lib/engine/transition';
import {
  calculateAllScores,
  calculateMetrics,
} from '@/lib/engine/scoring';

// Storage
import { getRunStore, generateRunId } from '@/lib/storage/store';

// Types
import type {
  Scenario,
  SimulationState,
  SimulationMode,
  Choice,
  ParseActionRequest,
  ParseActionResponse,
  CaptionRequest,
  CaptionResponse,
  DebriefRequest,
  DebriefResponse,
  ScoreBreakdown,
  Run,
} from '@/lib/types';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

type RunnerPhase =
  | 'select-scenario'
  | 'select-mode'
  | 'loading'
  | 'running'
  | 'awaiting-confidence'
  | 'awaiting-teachback'
  | 'ended';

interface ActionConfirmation {
  action: Choice;
  transcript: string;
  confidence: number;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SimulationRunnerPage() {
  const router = useRouter();

  // Core state
  const [phase, setPhase] = useState<RunnerPhase>('select-scenario');
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [mode, setMode] = useState<SimulationMode>('teaching');
  const [state, setState] = useState<SimulationState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [actionConfirmation, setActionConfirmation] = useState<ActionConfirmation | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [showCaption, setShowCaption] = useState(false);
  const [debrief, setDebrief] = useState<DebriefResponse | null>(null);
  const [scores, setScores] = useState<ScoreBreakdown | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [pendingTeachbackAnswer, setPendingTeachbackAnswer] = useState<string>('');
  const [pendingConfidence, setPendingConfidence] = useState<number | null>(null);
  const [evidenceView, setEvidenceView] = useState<string | null>(null);

  // Refs for action flow
  const pendingActionRef = useRef<{ actionId: string; choiceData: Choice } | null>(null);

  // Timer management
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // =============================================================================
  // SCENARIO LOADING
  // =============================================================================

  const handleLoadScenario = useCallback(async (scenarioId: string) => {
    setPhase('loading');
    setError(null);

    try {
      const loadedScenario = await loadScenario(scenarioId);
      setScenario(loadedScenario);
      setPhase('select-mode');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenario');
      setPhase('select-scenario');
    }
  }, []);

  // =============================================================================
  // SIMULATION START
  // =============================================================================

  const handleStartSimulation = useCallback(() => {
    if (!scenario) return;

    setPhase('loading');
    
    try {
      const initialState = initializeScenario(scenario, mode);
      setState(initialState);
      setPhase('running');
      
      // Start timer countdown
      startTimerCountdown(initialState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start simulation');
      setPhase('select-mode');
    }
  }, [scenario, mode]);

  // =============================================================================
  // TIMER MANAGEMENT
  // =============================================================================

  const startTimerCountdown = useCallback((currentState: SimulationState) => {
    // Clear existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Set up 1-second countdown
    timerIntervalRef.current = setInterval(() => {
      setState(prev => {
        if (!prev || !scenario) return prev;

        const newState = updateTimer(prev, 1);

        // Check for timeout
        if (newState.timer === 0 && !isInEndState(newState, scenario)) {
          const currentNode = getCurrentNode(newState, scenario);
          
          if (currentNode.timeout_next) {
            // Apply timeout transition
            const timeoutState = applyTimeout(newState, scenario);
            
            // Check if we've reached an end state
            if (isInEndState(timeoutState, scenario)) {
              handleEndSimulation(timeoutState);
            } else {
              // Start timer for next node
              startTimerCountdown(timeoutState);
            }
            
            return timeoutState;
          }
        }

        return newState;
      });
    }, 1000);
  }, [scenario]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // =============================================================================
  // VOICE ACTION HANDLING
  // =============================================================================

  const handleVoiceTranscript = useCallback(async (transcript: string, isFinal: boolean) => {
    if (!isFinal || !scenario || !state || phase !== 'running') return;
    if (isProcessingAction) return;

    setIsProcessingAction(true);

    try {
      // Get available choices
      const choices = getAvailableChoices(state, scenario);
      
      // Format for API
      const allowedActions = choices.map(choice => ({
        id: choice.id,
        label: choice.label,
        aliases: choice.voice_aliases || [],
      }));

      // Call parse-action API
      const request: ParseActionRequest = {
        transcript,
        allowed: allowedActions,
      };

      const response = await fetch('/api/parse-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const result: ParseActionResponse = await response.json();

      if (result.error || !result.actionId) {
        setError(result.error || 'Could not match your command to an action');
        setIsProcessingAction(false);
        return;
      }

      // Get the matched choice
      const matchedChoice = getChoiceById(state, scenario, result.actionId);
      
      if (!matchedChoice) {
        setError('Invalid action returned');
        setIsProcessingAction(false);
        return;
      }

      // Show confirmation
      setActionConfirmation({
        action: matchedChoice,
        transcript,
        confidence: result.confidence || 0,
      });

      // Store pending action for after confidence/teachback prompts
      pendingActionRef.current = {
        actionId: result.actionId,
        choiceData: matchedChoice,
      };

      // Check if we need confidence rating (Teaching mode only)
      if (mode === 'teaching' && matchedChoice.ask_uncertainty) {
        setCurrentPrompt('Say your confidence as a percentage (0 to 100)');
        setPhase('awaiting-confidence');
      }
      // Check if we need teach-back (Teaching mode only)
      else if (mode === 'teaching' && matchedChoice.teachback_id) {
        const teachback = scenario.teachbacks[matchedChoice.teachback_id];
        if (teachback) {
          setCurrentPrompt(teachback.prompt);
          setPhase('awaiting-teachback');
        } else {
          // No teach-back found, just apply transition
          await applyAction(result.actionId, matchedChoice);
        }
      } else {
        // No confidence or teach-back needed, apply directly
        await applyAction(result.actionId, matchedChoice);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process voice input');
      setIsProcessingAction(false);
    }
  }, [scenario, state, phase, mode, isProcessingAction]);

  // =============================================================================
  // CONFIDENCE HANDLING
  // =============================================================================

  const handleConfidenceTranscript = useCallback(async (transcript: string, isFinal: boolean) => {
    if (!isFinal || phase !== 'awaiting-confidence') return;

    // Extract number from transcript
    const match = transcript.match(/(\d+)/);
    if (!match) {
      setError('Please say a number between 0 and 100');
      return;
    }

    const confidencePercent = parseInt(match[1], 10);
    if (confidencePercent < 0 || confidencePercent > 100) {
      setError('Confidence must be between 0 and 100');
      return;
    }

    setPendingConfidence(confidencePercent / 100); // Normalize to 0-1

    // Check if we also need teach-back
    if (pendingActionRef.current && scenario) {
      const choice = pendingActionRef.current.choiceData;
      
      if (choice.teachback_id) {
        const teachback = scenario.teachbacks[choice.teachback_id];
        if (teachback) {
          setCurrentPrompt(teachback.prompt);
          setPhase('awaiting-teachback');
          return;
        }
      }
    }

    // No teach-back needed, apply action with confidence
    if (pendingActionRef.current) {
      await applyAction(
        pendingActionRef.current.actionId,
        pendingActionRef.current.choiceData,
        confidencePercent / 100
      );
    }
  }, [phase, scenario]);

  // =============================================================================
  // TEACH-BACK HANDLING
  // =============================================================================

  const handleTeachbackTranscript = useCallback(async (transcript: string, isFinal: boolean) => {
    if (!isFinal || phase !== 'awaiting-teachback') return;

    setPendingTeachbackAnswer(transcript);

    // Apply action with confidence and teach-back
    if (pendingActionRef.current) {
      await applyAction(
        pendingActionRef.current.actionId,
        pendingActionRef.current.choiceData,
        pendingConfidence || undefined,
        transcript
      );
    }
  }, [phase, pendingConfidence]);

  // =============================================================================
  // ACTION APPLICATION
  // =============================================================================

  const applyAction = useCallback(async (
    actionId: string,
    choice: Choice,
    uncertainty?: number,
    teachback?: string
  ) => {
    if (!scenario || !state) return;

    try {
      // Apply FSM transition
      const newState = applyTransition(state, actionId, scenario, uncertainty, teachback);
      setState(newState);

      // Reset UI state
      setActionConfirmation(null);
      pendingActionRef.current = null;
      setPendingConfidence(null);
      setPendingTeachbackAnswer('');
      setCurrentPrompt('');
      setPhase('running');
      setIsProcessingAction(false);

      // Fetch caption (Teaching mode only, non-blocking)
      if (mode === 'teaching' && choice.caption_key) {
        fetchCaption(actionId, choice.caption_key, newState);
      }

      // Check if we've reached an end state
      if (isInEndState(newState, scenario)) {
        handleEndSimulation(newState);
      } else {
        // Restart timer for new node
        startTimerCountdown(newState);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply action');
      setPhase('running');
      setIsProcessingAction(false);
    }
  }, [scenario, state, mode, startTimerCountdown]);

  // =============================================================================
  // CAPTION FETCHING
  // =============================================================================

  const fetchCaption = useCallback(async (
    actionId: string,
    captionKey: string,
    currentState: SimulationState
  ) => {
    if (!scenario) return;

    try {
      const request: CaptionRequest = {
        scenario_id: scenario.id,
        node_id: currentState.nodeId,
        last_action: actionId,
        state_snapshot: currentState.vitals,
        fallback_key: captionKey,
      };

      const response = await fetch('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const result: CaptionResponse = await response.json();
      setCaption(result.caption);
      setShowCaption(true);

      // Auto-hide caption after 5 seconds
      setTimeout(() => {
        setShowCaption(false);
      }, 5000);

    } catch (err) {
      // Use fallback caption on error
      const fallbackCaption = scenario.captions[captionKey];
      if (fallbackCaption) {
        setCaption(fallbackCaption);
        setShowCaption(true);
        setTimeout(() => setShowCaption(false), 5000);
      }
    }
  }, [scenario]);

  // =============================================================================
  // END SIMULATION
  // =============================================================================

  const handleEndSimulation = useCallback(async (finalState: SimulationState) => {
    if (!scenario) return;

    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Mark simulation as ended
    const endedState = endSimulation(finalState);
    setState(endedState);

    // Calculate scores
    const calculatedScores = calculateAllScores(endedState, scenario);
    setScores(calculatedScores);

    // Calculate metrics
    const metrics = calculateMetrics(endedState.history, scenario, endedState);

    // Get outcome
    const outcome = getOutcome(endedState, scenario) || 'Simulation ended';

    // Save run to storage
    try {
      const run: Run = {
        runId: generateRunId(),
        scenarioId: scenario.id,
        mode: endedState.mode,
        startedAt: endedState.startedAt,
        endedAt: endedState.endedAt || Date.now(),
        history: endedState.history,
        metrics,
        score: calculatedScores,
      };

      const store = getRunStore();
      await store.saveRun(run);
      console.log('Run saved successfully:', run.runId);
    } catch (err) {
      console.error('Failed to save run:', err);
      // Don't block debrief if save fails
    }

    // Fetch debrief from AI
    try {
      const request: DebriefRequest = {
        history: endedState.history,
        scores: calculatedScores,
        outcome,
        top_misses: [], // TODO: Calculate from metrics
      };

      const response = await fetch('/api/debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const result: DebriefResponse = await response.json();
      setDebrief(result);

    } catch (err) {
      // Provide basic debrief on error
      setDebrief({
        headline: outcome,
        strengths: ['Completed the simulation'],
        misses: [],
        tip: 'Review your actions and timing for improvement.',
        narrative: `You scored ${calculatedScores.total}/100 overall.`,
      });
    }

    setPhase('ended');
  }, [scenario]);

  // =============================================================================
  // HINT SYSTEM (Teaching Mode Only)
  // =============================================================================

  const handleUseHint = useCallback(() => {
    if (!scenario || !state || mode !== 'teaching') return;

    // Use first choice as hint (simplified)
    const choices = getAvailableChoices(state, scenario);
    if (choices.length > 0) {
      alert(`Hint: Consider ${choices[0].label}`);
      setState(useHint(state));
    }
  }, [scenario, state, mode]);

  // =============================================================================
  // RENDER: SCENARIO SELECTION
  // =============================================================================

  if (phase === 'select-scenario') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SimWard</h1>
          <p className="text-lg text-gray-600 mb-8">Voice-First Clinical Micro-Simulation</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">⚠️ {error}</p>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Select a Scenario</h2>
            
            <button
              onClick={() => handleLoadScenario('anaphylaxis_pacu_v1')}
              className="w-full p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl text-left"
            >
              <h3 className="text-xl font-bold mb-2">PACU Anaphylaxis</h3>
              <p className="text-blue-100 mb-2">
                Post-operative anaphylactic reaction in recovery room
              </p>
              <div className="flex items-center space-x-4 text-sm text-blue-200">
                <span>⏱️ ~5 min</span>
                <span>📊 10 nodes</span>
                <span>🎯 6 end states</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =============================================================================
  // RENDER: MODE SELECTION
  // =============================================================================

  if (phase === 'select-mode' && scenario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{scenario.title}</h1>
          <p className="text-gray-600 mb-8">Choose your simulation mode</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Teaching Mode */}
            <button
              onClick={() => setMode('teaching')}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                mode === 'teaching'
                  ? 'border-green-500 bg-green-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-green-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">🎓 Teaching Mode</h3>
                {mode === 'teaching' && <span className="text-green-600">✓</span>}
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✅ Real-time captions</li>
                <li>✅ Confidence ratings</li>
                <li>✅ Teach-back prompts</li>
                <li>✅ Hints available</li>
                <li>✅ Learning feedback</li>
              </ul>
            </button>

            {/* Exam Mode */}
            <button
              onClick={() => setMode('exam')}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                mode === 'exam'
                  ? 'border-red-500 bg-red-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-red-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">📝 Exam Mode</h3>
                {mode === 'exam' && <span className="text-red-600">✓</span>}
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>⛔ No real-time captions</li>
                <li>⛔ No hints</li>
                <li>⚠️ Strict timers</li>
                <li>📊 Debrief at end only</li>
                <li>🎯 Assessment mode</li>
              </ul>
            </button>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => setPhase('select-scenario')}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              ← Back
            </button>
            <button
              onClick={handleStartSimulation}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold"
            >
              Start Simulation →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =============================================================================
  // RENDER: LOADING
  // =============================================================================

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading simulation...</p>
        </div>
      </div>
    );
  }

  // =============================================================================
  // RENDER: MAIN SIMULATION UI
  // =============================================================================

  if ((phase === 'running' || phase === 'awaiting-confidence' || phase === 'awaiting-teachback') && scenario && state) {
    const currentNode = getCurrentNode(state, scenario);
    const choices = getAvailableChoices(state, scenario);
    const isInPromptMode = phase === 'awaiting-confidence' || phase === 'awaiting-teachback';

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header Bar */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{scenario.title}</h1>
            <p className="text-sm text-gray-400 capitalize">
              {mode} Mode {isInPromptMode && '• Awaiting Response'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {mode === 'teaching' && (
              <button
                onClick={handleUseHint}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium transition-colors"
              >
                💡 Hint (-{scenario.scoring.completeness.hint_penalty} pts)
              </button>
            )}
            <Timer
              timeRemaining={state.timer}
              totalTime={currentNode.time_limit_sec || 60}
              onTimeout={() => {}} // Handled by interval
              size={80}
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-80px)]">
          {/* Left Panel: Monitor */}
          <div className="col-span-3 space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <VitalSignsDisplay vitals={state.vitals} animated={true} />
            </div>
            <ECGWaveform hr={state.vitals.hr} height={120} />
            
            {/* Checklist (Teaching Mode) */}
            {mode === 'teaching' && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Checklist</h3>
                <div className="space-y-1">
                  {scenario.checklist.map(item => (
                    <div key={item.id} className="flex items-center space-x-2 text-sm">
                      <span className={state.checklist.includes(item.id) ? 'text-green-400' : 'text-gray-500'}>
                        {state.checklist.includes(item.id) ? '✓' : '○'}
                      </span>
                      <span className={state.checklist.includes(item.id) ? 'text-gray-300' : 'text-gray-500'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center Panel: Scene & Evidence */}
          <div className="col-span-6 flex flex-col">
            {/* Scene Background */}
            <div className="flex-1 relative bg-gray-800 rounded-lg overflow-hidden mb-4">
              {currentNode.scene && (
                <img
                  src={`/${currentNode.scene}`}
                  alt="Scene"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23374151" width="400" height="300"/%3E%3Ctext fill="%239CA3AF" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EScene Image%3C/text%3E%3C/svg%3E';
                  }}
                />
              )}
              
              {/* Evidence Thumbnails */}
              {currentNode.evidence && currentNode.evidence.length > 0 && (
                <div className="absolute bottom-4 left-4 flex space-x-2">
                  {currentNode.evidence.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setEvidenceView(img)}
                      className="w-16 h-16 bg-gray-700 rounded border-2 border-gray-600 hover:border-blue-500 transition-colors overflow-hidden"
                    >
                      <img
                        src={`/${img}`}
                        alt={`Evidence ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Action Confirmation Overlay */}
              <AnimatePresence>
                {actionConfirmation && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-4 left-4 right-4 bg-blue-600 bg-opacity-95 rounded-lg p-4 shadow-xl"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold">✓</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-blue-100 mb-1">Action Confirmed:</p>
                        <p className="font-bold text-lg">{actionConfirmation.action.label}</p>
                        <p className="text-xs text-blue-200 mt-1">
                          Recognized: "{actionConfirmation.transcript}"
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Caption Display (Teaching Mode) */}
              <AnimatePresence>
                {mode === 'teaching' && showCaption && caption && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute bottom-20 left-4 right-4 bg-green-600 bg-opacity-95 rounded-lg p-4 shadow-xl"
                  >
                    <div className="flex items-start space-x-2">
                      <span className="text-2xl">💡</span>
                      <p className="text-sm leading-relaxed">{caption}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Prompt Overlay */}
              <AnimatePresence>
                {isInPromptMode && currentPrompt && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center p-8"
                  >
                    <div className="max-w-xl bg-gray-800 rounded-xl p-8 text-center">
                      <h3 className="text-2xl font-bold mb-4 text-yellow-400">
                        {phase === 'awaiting-confidence' ? '📊 Confidence Rating' : '🎓 Teach-Back'}
                      </h3>
                      <p className="text-lg mb-6">{currentPrompt}</p>
                      <div className="w-16 h-1 bg-yellow-400 mx-auto animate-pulse"></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Voice Input */}
            <div className="bg-gray-800 rounded-lg p-6">
              {phase === 'running' && (
                <VoiceInput
                  onTranscript={handleVoiceTranscript}
                  onError={setError}
                  disabled={isProcessingAction}
                  placeholder="Press Space or click mic to speak your action..."
                />
              )}
              {phase === 'awaiting-confidence' && (
                <VoiceInput
                  onTranscript={handleConfidenceTranscript}
                  onError={setError}
                  placeholder="Say a number from 0 to 100..."
                />
              )}
              {phase === 'awaiting-teachback' && (
                <VoiceInput
                  onTranscript={handleTeachbackTranscript}
                  onError={setError}
                  placeholder="Speak your answer (≤10 words)..."
                />
              )}
            </div>
          </div>

          {/* Right Panel: Actions & Feedback */}
          <div className="col-span-3 space-y-4 overflow-y-auto">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Available Actions</h3>
              <div className="space-y-2">
                {choices.map(choice => (
                  <div
                    key={choice.id}
                    className="p-3 bg-gray-700 rounded border border-gray-600 text-sm"
                  >
                    <p className="font-medium">{choice.label}</p>
                    {choice.voice_aliases && choice.voice_aliases.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Also: {choice.voice_aliases.slice(0, 2).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* History */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Action History</h3>
              <div className="space-y-2">
                {state.history.slice(-5).reverse().map((entry, idx) => (
                  <div key={idx} className="text-xs p-2 bg-gray-700 rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-gray-400">{entry.t}s</span>
                      {entry.correct !== undefined && (
                        <span className={entry.correct ? 'text-green-400' : 'text-red-400'}>
                          {entry.correct ? '✓' : '✗'}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 mt-1">{entry.actionId}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center space-x-3"
            >
              <span>⚠️</span>
              <p>{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-4 px-3 py-1 bg-red-700 hover:bg-red-800 rounded transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Evidence Modal */}
        <AnimatePresence>
          {evidenceView && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
              onClick={() => setEvidenceView(null)}
            >
              <div className="max-w-4xl max-h-screen">
                <img
                  src={`/${evidenceView}`}
                  alt="Evidence"
                  className="max-w-full max-h-screen object-contain"
                />
              </div>
              <button
                className="absolute top-4 right-4 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-2xl"
                onClick={() => setEvidenceView(null)}
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // =============================================================================
  // RENDER: END STATE / DEBRIEF
  // =============================================================================

  if (phase === 'ended' && scores && debrief && state) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">{debrief.headline}</h1>
            <p className="text-xl text-gray-400">Simulation Complete</p>
          </div>

          {/* Score Display */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 mb-8 text-center">
            <div className="text-6xl font-bold mb-2">{scores.total}</div>
            <div className="text-xl text-blue-100">Overall Score</div>
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div>
                <div className="text-2xl font-bold">{scores.timing}</div>
                <div className="text-sm text-blue-200">Timing<br/>/40</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{scores.correctness}</div>
                <div className="text-sm text-blue-200">Correctness<br/>/40</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{scores.completeness}</div>
                <div className="text-sm text-blue-200">Completeness<br/>/20</div>
              </div>
    <div>
                <div className="text-2xl font-bold">{scores.calibration}</div>
                <div className="text-sm text-blue-200">Calibration<br/>/100</div>
              </div>
            </div>
          </div>

          {/* Debrief Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Strengths */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center">
                <span className="mr-2">✅</span> Strengths
              </h3>
              <ul className="space-y-2">
                {debrief.strengths.map((strength, idx) => (
                  <li key={idx} className="text-gray-300 flex items-start">
                    <span className="mr-2 text-green-400">•</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center">
                <span className="mr-2">💡</span> Areas for Improvement
              </h3>
              <ul className="space-y-2">
                {debrief.misses.length > 0 ? (
                  debrief.misses.map((miss, idx) => (
                    <li key={idx} className="text-gray-300 flex items-start">
                      <span className="mr-2 text-yellow-400">•</span>
                      {miss}
                    </li>
                  ))
                ) : (
                  <li className="text-gray-400 italic">No major issues identified</li>
                )}
              </ul>
            </div>
          </div>

          {/* Tip */}
          <div className="bg-blue-900 bg-opacity-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-blue-300 mb-2">💡 Next Steps</h3>
            <p className="text-gray-300">{debrief.tip}</p>
          </div>

          {/* Narrative */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-300 mb-3">Narrative</h3>
            <p className="text-gray-400 leading-relaxed">{debrief.narrative}</p>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/analytics')}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium"
            >
              📊 View Analytics
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all shadow-lg font-bold"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
    </div>
  );
}

  return null;
}
