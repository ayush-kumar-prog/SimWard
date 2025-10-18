/**
 * FSM Transition Logic
 * Phase 2: Deterministic FSM Engine
 * 
 * This module handles state transitions, vital sign updates, and timeout logic.
 * All transitions are deterministic and based on the authored scenario graph.
 */

import type {
  Scenario,
  SimulationState,
  VitalSigns,
  VitalDelta,
  RunHistoryEntry,
} from '@/lib/types';
import { getCurrentNode, getChoiceById, isEndState } from './machine';

/**
 * Apply vital sign deltas to current vitals
 * 
 * @param currentVitals - Current vital signs
 * @param delta - Delta object with string values like "+5" or "-10"
 * @returns Updated vital signs
 */
export function applyVitalDeltas(
  currentVitals: VitalSigns,
  delta: VitalDelta
): VitalSigns {
  const newVitals = { ...currentVitals };

  // Apply each delta if present
  if (delta.hr) {
    newVitals.hr = applyDelta(currentVitals.hr, delta.hr);
  }
  if (delta.bp_sys) {
    newVitals.bp_sys = applyDelta(currentVitals.bp_sys, delta.bp_sys);
  }
  if (delta.bp_dia) {
    newVitals.bp_dia = applyDelta(currentVitals.bp_dia, delta.bp_dia);
  }
  if (delta.rr) {
    newVitals.rr = applyDelta(currentVitals.rr, delta.rr);
  }
  if (delta.spo2) {
    newVitals.spo2 = applyDelta(currentVitals.spo2, delta.spo2);
  }

  return newVitals;
}

/**
 * Apply a single delta value to a number
 * 
 * @param current - Current value
 * @param deltaStr - Delta string like "+5" or "-10"
 * @returns Updated value
 */
function applyDelta(current: number, deltaStr: string): number {
  const delta = parseInt(deltaStr, 10);
  if (isNaN(delta)) {
    console.warn(`Invalid delta value: ${deltaStr}`);
    return current;
  }
  return current + delta;
}

/**
 * Apply an action transition to the state
 * 
 * @param state - Current simulation state
 * @param actionId - The action/choice ID to apply
 * @param scenario - The scenario definition
 * @param uncertainty - Optional uncertainty/confidence value (0-1)
 * @param teachback - Optional teachback answer
 * @returns New state after transition
 */
export function applyTransition(
  state: SimulationState,
  actionId: string,
  scenario: Scenario,
  uncertainty?: number,
  teachback?: string
): SimulationState {
  // Get the choice from current node
  const choice = getChoiceById(state, scenario, actionId);
  
  if (!choice) {
    throw new Error(`Action "${actionId}" not found in current node "${state.nodeId}"`);
  }

  // Get next node ID
  const nextNodeId = choice.next;
  const nextNode = scenario.nodes[nextNodeId];

  // Calculate new vitals
  let newVitals = { ...state.vitals };
  
  // Apply delta if present
  if (choice.delta) {
    newVitals = applyVitalDeltas(newVitals, choice.delta);
  }
  
  // Or use target vitals if specified in next node
  if (nextNode && nextNode.vitals_target) {
    newVitals = { ...nextNode.vitals_target };
  } else if (nextNode && nextNode.vitals) {
    // Use node's vitals if no target specified
    newVitals = { ...nextNode.vitals };
  }

  // Update checklist
  const newChecklist = [...state.checklist];
  if (choice.ticks) {
    choice.ticks.forEach(itemId => {
      if (!newChecklist.includes(itemId)) {
        newChecklist.push(itemId);
      }
    });
  }

  // Calculate elapsed time in seconds
  const elapsedSeconds = Math.floor((Date.now() - state.startedAt) / 1000);

  // Determine if action was correct
  const correct = scenario.scoring?.correct?.[state.nodeId]?.includes(actionId) ?? false;

  // Create history entry
  const historyEntry: RunHistoryEntry = {
    t: elapsedSeconds,
    nodeId: state.nodeId,
    actionId,
    correct,
  };

  if (uncertainty !== undefined) {
    historyEntry.uncertainty = uncertainty;
  }
  if (teachback !== undefined) {
    historyEntry.teachback = teachback;
  }

  // Get timer for next node
  const nextTimer = nextNode?.time_limit_sec || 0;

  // Create new state
  const newState: SimulationState = {
    ...state,
    nodeId: nextNodeId,
    vitals: newVitals,
    timer: nextTimer,
    checklist: newChecklist,
    history: [...state.history, historyEntry],
  };

  return newState;
}

/**
 * Apply a timeout transition to the state
 * 
 * @param state - Current simulation state
 * @param scenario - The scenario definition
 * @returns New state after timeout
 */
export function applyTimeout(
  state: SimulationState,
  scenario: Scenario
): SimulationState {
  const currentNode = getCurrentNode(state, scenario);
  
  if (!currentNode.timeout_next) {
    throw new Error(`Node "${state.nodeId}" has no timeout_next defined`);
  }

  const nextNodeId = currentNode.timeout_next;
  const nextNode = scenario.nodes[nextNodeId];

  // Keep current vitals or use next node's vitals
  let newVitals = { ...state.vitals };
  if (nextNode && nextNode.vitals) {
    newVitals = { ...nextNode.vitals };
  }

  // Calculate elapsed time in seconds
  const elapsedSeconds = Math.floor((Date.now() - state.startedAt) / 1000);

  // Create timeout history entry
  const historyEntry: RunHistoryEntry = {
    t: elapsedSeconds,
    nodeId: state.nodeId,
    actionId: '_TIMEOUT_',
    correct: false, // Timeouts are never correct
  };

  // Get timer for next node
  const nextTimer = nextNode?.time_limit_sec || 0;

  // Create new state
  const newState: SimulationState = {
    ...state,
    nodeId: nextNodeId,
    vitals: newVitals,
    timer: nextTimer,
    history: [...state.history, historyEntry],
  };

  return newState;
}

/**
 * Update timer by decrementing
 * 
 * @param state - Current simulation state
 * @param deltaSeconds - Seconds to subtract
 * @returns New state with updated timer
 */
export function updateTimer(
  state: SimulationState,
  deltaSeconds: number
): SimulationState {
  return {
    ...state,
    timer: Math.max(0, state.timer - deltaSeconds),
  };
}

/**
 * Check if current state is an end state
 * 
 * @param state - Current simulation state
 * @param scenario - The scenario definition
 * @returns True if in end state
 */
export function isInEndState(
  state: SimulationState,
  scenario: Scenario
): boolean {
  return isEndState(state.nodeId, scenario);
}

/**
 * Mark simulation as ended
 * 
 * @param state - Current simulation state
 * @returns State with endedAt timestamp
 */
export function endSimulation(state: SimulationState): SimulationState {
  return {
    ...state,
    endedAt: Date.now(),
  };
}

/**
 * Add a hint usage to the state
 * 
 * @param state - Current simulation state
 * @returns State with incremented hints
 */
export function useHint(state: SimulationState): SimulationState {
  return {
    ...state,
    hintsUsed: state.hintsUsed + 1,
  };
}

/**
 * Get the outcome description for the current end state
 * 
 * @param state - Current simulation state
 * @param scenario - The scenario definition
 * @returns Outcome description or null if not in end state
 */
export function getOutcome(
  state: SimulationState,
  scenario: Scenario
): string | null {
  if (!isInEndState(state, scenario)) {
    return null;
  }
  
  const endState = scenario.end_states[state.nodeId];
  return endState?.outcome || 'Simulation ended';
}
