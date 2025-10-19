/**
 * Scenario Loader
 * Phase 7: Load and validate scenario JSON files
 */

import { z } from 'zod';
import type { Scenario } from '../types';

// Zod schema for runtime validation
const VitalSignsSchema = z.object({
  hr: z.number(),
  bp_sys: z.number(),
  bp_dia: z.number(),
  rr: z.number(),
  spo2: z.number(),
});

const VitalDeltaSchema = z.object({
  hr: z.string().optional(),
  bp_sys: z.string().optional(),
  bp_dia: z.string().optional(),
  rr: z.string().optional(),
  spo2: z.string().optional(),
});

const ChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  next: z.string(),
  delta: VitalDeltaSchema.optional(),
  ticks: z.array(z.string()).optional(),
  ask_uncertainty: z.boolean().optional(),
  teachback_id: z.string().optional(),
  caption_key: z.string().optional(),
  voice_aliases: z.array(z.string()).optional(),
});

const NodeSchema = z.object({
  scene: z.string(),
  video: z.string().nullable().optional(),
  vitals: VitalSignsSchema.optional(),
  vitals_target: VitalSignsSchema.optional(),
  evidence: z.array(z.string()).optional(),
  choices: z.array(ChoiceSchema),
  time_limit_sec: z.number().optional(),
  timeout_next: z.string().optional(),
});

const ChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
});

const TeachBackSchema = z.object({
  prompt: z.string(),
  rubric: z.array(z.string()),
});

const EndStateSchema = z.object({
  outcome: z.string(),
});

const ScoringWeightsSchema = z.object({
  timing: z.number(),
  correctness: z.number(),
  completeness: z.number(),
  calibration: z.number(),
});

const ScoringRulesSchema = z.object({
  weights: ScoringWeightsSchema,
  timers: z.record(z.record(z.number())),
  correct: z.record(z.array(z.string())),
  completeness: z.object({
    checklist: z.record(z.number()),
    teachback_pass: z.number(),
    hint_penalty: z.number(),
  }),
});

const ScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  initial_state: z.string(),
  mode_defaults: z.object({
    teaching: z.boolean(),
    exam: z.boolean(),
  }),
  checklist: z.array(ChecklistItemSchema),
  teachbacks: z.record(TeachBackSchema),
  nodes: z.record(NodeSchema),
  end_states: z.record(EndStateSchema),
  captions: z.record(z.string()),
  scoring: ScoringRulesSchema,
});

/**
 * Validate a scenario object against the schema
 * @param data - Raw JSON data to validate
 * @returns Validated Scenario object
 * @throws Error if validation fails
 */
export function validateScenario(data: unknown): Scenario {
  try {
    const validated = ScenarioSchema.parse(data);
    return validated as Scenario;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join('; ');
      throw new Error(`Scenario validation failed: ${issues}`);
    }
    throw error;
  }
}

/**
 * Check if a scenario is structurally valid
 * Validates that all node references exist, no broken links, etc.
 * @param scenario - Validated scenario object
 * @returns Array of warning messages (empty if all good)
 */
