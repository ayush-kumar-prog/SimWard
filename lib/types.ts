/**
 * SimWard - Core TypeScript Type Definitions
 * Phase 1: Foundation Types
 */

// ============================================================================
// VITAL SIGNS
// ============================================================================

export interface VitalSigns {
  hr: number;        // Heart rate (bpm)
  bp_sys: number;    // Systolic blood pressure (mmHg)
  bp_dia: number;    // Diastolic blood pressure (mmHg)
  rr: number;        // Respiratory rate (breaths/min)
  spo2: number;      // Oxygen saturation (%)
}

export interface VitalDelta {
  hr?: string;       // e.g., "+5" or "-10"
  bp_sys?: string;
  bp_dia?: string;
  rr?: string;
  spo2?: string;
}

// ============================================================================
// SCENARIO STRUCTURE
// ============================================================================

export interface Choice {
  id: string;                      // Unique action identifier
  label: string;                   // Human-readable action label
  next: string;                    // Next node ID
  delta?: VitalDelta;             // Vital sign changes
  ticks?: string[];               // Checklist items to tick
  ask_uncertainty?: boolean;       // Prompt for confidence rating
  teachback_id?: string;          // Reference to teachback prompt
  caption_key?: string;           // Fallback caption key
  voice_aliases?: string[];       // Alternative phrasings for voice recognition
}

