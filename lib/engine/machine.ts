/**
 * FSM Machine - Core State Machine Logic
 * Phase 2: Deterministic FSM Engine
 * 
 * This module handles scenario initialization and state management.
 * The FSM ensures deterministic, reliable behavior without LLM control.
 */

import type {
  Scenario,
  SimulationState,
  SimulationMode,
  Node,
  Choice,
  VitalSigns,
} from '@/lib/types';

/**
 * Initialize a new simulation state from a scenario
 * 
 * @param scenario - The scenario to initialize
 * @param mode - 'teaching' or 'exam' mode
 * @returns Initial simulation state
 */
export function initializeScenario(
  scenario: Scenario,
  mode: SimulationMode
): SimulationState {
  // Get the initial node
  const initialNode = scenario.nodes[scenario.initial_state];
  
  if (!initialNode) {
    throw new Error(`Initial state "${scenario.initial_state}" not found in scenario nodes`);
  }

  // Set initial vitals from the starting node
  const initialVitals: VitalSigns = initialNode.vitals || {
    hr: 0,
    bp_sys: 0,
    bp_dia: 0,
    rr: 0,
    spo2: 0,
  };

  // Get initial time limit
  const initialTimeLimit = initialNode.time_limit_sec || 0;

  const state: SimulationState = {
    nodeId: scenario.initial_state,
    vitals: { ...initialVitals },
    timer: initialTimeLimit,
    checklist: [],
    history: [],
    mode,
    hintsUsed: 0,
    startedAt: Date.now(),
  };

  return state;
}

/**
 * Get the current node object from the scenario
 * 
 * @param state - Current simulation state
 * @param scenario - The scenario definition
 * @returns Current node object
 */
export function getCurrentNode(
  state: SimulationState,
  scenario: Scenario
): Node {
  const node = scenario.nodes[state.nodeId];
  
  if (!node) {
    throw new Error(`Node "${state.nodeId}" not found in scenario`);
  }
  
  return node;
}

/**
 * Get available choices for the current node
 * 
 * @param state - Current simulation state
 * @param scenario - The scenario definition
 * @returns Array of available choices
 */
export function getAvailableChoices(
  state: SimulationState,
  scenario: Scenario
): Choice[] {
  const currentNode = getCurrentNode(state, scenario);
  return currentNode.choices || [];
}

/**
 * Get a specific choice by ID from the current node
 * 
 * @param state - Current simulation state
 * @param scenario - The scenario definition
 * @param choiceId - The choice ID to find
 * @returns The choice object or null if not found
 */
export function getChoiceById(
  state: SimulationState,
  scenario: Scenario,
  choiceId: string
): Choice | null {
  const choices = getAvailableChoices(state, scenario);
  return choices.find(choice => choice.id === choiceId) || null;
}

/**
 * Check if a node is an end state
 * 
 * @param nodeId - The node ID to check
 * @param scenario - The scenario definition
 * @returns True if the node is an end state
 */
export function isEndState(nodeId: string, scenario: Scenario): boolean {
  return nodeId in scenario.end_states;
}

/**
 * Get time remaining in current node
 * 
 * @param state - Current simulation state
 * @returns Time remaining in seconds
 */
export function getTimeRemaining(state: SimulationState): number {
  return Math.max(0, state.timer);
}

/**
 * Check if the current node has timed out
 * 
 * @param state - Current simulation state
 * @returns True if timer has reached 0
 */
export function hasTimedOut(state: SimulationState): boolean {
  return state.timer <= 0;
}

/**
 * Get the elapsed time since simulation start
 * 
 * @param state - Current simulation state
 * @returns Elapsed time in seconds
 */
export function getElapsedTime(state: SimulationState): number {
  const now = Date.now();
  return Math.floor((now - state.startedAt) / 1000);
}

/**
 * Validate that a scenario is properly structured
 * 
 * @param scenario - The scenario to validate
 * @returns Object with validation results
 */
export function validateScenario(scenario: Scenario): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!scenario.id) errors.push('Scenario must have an id');
  if (!scenario.title) errors.push('Scenario must have a title');
  if (!scenario.initial_state) errors.push('Scenario must have an initial_state');
  
  // Check initial state exists
  if (scenario.initial_state && !scenario.nodes[scenario.initial_state]) {
    errors.push(`Initial state "${scenario.initial_state}" not found in nodes`);
  }

  // Check all nodes
  Object.entries(scenario.nodes).forEach(([nodeId, node]) => {
    // Check choices
    if (!node.choices || node.choices.length === 0) {
      if (!isEndState(nodeId, scenario)) {
        errors.push(`Node "${nodeId}" has no choices and is not an end state`);
      }
    }

    // Check choice references
    node.choices?.forEach((choice, idx) => {
      if (!choice.id) {
        errors.push(`Choice ${idx} in node "${nodeId}" has no id`);
      }
      if (!choice.label) {
        errors.push(`Choice "${choice.id}" in node "${nodeId}" has no label`);
      }
      if (!choice.next) {
        errors.push(`Choice "${choice.id}" in node "${nodeId}" has no next node`);
      } else if (!scenario.nodes[choice.next] && !isEndState(choice.next, scenario)) {
        errors.push(`Choice "${choice.id}" references non-existent node "${choice.next}"`);
      }
    });

    // Check timeout reference
    if (node.timeout_next && !scenario.nodes[node.timeout_next] && !isEndState(node.timeout_next, scenario)) {
      errors.push(`Node "${nodeId}" timeout_next references non-existent node "${node.timeout_next}"`);
    }
  });

  // Check end states exist
  if (!scenario.end_states || Object.keys(scenario.end_states).length === 0) {
    errors.push('Scenario must have at least one end state');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