export function checkScenarioIntegrity(scenario: Scenario): string[] {
  const warnings: string[] = [];
  const nodeIds = Object.keys(scenario.nodes);
  const endStateIds = Object.keys(scenario.end_states);
  const allValidTargets = [...nodeIds, ...endStateIds];

  // Check initial_state exists
  if (!allValidTargets.includes(scenario.initial_state)) {
    warnings.push(`Initial state "${scenario.initial_state}" not found in nodes or end_states`);
  }

  // Check all node transitions
  Object.entries(scenario.nodes).forEach(([nodeId, node]) => {
    // Check timeout_next if it exists
    if (node.timeout_next && !allValidTargets.includes(node.timeout_next)) {
      warnings.push(`Node "${nodeId}" timeout_next "${node.timeout_next}" does not exist`);
    }

    // Check all choice.next targets
    node.choices.forEach((choice, idx) => {
      if (!allValidTargets.includes(choice.next)) {
        warnings.push(`Node "${nodeId}" choice[${idx}] "${choice.id}" points to non-existent target "${choice.next}"`);
      }

      // Check caption_key exists
      if (choice.caption_key && !scenario.captions[choice.caption_key]) {
        warnings.push(`Node "${nodeId}" choice "${choice.id}" references missing caption "${choice.caption_key}"`);
      }

      // Check teachback_id exists
      if (choice.teachback_id && !scenario.teachbacks[choice.teachback_id]) {
        warnings.push(`Node "${nodeId}" choice "${choice.id}" references missing teachback "${choice.teachback_id}"`);
      }

      // Check checklist items exist
      choice.ticks?.forEach(tickId => {
        const checklistItem = scenario.checklist.find(item => item.id === tickId);
        if (!checklistItem) {
          warnings.push(`Node "${nodeId}" choice "${choice.id}" ticks non-existent checklist item "${tickId}"`);
        }
      });
    });
  });

  // Check scoring references
  Object.entries(scenario.scoring.correct).forEach(([nodeId, actionIds]) => {
    if (!scenario.nodes[nodeId]) {
      warnings.push(`Scoring correct["${nodeId}"] references non-existent node`);
    } else {
      const node = scenario.nodes[nodeId];
      const validActionIds = node.choices.map(c => c.id);
      actionIds.forEach(actionId => {
        if (!validActionIds.includes(actionId)) {
          warnings.push(`Scoring correct["${nodeId}"] lists non-existent action "${actionId}"`);
        }
      });
    }
  });

  return warnings;
}

/**
 * Load a scenario from JSON file
 * @param scenarioId - ID of the scenario to load
 * @returns Promise<Scenario>
 * @throws Error if file not found or validation fails
 */
export async function loadScenario(scenarioId: string): Promise<Scenario> {
  try {
    // In Next.js, we fetch from the public directory or use dynamic import
    const response = await fetch(`/scenarios/${scenarioId}.json`);
    
    if (!response.ok) {
      throw new Error(`Scenario "${scenarioId}" not found (HTTP ${response.status})`);
    }

    const data = await response.json();
    const scenario = validateScenario(data);

    // Check integrity and log warnings
    const warnings = checkScenarioIntegrity(scenario);
    if (warnings.length > 0) {
      console.warn(`Scenario "${scenarioId}" has integrity warnings:`, warnings);
    }

    return scenario;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load scenario "${scenarioId}": ${error.message}`);
    }
    throw error;
  }
}

/**
 * Load a scenario from a JSON string (for testing or dynamic scenarios)
 * @param jsonString - JSON string containing scenario data
 * @returns Scenario object
 */
export function loadScenarioFromString(jsonString: string): Scenario {
  try {
    const data = JSON.parse(jsonString);
    return validateScenario(data);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * List all available scenarios
 * Note: In a real app, this would scan the scenarios directory
 * For now, we return a hardcoded list
 * @returns Promise<string[]> - Array of scenario IDs
 */
export async function listScenarios(): Promise<string[]> {
  // In production, this could:
  // 1. Fetch from an API endpoint that lists files
  // 2. Use a manifest file
  // 3. Scan the scenarios directory server-side
  
  // For MVP, return known scenarios
  return ['anaphylaxis_pacu_v1'];
}

/**
 * Get scenario metadata without loading full scenario
 * @param scenarioId - ID of the scenario
 * @returns Promise with basic metadata
 */
export async function getScenarioMetadata(scenarioId: string): Promise<{
  id: string;
  title: string;
  nodeCount: number;
  estimatedDuration: number;
}> {
  const scenario = await loadScenario(scenarioId);
  
  return {
    id: scenario.id,
    title: scenario.title,
    nodeCount: Object.keys(scenario.nodes).length,
    estimatedDuration: Object.values(scenario.nodes).reduce(
      (sum, node) => sum + (node.time_limit_sec || 60),
      0
    ),
  };
}