export interface Node {
  scene: string;                   // Background image path
  video?: string | null;          // Optional video clip path
  vitals?: VitalSigns;            // Starting vitals for this node
  vitals_target?: VitalSigns;     // Target vitals (alternative to delta)
  evidence?: string[];            // Array of evidence image paths
  choices: Choice[];              // Available actions
  time_limit_sec?: number;        // Time limit for this node
  timeout_next?: string;          // Node to transition to on timeout
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface TeachBack {
  prompt: string;                 // Question to ask (≤10 words)
  rubric: string[];              // Key concepts/keywords for grading
}

export interface EndState {
  outcome: string;                // Description of outcome
}

export interface ScoringWeights {
  timing: number;                 // Weight for timing score (0-100)
  correctness: number;            // Weight for correctness score (0-100)
  completeness: number;           // Weight for completeness score (0-100)
  calibration: number;            // Weight for calibration score (0-100)
}

export interface TimingBucket {
  [key: string]: number;          // e.g., "<=30": 20, "<=60": 15, ">60": 0
}

export interface ScoringRules {
  weights: ScoringWeights;
  timers: Record<string, TimingBucket>;                    // Action ID -> timing buckets
  correct: Record<string, string[]>;                       // Node ID -> correct action IDs
  completeness: {
    checklist: Record<string, number>;                     // Checklist item ID -> points
    teachback_pass: number;                                // Points for passing teachback
    hint_penalty: number;                                  // Penalty per hint used
  };
}

export interface Scenario {
  id: string;
  title: string;
  initial_state: string;                                   // Starting node ID
  mode_defaults: {
    teaching: boolean;
    exam: boolean;
  };
  checklist: ChecklistItem[];
  teachbacks: Record<string, TeachBack>;
  nodes: Record<string, Node>;
  end_states: Record<string, EndState>;
  captions: Record<string, string>;                        // Fallback captions
  scoring: ScoringRules;
}

// ============================================================================
// SIMULATION STATE
// ============================================================================

export type SimulationMode = 'teaching' | 'exam';

export interface SimulationState {
  nodeId: string;                                         // Current node
  vitals: VitalSigns;                                     // Current vital signs
  timer: number;                                          // Time remaining (seconds)
  checklist: string[];                                    // Ticked checklist item IDs
  history: RunHistoryEntry[];                            // Action history
  mode: SimulationMode;
  hintsUsed: number;
  startedAt: number;                                      // Timestamp (ms)
  endedAt?: number;                                       // Timestamp (ms)
}

// ============================================================================
// RUN HISTORY & ANALYTICS
// ============================================================================

export interface RunHistoryEntry {
  t: number;                      // Time since start (seconds)
  nodeId: string;
  actionId: string;
  uncertainty?: number;           // Confidence rating (0-1)
  teachback?: string;            // User's teachback answer
  correct?: boolean;             // Whether action was correct
}

export interface RunMetrics {
  timeToCritical?: number;        // Time to first critical action (seconds)
  branch: 'good' | 'delay' | 'timeout';
  checklistTicks: string[];
  usedHints: number;
  teachbackPasses: number;
  totalTeachbacks: number;
}

export interface ScoreBreakdown {
  total: number;
  timing: number;
  correctness: number;
  completeness: number;
  calibration: number;
}

export interface Run {
  runId: string;
  scenarioId: string;
  mode: SimulationMode;
  startedAt: number;
  endedAt: number;
  history: RunHistoryEntry[];
  metrics: RunMetrics;
  score: ScoreBreakdown;
}

// ============================================================================
// STORAGE INTERFACE
// ============================================================================

export interface RunStoreOptions {
  limit?: number;
  scenarioId?: string;
  mode?: SimulationMode;
}

export interface RunStore {
  saveRun(run: Run): Promise<void>;
  listRuns(opts?: RunStoreOptions): Promise<Run[]>;
  getRun(runId: string): Promise<Run | null>;
  deleteRun(runId: string): Promise<void>;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ParseActionRequest {
  transcript: string;
  allowed: Array<{
    id: string;
    label: string;
    aliases?: string[];
  }>;
}

export interface ParseActionResponse {
  actionId?: string;
  confidence?: number;
  error?: string;
  suggestions?: Array<{
    id: string;
    label: string;
  }>;
}

export interface CaptionRequest {
  scenario_id: string;
  node_id: string;
  last_action: string;
  state_snapshot: VitalSigns;
  rubric_snippets?: string[];
  fallback_key: string;
}

export interface CaptionResponse {
  caption: string;
}

export interface DebriefRequest {
  history: RunHistoryEntry[];
  scores: ScoreBreakdown;
  outcome: string;
  top_misses?: string[];
}

export interface DebriefResponse {
  headline: string;
  strengths: string[];
  misses: string[];
  tip: string;
  narrative: string;
}

export interface RecordRunRequest {
  run: Run;
}

export interface RecordRunResponse {
  success: boolean;
  runId: string;
  error?: string;
}

// ============================================================================
// UI COMPONENT PROPS
// ============================================================================

export interface VitalSignsDisplayProps {
  vitals: VitalSigns;
  animated?: boolean;
}

export interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  onTimeout: () => void;
}

export interface MicButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export interface ActionFeedbackProps {
  action: Choice | null;
  confirmed: boolean;
}

export interface CaptionDisplayProps {
  caption: string;
  visible: boolean;
}

export interface DebriefPanelProps {
  debrief: DebriefResponse;
  scores: ScoreBreakdown;
}

export interface ChecklistPanelProps {
  items: ChecklistItem[];
  ticked: string[];
}

export interface EvidenceOverlayProps {
  images: string[];
}

export interface ECGWaveformProps {
  hr: number;
  rhythm?: 'normal' | 'tachycardia' | 'bradycardia';
}

// ============================================================================
// TEACHBACK GRADING
// ============================================================================

export interface TeachbackGradeRequest {
  userAnswer: string;
  rubric: string[];
}

export interface TeachbackGradeResponse {
  pass: boolean;
  score: number;
  feedback?: string;
}

// ============================================================================
// ANALYTICS AGGREGATIONS
// ============================================================================

export interface AnalyticsSummary {
  totalRuns: number;
  medianTimeToCritical: number;
  passRate: number;                // Percentage
  avgCalibration: number;          // 0-100
  avgHintUsage: number;
  topMisses: Array<{
    action: string;
    count: number;
  }>;
}

export interface ScenarioStats {
  scenarioId: string;
  scenarioTitle: string;
  totalRuns: number;
  avgScore: number;
  medianScore: number;
  passRate: number;
}

// ============================================================================
// VOICE RECOGNITION
// ============================================================================

export interface SpeechRecognitionConfig {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  maxAlternatives?: number;
}

export interface TranscriptResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

// ============================================================================
// ANIMATION
// ============================================================================

export interface AnimationConfig {
  duration: number;              // milliseconds
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic';
}

export interface VitalAnimationState {
  current: VitalSigns;
  target: VitalSigns;
  progress: number;
}

// ============================================================================
// AUTHORING TOOL
// ============================================================================

export interface ScenarioValidationError {
  field: string;
  message: string;
  path?: string;
}

export interface ScenarioValidationResult {
  valid: boolean;
  errors: ScenarioValidationError[];
  warnings?: string[];
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type { };  // Ensure this file is treated as a module

