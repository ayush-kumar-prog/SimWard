# SimWard - Voice-First Clinical Micro-Simulation

**Medical training simulations where doctors practice emergency scenarios through voice commands.**

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment (create .env.local)
echo "GEMINI_API_KEY=your_key_here" > .env.local
# Get key at: https://aistudio.google.com/apikey

# 3. Start dev server
npm run dev
# Opens at http://localhost:3000
```

**Test it works**: Visit http://localhost:3000/test-scenario and click "List Scenarios" → "anaphylaxis_pacu_v1"

---

## 📊 Project Status

**Phase 7 of 13 Complete** (70% MVP)

| System | Status | Test Page |
|--------|--------|-----------|
| FSM Engine | ✅ Complete | - |
| Voice Input | ✅ Complete | `/test` |
| Visual Rendering | ✅ Complete | `/visual-demo` |
| AI (Gemini 2.5) | ✅ Complete | `/test-gemini` |
| Scoring System | ✅ Complete | `/test-scoring` |
| Scenario Loading | ✅ Complete | `/test-scenario` |
| **Main UI** | 🚧 **Next** | `/sim/runner` |
| Data Persistence | 📋 Todo | - |
| Analytics | 📋 Todo | `/analytics` |

---

## 🎯 What Makes SimWard Different

### 1. Voice-First Design
- Push-to-talk (spacebar or mic button)
- Natural language: *"give adrenaline IM"*
- Medical terminology fuzzy matching
- Works in Chrome (Web Speech API)

### 2. Deterministic FSM
- **LLMs NEVER control simulation flow** (safety-critical)
- Scenarios are authored state machines (JSON)
- Gemini only: speech→action mapping + educational explanations
- Anaphylaxis needs adrenaline, not AI hallucination

### 3. Transparent Scoring
- **Timing**: Speed to critical actions (0-40 pts)
- **Correctness**: Right vs wrong decisions (0-40 pts)
- **Completeness**: Checklist + teach-backs (0-20 pts)
- **Calibration**: Confidence vs accuracy (0-100, Brier score)

### 4. Two Modes
- **Teaching**: Real-time AI captions, hints, no time pressure
- **Exam**: Timed, no feedback until end, comprehensive debrief

---

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: TailwindCSS + Framer Motion
- **Voice**: Web Speech API (client-side)
- **AI**: Google Gemini 2.5 Flash
- **Runtime**: Vercel Edge Functions
- **Validation**: Zod 3.x
- **Canvas**: ECG rendering (requestAnimationFrame)
- **Audio**: Web Audio API (QRS beeps, alarms)

### Data Flow
```
User speaks → Web Speech API → Fuzzy match → FSM transition
                                                    ↓
                                          Update vitals + history
                                                    ↓
                              Visual feedback              Gemini caption
                              (animate vitals,             (explain why,
                               update ECG,                  teaching mode)
                               change scene)
```

### Directory Structure
```
app/
  sim/runner/page.tsx         # 🚧 Main simulation UI (Phase 8)
  components/                 # ✅ Reusable UI components
  api/                        # ✅ Edge function routes
  test-*/page.tsx             # ✅ Phase validation pages

lib/
  engine/
    machine.ts                # ✅ FSM: init, transition, history
    scoring.ts                # ✅ Performance scoring
    loader.ts                 # ✅ Scenario JSON loading (Zod)
  voice/
    stt.ts                    # ✅ Web Speech API wrapper
    match.ts                  # ✅ Fuzzy matching (Levenshtein)
  llm/
    caption.ts                # ✅ Gemini caption generation
    debrief.ts                # ✅ Structured debrief
  types.ts                    # ✅ TypeScript definitions

public/
  scenarios/
    anaphylaxis_pacu_v1.json  # ✅ Example scenario (10 nodes)
```

---

## 📖 Key Concepts

### Scenario Structure
Scenarios are JSON files defining a state machine:
```typescript
{
  id: "anaphylaxis_pacu_v1",
  title: "PACU Anaphylaxis Emergency",
  initial_state: "S0",
  nodes: {
    S0: {
      scene: "bg/pacu_day.png",
      vitals: {hr: 124, bp_sys: 78, bp_dia: 40, rr: 28, spo2: 88},
      choices: [
        {
          id: "adrenaline_im",
          label: "IM Adrenaline 0.5 mg",
          next: "S1_GOOD",
          delta: {hr: "-10", bp_sys: "+15"},
          ticks: ["adrenaline"],
          voice_aliases: ["give adrenaline", "epi"]
        }
      ]
    }
  },
  scoring: {...},
  checklist: [...],
  teachbacks: {...}
}
```

### FSM Runtime State
```typescript
{
  nodeId: "S0",                    // Current node
  vitals: {...},                   // Current vital signs
  timer: 30,                       // Seconds remaining
  checklist: {adrenaline: true},   // Completion status
  history: [{t: 11, action: "adrenaline_im", correct: true}],
  mode: "teaching"                 // or "exam"
}
```

---

## 🔧 Implementation Details

### Gemini 2.5 Flash Specifics

**Model**: `gemini-2.5-flash` (NOT 1.5 - deprecated)

**API Endpoint**:
```
https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={key}
```

**Token Configuration**:
- **Thinking tokens**: Gemini 2.5 uses ~600 tokens internally before output
- **Caption**: `maxOutputTokens: 1000` (allows ~400 chars output)
- **Debrief**: `maxOutputTokens: 10000` (longer structured output)

**Timeout**:
- **Caption API**: 10 seconds (actual latency ~5s)
- **Debrief API**: 10 seconds
- Always include fallback if timeout

**Common Issue**: If `finishReason === "MAX_TOKENS"` with no text → increase `maxOutputTokens`

### Zod Version

**MUST USE Zod 3.x** (NOT 4.x - experimental)

```bash
npm install zod@^3.23.8
```

Zod 4.x has breaking changes. The project uses 3.25.76 (stable).

### Scenario File Location

**MUST BE**: `/public/scenarios/` (Next.js static serving)

```typescript
// Correct
const response = await fetch(`/scenarios/${id}.json`);
```

### Voice Recognition

**Best**: Chrome/Edge (Chromium)  
**Limited**: Safari  
**Unsupported**: Firefox

```typescript
const SpeechRecognition = 
  window.SpeechRecognition || window.webkitSpeechRecognition;
