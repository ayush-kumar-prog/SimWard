# SimWard Implementation Plan
**Voice-First Clinical Micro-Simulation Platform**

---

## 📊 Implementation Status (Quick Reference)

**Last Updated**: October 2024  
**Current Phase**: 7 of 13 Complete  
**MVP Progress**: 70%  
**Status**: ✅ All core backend systems operational, ready for Phase 8 UI integration

### Phases at a Glance

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Project Foundation | ✅ **COMPLETE** | TypeScript types, Next.js setup, directory structure |
| 2. FSM Engine | ✅ **COMPLETE** | Deterministic state machine, transitions, history |
| 3. Voice Interface | ✅ **COMPLETE** | Web Speech API, fuzzy matching, action parsing |
| 4. Visual Rendering | ✅ **COMPLETE** | Vital signs, ECG waveform, animations, timers |
| 5. Gemini AI | ✅ **COMPLETE** | Caption generation, debrief, teach-back grading |
| 6. Scoring System | ✅ **COMPLETE** | Timing, correctness, completeness, calibration |
| 7. Scenario System | ✅ **COMPLETE** | JSON loading, Zod validation, asset preloading |
| 8. Main UI | 🚧 **NEXT** | Runner page, integrate all systems |
| 9. Data Persistence | 📋 TODO | localStorage wrapper, optional Supabase |
| 10. Analytics | 📋 TODO | Performance dashboard, metrics visualization |
| 11. Evidence Overlays | 📋 TODO | Image/video evidence display system |
| 12. Testing & Polish | 📋 TODO | End-to-end tests, UX refinements |
| 13. Deployment | 📋 TODO | Production build, Vercel deployment |

### Working Features