```

### Scoring Formulas

```typescript
// Timing (0-40): How fast were critical actions?
timingScore = normalize(sum of bucket points) * 40

// Correctness (0-40): Right vs wrong decisions
correctnessScore = (correct - wrong) / total * 40

// Completeness (0-20): Checklist + teach-backs - hints
completenessScore = clamp(checklist_points + teachback_bonus - hint_penalty, 0, 20)

// Calibration (0-100): Confidence vs accuracy (Brier)
calibrationScore = 100 * (1 - mean((confidence - correctness)²))

// Total
totalScore = timing * w1 + correctness * w2 + completeness * w3
```

---

## 🐛 Common Issues

### "Gemini returns fallback despite API key"
**Cause**: `maxOutputTokens` too low  
**Fix**: Already set to 1000+ (check `lib/llm/caption.ts`)

### "Zod validation error '_zod'"
**Cause**: Zod 4.x installed  
**Fix**: `npm install zod@^3.23.8`

### "Scenario JSON 404"
**Cause**: Not in `/public/scenarios/`  
**Fix**: Move file, restart dev server

### "Voice not working"
**Cause**: Browser doesn't support Web Speech API  
**Fix**: Use Chrome/Edge

---

## 📝 Key Files Reference

### Start Here
- `lib/types.ts` - **Read first** - All TypeScript definitions
- `IMPLEMENTATION_PLAN.md` - Complete 13-phase roadmap
- `PROGRESS.md` - Detailed completion status

### Core Systems
- `lib/engine/machine.ts` - FSM (init, transition, get choices)
- `lib/engine/transition.ts` - Apply vital deltas, move to next node
- `lib/engine/scoring.ts` - All 4 scoring components
- `lib/engine/loader.ts` - Load + validate scenarios (Zod)

### Voice
- `lib/voice/stt.ts` - Web Speech API wrapper class
- `lib/voice/match.ts` - Fuzzy matching (Levenshtein + token overlap)
- `app/api/parse-action/route.ts` - Edge function endpoint

### AI
- `lib/llm/caption.ts` - Gemini caption prompts (≤260 chars)
- `lib/llm/debrief.ts` - Structured feedback generation
- `app/api/caption/route.ts` - Edge function with timeout + fallback

### UI Components
- `app/components/VitalSignsDisplay.tsx` - Animated monitor
- `app/components/ECGWaveform.tsx` - Real-time ECG canvas
- `app/components/VoiceInput.tsx` - Voice UI with mic button
- `app/components/Timer.tsx` - Circular/bar timers

### Scenarios
- `public/scenarios/anaphylaxis_pacu_v1.json` - Example (10 nodes, 6 end states)

---

## 🧪 Testing

All test pages at http://localhost:3000:

1. **`/test-scenario`** - Load & validate scenario JSON
2. **`/test-scoring`** - View scoring calculations
3. **`/test-gemini`** - Test AI caption & debrief
4. **`/visual-demo`** - Watch vital animations
5. **`/test`** - Try voice input (Chrome recommended)

---

## 🚀 Next Steps (Phase 8)

Build `/app/sim/runner/page.tsx` to integrate all systems:
1. Scenario selection UI
2. Simulation controller (FSM + voice + visuals)
3. Teaching mode (captions, hints, teach-backs)
4. Exam mode (timers, no hints)
5. End state + debrief display

**Dependencies**: All phases 1-7 complete ✅

See `IMPLEMENTATION_PLAN.md` Phase 8 section for details.

---

## 📚 Additional Documentation

- **`IMPLEMENTATION_PLAN.md`** - Full 13-phase roadmap with tasks and validation
- **`PROGRESS.md`** - Detailed phase-by-phase completion status

---

## 🙏 Built With

- [Next.js](https://nextjs.org/) - React framework
- [Google Gemini](https://ai.google.dev/) - AI API
- [Zod](https://zod.dev/) - Runtime validation
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Framer Motion](https://www.framer.com/motion/) - Animations

---

**Current Status**: Phase 7 complete, ready for Phase 8 UI integration  
**Dev Server**: http://localhost:3000  
**Test Pages**: All functional and validated ✅