✅ **Test Pages Available** (all functional at http://localhost:3000):
- `/test-scenario` - Scenario loading & validation (Phase 7)
- `/test-scoring` - Scoring algorithm demos (Phase 6)
- `/test-gemini` - AI caption & debrief generation (Phase 5)
- `/visual-demo` - Monitor animations & ECG (Phase 4)
- `/test` - Voice input integration (Phase 3)

✅ **Core Systems Operational**:
- FSM engine with state management
- Voice recognition with fuzzy matching
- Gemini 2.5 Flash AI integration
- Complete scoring algorithms
- Scenario JSON loading (10-node anaphylaxis example)
- Asset preloading system

### Key Decisions Made

1. **Gemini 2.5 Flash** (not 1.5) - handles thinking tokens, requires higher limits
2. **Zod 3.x** (not 4.x) - stable version for runtime validation
3. **Scenarios in /public/** - required for Next.js static serving
4. **Edge Functions** - low-latency API routes with timeouts + fallbacks
5. **Web Speech API** - client-side STT (Chrome recommended)

### Next Immediate Steps (Phase 8)

1. Build `/app/sim/runner/page.tsx` main UI
2. Integrate voice, visuals, FSM, AI systems
3. Implement teaching mode + exam mode
4. Display end state + debrief
5. Connect all existing components

---

## Project Overview

### What is SimWard?
SimWard is a voice-first clinical micro-simulation platform for medical training where doctors practice emergency scenarios by speaking actions instead of clicking buttons.

### Core Architecture
- **Frontend**: Next.js 14 + TypeScript + TailwindCSS + Framer Motion
- **Backend**: Vercel Edge Functions for low-latency API routes
- **AI**: Gemini for explanations and debrief (NOT for controlling simulation flow)
- **State Management**: Deterministic Finite State Machine (FSM)
- **Voice Input**: Browser Web Speech API (client-side STT)
- **Storage**: localStorage (MVP) with optional Supabase

### Key Innovation
The LLM never controls simulation transitions (safety-critical). It only:
- Maps speech to predefined actions
- Explains clinical decisions
- Generates educational feedback

### Core Features
1. **Voice-First Interaction**: Push-to-talk, speech-to-action mapping
2. **Deterministic Branching**: Authored FSM ensures reliable, judge-proof simulations
3. **Instant Visual Feedback**: Real-time vital signs, ECG animations, monitor displays
4. **Two Modes**:
   - **Teaching Mode**: Real-time feedback, confidence ratings, teach-backs, captions
   - **Exam Mode**: Timed assessment, debrief only at end
5. **Analytics**: Timing, correctness, completeness, calibration (confidence vs accuracy)

### Use Cases
- **UC1 - Teaching Mode**: Trainee speaks actions → system confirms → shows monitor reaction → Gemini explains why it matters → end debrief with scores
- **UC2 - Exam Mode**: Same voice flow, no hints, hard timers, debrief only at end
- **UC3 - Analytics**: Time-to-critical-action, branch analysis, checklist completion, teach-back pass rate, calibration metrics

---

## Implementation Phases

### Phase 1: Project Foundation & Infrastructure
**Goal**: Set up development environment and define core data structures.

**Context**: This is the first phase. No dependencies. Establishes the foundation for all subsequent work.

**Tasks**:
1. Initialize Next.js 14 project with TypeScript and App Router
2. Install dependencies: TailwindCSS, Framer Motion, XState (or state management library)
3. Create directory structure:
   ```
   app/
     sim/runner/page.tsx
     sim/author/page.tsx
     analytics/page.tsx
     api/parse-action/route.ts
     api/caption/route.ts
     api/debrief/route.ts
     api/record-run/route.ts
   lib/
     engine/{machine.ts, transition.ts, scoring.ts}
     voice/{stt.ts, match.ts}
     anim/{monitor.ts, easing.ts}
     llm/{caption.ts, debrief.ts}
     storage/store.ts
   scenarios/
   public/{bg/, monitor/, evidence/, video/}
   ```
4. Define TypeScript interfaces in `lib/types.ts`:
   - `Scenario`: nodes, choices, vitals, timeouts, scoring, checklist, teachbacks, captions
   - `Node`: scene, vitals, evidence, choices, time_limit_sec, timeout_next
   - `Choice`: id, label, next, delta, ticks, voice_aliases, caption_key
   - `VitalSigns`: {hr, bp_sys, bp_dia, rr, spo2}
   - `Run`: runId, scenarioId, mode, startedAt, endedAt, history, metrics, score
   - `RunHistory`: {t, nodeId, actionId, uncertainty?, teachback?, correct?}
   - `ChecklistItem`, `TeachBack`, `RunStore` interface
5. Create `.env.local` template with `GEMINI_API_KEY`, optional `SUPABASE_URL`, `SUPABASE_KEY`

**Deliverables**: 
- Working Next.js app skeleton
- Complete TypeScript type definitions
- Directory structure matching spec
- Environment configuration

**Validation**: Run `npm run dev` successfully, TypeScript compiles without errors

---

### Phase 2: Deterministic FSM Engine
**Goal**: Build the core state machine that powers simulation logic.

**Dependencies**: Requires Phase 1 (type definitions, project structure)

**Context**: This is the simulation's brain. All scenario navigation happens here. FSM ensures deterministic, reliable behavior. No LLM controls transitions.

**Tasks**:
1. Implement `/lib/engine/machine.ts`:
   - Function `initializeScenario(scenario: Scenario, mode: 'teaching'|'exam')`: Returns initial state object
   - Function `getCurrentNode(state, scenario)`: Returns current node object
   - Function `getAvailableChoices(state, scenario)`: Returns array of valid choices for current node
   - State shape: `{nodeId, vitals, timer, checklist, history, mode, hintsUsed, startedAt}`
2. Implement `/lib/engine/transition.ts`:
   - Function `applyTransition(state, actionId, scenario)`: 
     - Find choice by actionId in current node's choices array
     - Get `nextNodeId` from choice.next
     - Apply vital deltas: if choice has `delta`, compute new vitals; if node has `vitals_target`, use that
     - Tick checklist items from choice.ticks array
     - Record in history: `{t: Date.now() - startedAt, nodeId, actionId}`
     - Return new state with updated nodeId, vitals, checklist, history
   - Function `applyTimeout(state, scenario)`:
     - Get current node's `timeout_next`
     - Transition to that node
     - Record timeout in history
   - Function `isEndState(nodeId, scenario)`: Check if nodeId is in scenario.end_states
3. Implement timer system:
   - Timer countdown per node using `time_limit_sec`
   - Track `timeRemaining` in state
   - When timer reaches 0, automatically call `applyTimeout()`
4. Write unit tests for FSM logic with mock scenario data

**Deliverables**:
- FSM engine that navigates scenario graph deterministically
- Transition function that applies state changes
- Timeout handling
- History tracking
- Unit tests passing

**Validation**: Given mock scenario, verify correct node transitions, vital changes, checklist updates, timeout branches

---

### Phase 3: Voice Interface & Action Parsing
**Goal**: Enable voice input and map speech to allowed actions.

**Dependencies**: Requires Phase 2 (FSM to provide allowed actions)

**Context**: Voice is the primary input method. Must handle medical terminology, ambiguity, and mismatches gracefully.

**Tasks**:
1. Implement `/lib/voice/stt.ts`:
   - Function `initializeSpeechRecognition()`: Set up Web Speech API
   - Function `startListening(onTranscript: (text: string) => void)`: Begin capture
   - Function `stopListening()`: End capture
   - Handle browser compatibility (check for `webkitSpeechRecognition`)
   - Event handlers for results, errors
   - Return transcript as string
2. Implement `/lib/voice/match.ts`:
   - Function `matchActionToTranscript(transcript, allowedActions)`:
     - Input: `transcript: string`, `allowedActions: {id, label, aliases}[]`
     - Normalize transcript: lowercase, remove filler words ("um", "uh")
     - For each action, compute similarity score:
       - Check token overlap between transcript and (label + aliases)
       - Use fuzzy string matching (Levenshtein distance or similar)
     - Return best match if score > threshold (e.g., 0.7)
     - If multiple actions score > threshold and within 0.1 of each other: return disambiguation needed
     - If all scores < threshold: return "no match"
   - Function `disambiguate(transcript, topCandidates)`: Handle "option 1", "option 2", or repeat of label
3. Create `/app/api/parse-action/route.ts` (Edge function):
   - Mark with `export const runtime = "edge"`
   - Input schema: `{transcript: string, allowed: [{id, label, aliases}]}`
   - Call matching logic from `/lib/voice/match.ts`
   - Output schema: `{actionId: string, confidence: number}` or `{error: string, suggestions: [{id, label}]}`
   - Handle errors gracefully
   - Set 1200ms timeout
4. Add push-to-talk UI component:
   - Space bar press/release to start/stop recording
   - Visual feedback (mic button animates while listening)
   - Display interim transcript

**Deliverables**:
- Web Speech API integration
- Fuzzy matching algorithm for medical terms
- API endpoint for speech-to-action parsing
- Disambiguation flow
- Push-to-talk UI component

**Validation**: Test with medical phrases, verify correct action mapping, test disambiguation with ambiguous inputs

---

### Phase 4: Visual Rendering & Monitor Animations
**Goal**: Create medical monitor UI with animated vital signs and ECG.

**Dependencies**: Requires Phase 2 (vitals data from state)

**Context**: Visual feedback must be instant (<200ms) and smooth. Animations create realistic medical monitor feel.

**Tasks**:
1. Implement `/lib/anim/easing.ts`:
   - Function `easeInOutCubic(t)`: Standard easing curve
   - Function `interpolateVitals(startVitals, endVitals, progress)`: Calculate intermediate values
   - Function `useVitalAnimation(targetVitals, duration=800)`: React hook for smooth transitions
2. Implement `/lib/anim/monitor.ts`:
   - Component `<VitalSignsDisplay vitals={VitalSigns} />`:
     - Display HR, BP (sys/dia), RR, SpO2 in monitor-style layout
     - Use monospace font, appropriate colors
     - Animate numbers smoothly using easing
     - Color-code based on severity: normal (green), warning (yellow), critical (red)
     - Show units (bpm, mmHg, %, etc.)
3. Create ECG canvas component `<ECGWaveform hr={number} rhythm={string} />`:
   - Use HTML Canvas and requestAnimationFrame
   - Draw continuous ECG trace scrolling right-to-left
   - Generate QRS complexes based on HR
   - Allow rhythm variations (normal sinus, tachycardia, etc.)
   - Optional: Sync QRS beep audio with each complex
4. Create timer UI component `<Timer timeRemaining={number} />`:
   - Circular progress indicator (SVG or Canvas)
   - Show seconds remaining as text
   - Color transition: green → yellow → red as time decreases
   - Pulse animation when <5 seconds
5. Implement audio cues:
   - QRS beep (toggleable)
   - Timer warning beep (escalating cadence)
   - Action confirmation sound
   - Alarm sounds for critical vitals

**Deliverables**:
- Animated vital signs display with smooth transitions
- Real-time ECG waveform rendering
- Visual timer with countdown
- Audio cue system
- Monitor-style UI matching medical equipment aesthetics

**Validation**: Test vital sign changes animate smoothly, ECG draws continuously, timer countdown accurate, audio cues trigger appropriately

---

### Phase 5: Gemini AI Integration & API Routes
**Goal**: Integrate Gemini for captions, debrief, and teach-back grading.

**Dependencies**: Requires Phase 2 (history data), Phase 4 (for context of what's happening)

**Context**: Gemini provides educational value but never controls simulation flow. All calls have timeouts with fallbacks.

**Tasks**:
1. Implement `/lib/llm/caption.ts`:
   - Function `buildCaptionPrompt(context)`:
     - Input: `{scenario_id, node_id, last_action, vitals_snapshot, rubric_snippets}`
     - Build prompt: "You are a clinical educator. Explain in ≤260 characters why [action] was performed in this scenario. Context: [vitals], [rubric]. Be concise and educational."
   - Function `generateCaption(context)`: Call Gemini API, return caption string
2. Implement `/lib/llm/debrief.ts`:
   - Function `buildDebriefPrompt(data)`:
     - Input: `{history, scores, outcome, checklist, teachbacks}`
     - Build structured prompt requesting: headline, strengths array, misses array, tip, narrative
   - Function `generateDebrief(data)`: Call Gemini API, return structured response
3. Implement `/lib/llm/teachback.ts`:
   - Function `gradeTeachback(userAnswer, rubric)`:
     - rubric: array of keywords/concepts
     - Check if userAnswer contains key concepts
     - Simple keyword matching or Gemini call for semantic check
     - Return pass/fail boolean
4. Create `/app/api/caption/route.ts` (Edge function):
   - Input: `{scenario_id, node_id, last_action, state_snapshot, fallback_key}`
   - Call Gemini with 1200ms timeout
   - If timeout: return caption from scenario.captions[fallback_key]
   - Output: `{caption: string}`
5. Create `/app/api/debrief/route.ts` (Edge function):
   - Input: `{history, scores, outcome, top_misses}`
   - Call Gemini
   - Output: `{headline, strengths[], misses[], tip, narrative}`
6. Set up Gemini API client:
   - Use `GEMINI_API_KEY` from environment
   - Configure for Edge runtime compatibility
   - Handle rate limits and errors

**Deliverables**:
- Caption generation API with fallback
- Debrief generation API
- Teach-back grading logic
- Prompt engineering for educational feedback
- Error handling and timeout logic

**Validation**: Test caption generation under 600ms, verify fallback works, test debrief quality with sample runs, verify teach-back grading accuracy

---

### Phase 6: Scoring System
**Goal**: Calculate performance metrics and generate scores.

**Dependencies**: Requires Phase 2 (history data)

**Context**: Scoring must be transparent and based on clinical priorities (timing > correctness > completeness).

**Tasks**:
1. Implement `/lib/engine/scoring.ts`:
   - Function `calculateTimingScore(history, scenario)`:
     - For each critical action, find timestamp in history
     - Match against `scenario.scoring.timers[actionId]` buckets
     - Example: adrenaline at 11s with buckets {<=30:20, <=60:15, >60:0} → 20 points
     - Sum points, normalize to 0-40 scale
   - Function `calculateCorrectnessScore(history, scenario)`:
     - For each node visited, check if action taken is in `scenario.scoring.correct[nodeId]`
     - Award points for correct actions
     - Normalize to 0-40 scale
   - Function `calculateCompletenessScore(state, scenario)`:
     - Sum checklist items ticked: `scenario.scoring.completeness.checklist[itemId]`
     - Add teach-back bonus if passed: `scenario.scoring.completeness.teachback_pass`
     - Subtract hint penalty: `scenario.scoring.completeness.hint_penalty * hintsUsed`
     - Normalize to 0-20 scale
   - Function `calculateCalibrationScore(history)`:
     - For each step with uncertainty value: `p = uncertainty`, `y = correct ? 1 : 0`
     - Calculate Brier score: `(p - y)²`
     - Calibration = `100 × (1 - mean(Brier))`
     - Return 0-100 score
   - Function `calculateTotalScore(scores, weights)`:
     - Apply weights from `scenario.scoring.weights`
     - Return weighted total
2. Implement metrics calculation:
   - `timeToCriticalAction`: Find first occurrence of critical action in history
   - `branchClassification`: Determine path taken (good/delay/timeout)
   - `checklistTickCount`: Count items ticked
   - `teachbackPassRate`: Passes / total teachbacks
3. Add scoring to transition logic:
   - Tag each action in history with `correct: boolean`
   - Attach uncertainty values from user input
   - Track teach-back results

**Deliverables**:
- Complete scoring algorithm matching spec
- Metrics calculation functions
- Weighted score computation
- Real-time scoring updates

**Validation**: Test with sample runs, verify scores match expected values, validate calibration calculation with known uncertainty/correctness pairs

---

### Phase 7: Scenario System & JSON Loading
**Goal**: Load and validate scenario JSON files.

**Dependencies**: Requires Phase 1 (type definitions)

**Context**: Scenarios are the content. System must validate structure and handle missing assets gracefully.

**Tasks**:
1. Create scenario JSON schema validator:
   - Use Zod or JSON Schema
   - Validate all required fields: id, title, initial_state, nodes, end_states, scoring
   - Validate node structure: scene, vitals, choices, time_limit_sec
   - Validate choice structure: id, label, next, voice_aliases
   - Validate scoring rules completeness
2. Implement scenario loader in `/lib/engine/loader.ts`:
   - Function `loadScenario(scenarioId)`: Read JSON from `/scenarios/{scenarioId}.json`
   - Validate against schema
   - Return Scenario object or throw validation error
   - Function `listScenarios()`: Return array of available scenario IDs
3. Create complete example: `/scenarios/anaphylaxis_pacu_v1.json`:
   - Copy full structure from spec section 4
   - Include all nodes: S0, S1_GOOD, S1_SUPPORT, S1_DELAY, S0_TIMEOUT, S1_TIMEOUT
   - Include end states: END_GOOD, END_OK, END_DELAY
   - Include complete scoring rules
   - Include captions and teachback rubrics
4. Build asset preloader:
   - Function `preloadAssets(scenario)`:
     - Extract all asset paths from scenario (bg, evidence, video)
     - Preload images using Image objects
     - Preload videos using video elements
     - Return Promise that resolves when all loaded
   - Show loading progress UI
5. Handle missing assets:
   - Use placeholder image if asset not found
   - Log warning but don't crash
   - Allow simulation to proceed

**Deliverables**:
- Scenario validation system
- JSON loader with error handling
- Complete anaphylaxis scenario
- Asset preloading system
- Graceful missing asset handling

**Validation**: Load scenario successfully, validate structure, verify assets preload, test with invalid JSON, test with missing assets

---

### Phase 8: Main UI Pages & Components
**Goal**: Build the three main pages and reusable components.

**Dependencies**: Requires Phases 2-7 (all core systems)

**Context**: This integrates everything into the user-facing application. Focus on Teaching Mode first, then Exam Mode.

**Tasks**:
1. Create `/app/sim/runner/page.tsx`:
   - **Layout Structure**:
     - Top: Timer + Mode indicator
     - Left: Medical monitor (vitals + ECG)
     - Center: Scene background image + evidence overlays
     - Right: Action feedback panel
     - Bottom: Mic button + transcript display
   - **State Management**:
     - Initialize FSM with selected scenario
     - Track current node, vitals, timer, history
     - Handle mode (teaching vs exam)
   - **Voice Interaction Flow**:
     - User presses Space or clicks mic
     - Start speech recognition
     - Send transcript to `/api/parse-action` with allowed choices
     - Show action confirmation
     - Apply transition
     - Animate vitals change
     - Show caption (Teaching Mode only)
   - **Teaching Mode Features**:
     - After designated actions, prompt for confidence: "Say your confidence percentage"
     - Capture uncertainty value (0-100)
     - Prompt for teach-back answer
     - Call teach-back grading
     - Show caption from Gemini
   - **Exam Mode Features**:
     - Hide captions during run
     - Enforce strict timer
     - No confidence/teach-back prompts
     - Show only debrief at end
   - **End of Run**:
     - Calculate scores
     - Call `/api/debrief`
     - Show debrief panel with scores, strengths, misses, tip
     - Save run to storage
2. Create `/app/sim/author/page.tsx`:
   - Form-based authoring tool
   - Fields for scenario metadata: id, title, initial_state
   - Dynamic node editor: add/remove nodes
   - Choice editor: id, label, next, voice_aliases, delta
   - Scoring rules editor
   - Export as JSON file (download)
   - Import existing JSON for editing
3. Create `/app/analytics/page.tsx`:
   - Load runs from storage
   - Display dashboard cards:
     - Total runs count
     - Median time-to-critical-action
     - Pass rate (define threshold, e.g., score >= 70)
     - Average calibration score
     - Hint usage stats
   - Filter controls: by scenario, by mode, by date range
   - Run list table: runId, scenario, mode, score, date
   - Click run to see details: history, choices made, timestamps
4. Build reusable components:
   - `<MonitorDisplay vitals={VitalSigns} />`: Uses Phase 4 components
   - `<Timer timeRemaining={number} onTimeout={() => void} />`
   - `<MicButton isListening={boolean} onClick={() => void} />`
   - `<ActionFeedback action={Choice} confirmed={boolean} />`
   - `<CaptionDisplay caption={string} />`
   - `<DebriefPanel debrief={Debrief} scores={Scores} />`
   - `<ChecklistPanel items={ChecklistItem[]} ticked={string[]} />`
   - `<EvidenceOverlay images={string[]} />`

**Deliverables**:
- Fully functional simulation runner page
- Scenario authoring tool (v0)
- Analytics dashboard
- Reusable component library
- Complete user flow from start to debrief

**Validation**: Run complete simulation end-to-end, verify all interactions work, test both modes, verify scores calculate correctly, test authoring tool exports valid JSON

---

### Phase 9: Storage & Analytics Backend
**Goal**: Implement run persistence and analytics retrieval.

**Dependencies**: Requires Phase 6 (scoring), Phase 8 (run completion)

**Context**: Start with local storage for MVP. Supabase optional for production.

**Tasks**:
1. Create `RunStore` interface in `/lib/storage/store.ts`:
   ```typescript
   interface RunStore {
     saveRun(run: Run): Promise<void>;
     listRuns(opts?: {limit?: number; scenarioId?: string; mode?: string}): Promise<Run[]>;
     getRun(runId: string): Promise<Run | null>;
     deleteRun(runId: string): Promise<void>;
   }
   ```
2. Implement `LocalRunStore` class:
   - Use in-memory Map + localStorage sync
   - `saveRun`: Add to Map, serialize to localStorage
   - `listRuns`: Filter and sort runs, apply limit
   - Serialize/deserialize Run objects to/from JSON
   - Handle localStorage size limits
3. Create `/app/api/record-run/route.ts` (Edge function):
   - Input: Run object
   - Validate structure
   - Call `runStore.saveRun(run)`
   - Return success/error
4. Optional: Implement `SupabaseRunStore` class:
   - Define Supabase schema:
     ```sql
     create table runs (
       id uuid primary key default gen_random_uuid(),
       scenario_id text not null,
       mode text not null,
       started_at timestamptz default now(),
       ended_at timestamptz,
       score_total int,
       score_timing int,
       score_correctness int,
       score_completeness int,
       score_calibration int,
       history jsonb,
       metrics jsonb
     );
     create index runs_scenario_id_idx on runs(scenario_id);
     create index runs_mode_idx on runs(mode);
     ```
   - Implement methods using Supabase client
   - Add RLS policies for multi-user support
5. Add analytics aggregation functions:
   - `calculateMedianTimeToCritical(runs)`: Find median of timeToCritical metric
   - `calculatePassRate(runs, threshold)`: Count runs with score >= threshold
   - `identifyTopMisses(runs)`: Find most commonly skipped actions
   - `calculateAverageCalibration(runs)`: Mean calibration score

**Deliverables**:
- RunStore interface and LocalRunStore implementation
- API endpoint for run persistence
- Optional Supabase integration
- Analytics aggregation functions
- Storage adapter pattern for easy swapping

**Validation**: Save run and verify it persists, reload page and verify runs load from localStorage, test filtering, test Supabase integration if implemented

---

### Phase 10: Mode-Specific Features
**Goal**: Implement differences between Teaching and Exam modes.

**Dependencies**: Requires Phase 8 (main UI)

**Context**: Modes share core simulation but differ in feedback, hints, and timing strictness.

**Tasks**:
1. **Teaching Mode Implementation**:
   - Show step captions after each action (call `/api/caption`)
   - After actions with `ask_uncertainty: true`:
     - Prompt: "Say your confidence as a percentage"
     - Capture number from speech (0-100)
     - Normalize to 0-1 and attach to history
   - After actions with `teachback_id`:
     - Prompt: scenario.teachbacks[teachback_id].prompt
     - Capture ≤10 word answer
     - Grade using rubric
     - Show pass/fail feedback
   - Display real-time checklist with ticks
   - Show hint button (optional, costs points)
   - Allow pause/resume
2. **Exam Mode Implementation**:
   - Hide all captions during run
   - No confidence prompts
   - No teach-back prompts
   - No hints available
   - Stricter timeout enforcement (no grace period)
   - Record all actions silently
   - Show comprehensive debrief at end only
   - Display score prominently
3. Add mode selector on scenario start screen:
   - Radio buttons or toggle: Teaching / Exam
   - Show mode description
   - Check scenario supports mode (`mode_defaults`)
4. Implement hint system (Teaching Mode):
   - Hint button shows "recommended next action"
   - Use scenario metadata or simple priority system
   - Deduct points from completeness score
   - Track `hintsUsed` in state
5. Adjust UI visibility based on mode:
   - Caption panel: visible in Teaching, hidden in Exam
   - Checklist: visible in Teaching, hidden in Exam during run (show at end)
   - Hint button: visible in Teaching, hidden in Exam
   - Confidence/Teachback prompts: Teaching only

**Deliverables**:
- Full Teaching Mode with captions, confidence, teach-backs
- Full Exam Mode with silent recording
- Mode selector UI
- Hint system (Teaching Mode)
- Mode-specific UI visibility logic

**Validation**: Complete simulation in Teaching Mode with all prompts, complete in Exam Mode with no interruptions, verify scoring differs based on hints/confidence

---

### Phase 11: Accessibility & Polish
**Goal**: Ensure accessibility and production-quality UX.

**Dependencies**: Requires Phase 8 (UI)

**Context**: Medical training must be accessible. Audio/visual polish enhances realism.

**Tasks**:
1. **Keyboard Accessibility**:
   - Space: Push-to-talk (hold to record, release to stop)
   - Esc: Cancel current recording
   - Tab: Navigate UI elements
   - Enter: Confirm actions
   - All interactive elements keyboard accessible
2. **ARIA Labels**:
   - Add `aria-label` to all buttons: mic, hint, pause, etc.
   - Add `role="status"` to live regions: transcript, feedback, timer
   - Add `aria-live="polite"` for non-critical updates
   - Add `aria-live="assertive"` for critical alerts (timeout warnings)
   - Ensure screen reader announces state changes
3. **High-Contrast Theme**:
   - Implement theme toggle
   - Ensure all text meets WCAG AA contrast ratios (4.5:1)
   - Use semantic colors (not just red/green for critical info)
   - Provide patterns/textures in addition to colors
4. **Text Alternatives**:
   - All audio cues have visual equivalents
   - All visual changes have screen reader announcements
   - Provide transcript of all spoken feedback
5. **Audio System**:
   - Implement QRS beep toggle (on/off, user preference)
   - Timer beep escalation: 1 beep at 10s, 2 at 5s, rapid at 2s
   - Action confirmation sound (subtle click)
   - Critical alarm sound for vitals (toggleable)
   - Master volume control
   - Persist audio preferences to localStorage
6. **Error Handling**:
   - STT unavailable: Show text input fallback
   - Gemini timeout: Use fallback captions from scenario
   - API error: Show error message, allow retry
   - Asset load failure: Use placeholders, log error
   - Network offline: Show offline message
7. **Loading States**:
   - Scenario assets: Show progress bar with percentage
   - API calls: Show spinner (non-blocking for captions)
   - Skeleton screens while loading analytics
   - Optimistic UI updates where appropriate
8. **Responsive Design**:
   - Primary target: Desktop/tablet (1024px+)
   - Mobile: Simplified layout, larger touch targets
   - Test on various screen sizes
   - Ensure monitor display scales appropriately
9. **Performance Optimization**:
   - Lazy load scenario assets
   - Memoize expensive calculations
   - Use React.memo for frequently re-rendering components
   - Debounce voice input processing
   - Optimize ECG canvas rendering

**Deliverables**:
- Fully keyboard-navigable UI
- WCAG AA compliant accessibility
- High-contrast theme option
- Complete audio system with controls
- Robust error handling with fallbacks
- Loading states for all async operations
- Responsive layout for desktop/tablet/mobile
- Performance optimizations

**Validation**: Test with keyboard only (no mouse), test with screen reader (VoiceOver/NVDA), verify WCAG compliance, test error scenarios, measure performance metrics

---

### Phase 12: Testing & Validation
**Goal**: Ensure correctness and reliability.

**Dependencies**: Requires all previous phases

**Context**: Critical system for medical training requires thorough testing.

**Tasks**:
1. **Unit Tests** (Jest + React Testing Library):
   - FSM transition logic: `transition.test.ts`
     - Test correct next node for each action
     - Test vital delta application
     - Test timeout transitions
     - Test end state detection
   - Scoring calculations: `scoring.test.ts`
     - Test timing score buckets
     - Test correctness score
     - Test completeness with checklist
     - Test calibration (Brier score)
   - Speech matching: `match.test.ts`
     - Test exact matches
     - Test fuzzy matches with typos
     - Test disambiguation triggers
     - Test no-match scenarios
   - Vital interpolation: `easing.test.ts`
     - Test easing function outputs
     - Test interpolation at various progress points
2. **Integration Tests**:
   - API routes: `api.test.ts`
     - Test `/api/parse-action` with various transcripts
     - Test `/api/caption` with mock Gemini responses
     - Test `/api/debrief` with complete history
     - Test error handling and timeouts
   - Full simulation flow: `simulation.test.ts`
     - Load scenario
     - Apply sequence of actions
     - Verify state changes
     - Verify score calculation
3. **End-to-End Tests** (Playwright or Cypress):
   - Complete Teaching Mode run:
     - Start scenario
     - Speak action (mock speech API)
     - Verify visual update
     - Complete confidence prompt
     - Complete teach-back
     - Reach end state
     - Verify debrief displays
   - Complete Exam Mode run:
     - Verify no captions shown
     - Verify timing enforcement
     - Verify debrief at end only
   - Analytics page:
     - Verify runs display
     - Verify metrics calculate correctly
     - Test filters
4. **Performance Tests**:
   - Action → visual latency: Target <200ms
     - Measure time from action confirmation to vital display change
     - Use Performance API
   - Caption latency: Target <600ms
     - Measure API call duration
   - Asset preload time: Target <3s for typical scenario
   - ECG animation: Target 60fps
     - Use requestAnimationFrame timing
5. **User Testing**:
   - Voice recognition accuracy:
     - Test with 10+ medical terms
     - Calculate recognition rate
     - Test with various accents
   - Disambiguation UX:
     - Test ambiguous phrases
     - Verify clear user guidance
   - Debrief clarity:
     - Survey: Is feedback actionable?
     - Survey: Do scores make sense?

**Deliverables**:
- Test suite with >80% code coverage
- Passing integration tests
- Passing E2E tests
- Performance benchmarks met
- User testing feedback incorporated

**Validation**: All tests pass, coverage report shows >80%, performance targets met

---

### Phase 13: Deployment & Documentation
**Goal**: Deploy to Vercel and create comprehensive documentation.

**Dependencies**: Requires all previous phases

**Context**: Prepare for demo and future development.

**Tasks**:
1. **Vercel Configuration**:
   - Create `vercel.json` with runtime settings
   - Configure Edge functions: `export const runtime = "edge"` in API routes
   - Set environment variables in Vercel dashboard:
     - `GEMINI_API_KEY`
     - `SUPABASE_URL` (optional)
     - `SUPABASE_KEY` (optional)
   - Configure domain (if applicable)
   - Set up deployment preview for pull requests
2. **README.md**:
   - Project overview and goals
   - Features list
   - Tech stack
   - Setup instructions:
     - Prerequisites (Node.js version)
     - Clone repo
     - Install dependencies: `npm install`
     - Set up `.env.local`
     - Run dev server: `npm run dev`
   - Build instructions: `npm run build`
   - Deployment instructions
   - Project structure overview
   - Contributing guidelines
3. **Scenario Documentation** (`SCENARIO_SCHEMA.md`):
   - Complete JSON schema reference
   - Field-by-field explanation
   - Examples for each pattern
   - Best practices for authoring:
     - Voice aliases tips
     - Scoring balance recommendations
     - Timeout durations
     - Caption writing guidelines
   - Validation rules
4. **API Documentation** (`API.md`):
   - Endpoint reference for all routes
   - Request/response schemas
   - Error codes and handling
   - Latency expectations
   - Rate limits (if applicable)
5. **Judge/Demo Script**:
   - 3-minute walkthrough (from spec section 12):
     - 00:00-00:20 - Intro: "Voice-only micro-sim..."
     - 00:20-02:30 - Live demo: Speak actions, show reactions
     - 02:30-03:00 - Debrief and analytics
     - 03:00-03:20 - Technical highlights (FSM, Edge, Gemini)
   - Key talking points
   - Common questions and answers
6. **Demo Video**:
   - Record 3-minute demo following script
   - Show voice interaction clearly
   - Highlight vital sign changes
   - Show Gemini explanations
   - Display debrief with scores
   - Show analytics dashboard
   - Include technical architecture slide
7. **Deployment**:
   - Deploy to Vercel: `vercel --prod`
   - Verify all environment variables set
   - Test production deployment
   - Verify Edge functions work in production
   - Test with production Gemini API

**Deliverables**:
- Deployed application on Vercel
- Comprehensive README
- Scenario schema documentation
- API documentation
- Demo script
- Demo video
- Production-ready configuration

**Validation**: Visit production URL, run complete simulation, verify all features work, test from different devices/networks

---

## Optional Phase 14: Stretch Features (Post-MVP)
**Goal**: Implement advanced features from spec section 11.

**Dependencies**: Requires completed MVP (Phases 1-13)

**Context**: These features enhance the platform but are not required for initial launch.

**Tasks**:
1. **Adaptive Timers**:
   - Track user's historical performance
   - Adjust time limits based on skill level
   - Easier: +20% time; Harder: -20% time
2. **Hint Token Economy**:
   - User earns tokens for good performance
   - Can spend tokens on hints in future runs
   - Gamification element
3. **Ghost Replay**:
   - Record timeline of user's run
   - On retry, show "ghost" indicator of previous attempt
   - Compete against own time
4. **Team Mode**:
   - Multiple users in same simulation
   - Role assignments (doctor, nurse, pharmacist)
   - Closed-loop communication checklist
   - Collaboration scoring
5. **Veo Video Integration**:
   - Pre-generate video clips per node
   - Play instead of static backgrounds
   - Sync with vitals animations
6. **LMS Export**:
   - Generate xAPI statements
   - Generate SCORM packages
   - SSO/OIDC integration for institutions
7. **RAG/Vectara Integration**:
   - Load clinical guidelines into vector DB
   - Cite specific guidelines in debrief
   - "Why this action?" button shows guideline excerpt

**Deliverables**: Enhanced platform with production features ready for institutional deployment

---

## Technical Stack Summary

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Animation**: Framer Motion
- **State Management**: XState or React useReducer
- **Canvas**: HTML5 Canvas (ECG)
- **Voice**: Web Speech API

### Backend
- **Runtime**: Vercel Edge Functions
- **AI**: Google Gemini API
- **Storage**: localStorage (MVP), Supabase (optional)

### Key Libraries
- Zod (schema validation)
- React Testing Library (testing)
- Playwright/Cypress (E2E)
- Fuse.js or similar (fuzzy matching)

---

## Critical Implementation Notes

### For LLM Developers

1. **FSM is Authoritative**: Never let LLM control state transitions. LLM only maps speech → actions and generates feedback.

2. **Latency Budgets**: 
   - Action confirmation: <200ms
   - Caption display: <600ms
   - Always have fallbacks

3. **Voice Aliases are Critical**: Medical terminology needs extensive aliases. "IM adrenaline", "intramuscular epinephrine", "epi point five mg" should all map correctly.

4. **Scoring Transparency**: Users must understand why they got a score. Show breakdown: Timing (X/40) + Correctness (Y/40) + Completeness (Z/20).

5. **Gemini Prompts**: Keep prompts focused and constrained. Always specify character limits for captions.

6. **Asset Management**: Preload everything before simulation starts. No mid-run loading delays.

7. **Error Recovery**: Every API call needs timeout + fallback. Never let a Gemini timeout break the simulation.

8. **Testing Priority**: Focus on FSM correctness first, then voice matching accuracy, then UI polish.

9. **Scenario Design**: Start with simple 3-node scenario to test all systems, then expand to full anaphylaxis scenario.

10. **Accessibility First**: Keyboard navigation and screen reader support are not optional. Build them in from the start.

---

## Success Criteria

### MVP Launch
- [ ] Complete anaphylaxis scenario with 5+ nodes
- [ ] Voice input works with 90%+ accuracy for medical terms
- [ ] Both Teaching and Exam modes functional
- [ ] Debrief provides actionable feedback
- [ ] Analytics dashboard shows meaningful metrics
- [ ] <200ms action-to-visual latency
- [ ] WCAG AA compliant
- [ ] Deployed to Vercel with working demo

### Post-MVP
- [ ] 3+ scenarios available
- [ ] Supabase persistence enabled
- [ ] LMS export working
- [ ] Institutional SSO integrated
- [ ] Team mode functional
- [ ] RAG citations in debrief

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Voice recognition inaccurate | High | Extensive voice_aliases, manual text input fallback |
| Gemini latency too high | Medium | Timeout + fallback captions, Edge functions for speed |
| Complex FSM hard to author | Medium | Build authoring tool (Phase 8), provide templates |
| Users don't understand scores | High | Clear breakdown, Gemini explanations, transparent rubrics |
| Asset loading slow | Low | Preload before simulation, optimize file sizes, use CDN |

---

## Development Timeline Estimate

Assuming 1 full-time developer:

- **Phase 1-2**: 1 week (Foundation + FSM)
- **Phase 3-4**: 1 week (Voice + Visuals)
- **Phase 5-6**: 1 week (AI + Scoring)
- **Phase 7-8**: 2 weeks (Scenarios + UI)
- **Phase 9-10**: 1 week (Storage + Modes)
- **Phase 11**: 1 week (Accessibility + Polish)
- **Phase 12-13**: 1 week (Testing + Deploy)

**Total MVP**: ~8 weeks

**Stretch Features**: +4-6 weeks

---

## Getting Started (Quick Reference)

1. Clone repo and `cd` into directory
2. Run `npm install`
3. Copy `.env.example` to `.env.local`
4. Add `GEMINI_API_KEY`
5. Run `npm run dev`
6. Open `http://localhost:3000`
7. Navigate to `/sim/runner`
8. Select anaphylaxis scenario
9. Press Space and speak: "IM adrenaline point five milligrams"
10. Watch vitals animate and read Gemini explanation

---

## Contact & Support

For questions about implementation:
1. Review this document
2. Check `/docs` folder for detailed specs
3. Review scenario JSON examples in `/scenarios`
4. Check test files for usage examples

---

**End of Implementation Plan**

