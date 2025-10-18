
# SimWard — Voice-Only Clinical Micro‑Sim (Vercel)  
**Primary interaction: doctors talk; the sim responds.**  
Scope: MVP suitable for a hackathon demo, productionizable later.  
Pillars: **Deterministic branching**, **instant visuals**, **Gemini explanations & debrief**, **Teaching/Exam modes**, **Analytics that matter**.

---

## 0) Product Overview (Use‑Cases First)

### UC1 — Teaching Mode (voice-first)
- Trainee or junior doctor **speaks** actions (“give IM adrenaline 0.5 milligrams to thigh”, “start high‑flow oxygen”, “500 mL fluids”).  
- System confirms the recognized action (brief visual/audio), applies **authored state change**, and shows an **instant monitor reaction**.  
- After selected steps, the trainee **states confidence** aloud (“80 percent sure”), and gives a **≤10‑word teach‑back** (“adrenaline reverses edema & vasodilation”).  
- **Gemini** returns a ≤260‑char caption explaining *why* that step mattered.  
- End: **Gemini debrief** with scores: **Timing / Correctness / Completeness / Calibration**, strengths, misses, next‑step tip.

### UC2 — Exam Mode (voice-first assessment)
- Same voice flow; **no mid‑run captions/hints**, **hard timers** with timeout branches.  
- End: **debrief only** with recorded score; optional persistence.

### UC3 — Insight Loop (analytics)
- Metrics per scenario & per user: **time‑to‑critical action**, **branch** taken (good/delay/timeout), **checklist ticks**, **teach‑back pass rate**, **calibration** (confidence vs. correctness), **hint usage**, **score distribution**.

**Non‑goals (MVP):** live video generation, multiuser team mode, LMS export, RAG (can add later), server DB (optional Supabase later).

---

## 1) Interaction Model (Voice‑Only)

### 1.1 Speaking Actions
- User presses/holds **Space** (or clicks mic) and speaks:  
  `“give IM adrenaline 0.5 milligrams in the thigh now.”`
- `/api/parse-action` maps transcript → **one of the allowed actions** for the current node.  
- If **ambiguous**: UI **highlights top 2** candidates and asks the user to *say* the label again or “**confirm option 1**”.  
- If **off‑policy** (not allowed at this node): system says *“Not available yet—focus on treating the underlying reaction”* and re‑prompts.

### 1.2 Confidence & Teach‑Back (Teaching Mode)
- After designated actions:  
  - **Uncertainty**: user says **“I’m 70 percent sure.”**  
    → normalized to 0.70 and attached to the step.  
  - **Teach‑Back**: system asks **≤10‑word prompt**; user answers; Gemini grades pass/fail using a **tiny rubric**.

### 1.3 Timing & Timeouts
- Each node has `time_limit_sec`.  
- A **visible circular timer** drains; at zero, sim takes `timeout_next` edge.  
- Time pressure simulated via **soft beep cadence** that accelerates as timer nears 0.

---

## 2) Deterministic Branching (Why & How)

- The scenario is an **authored finite state machine (FSM)**: nodes + edges + timeouts.  
- **LLM never decides transitions**. It **only** explains, evaluates, and maps speech → allowed action.  
- **Instant visuals** come from **static scene frames + animated overlays** (ECG canvas, numeric vitals easing, alarm pulse).  
- Optional polish: use **pre‑generated Veo micro‑clips per node**; overlays remain the source of truth.

**Benefits:** reliability (judge‑proof), safety (no unsafe actions), precise scoring, and low latency.

---

## 3) Architecture (Vercel‑Ready)

### 3.1 Frontend (Next.js 14 + TS)
- **Pages/Routes:**  
  - `/sim/runner` — main simulation UI.  
  - `/sim/author` — v0 authoring tool (form → Scenario JSON).  
  - `/analytics` — mini dashboard (local or Supabase).

- **UI Tech:** React, TailwindCSS, Framer Motion (micro‑interactions), Canvas/SVG (ECG & vitals).

- **State:** XState (preferred) or a reducer to model **FSM** with:
  - node id, vitals, timer, checklist, hint tokens, history, mode (teaching/exam).

- **Speech:** Browser **Web Speech API** (STT) client‑side → sends transcript + allowed actions to `/api/parse-action`.

### 3.2 APIs (Vercel Edge Route Handlers)
- `POST /api/parse-action` → fuzzy match transcript to allowed action ids.  
- `POST /api/caption` (Teaching Mode) → Gemini caption (≤260 chars).  
- `POST /api/debrief` → Gemini debrief text from `{history, rubric, timestamps, teachbacks, uncertainty}`.  
- `POST /api/record-run` (optional) → persist run (Supabase path).

> All Edge routes: `export const runtime = "edge"` (low latency).

### 3.3 Data & Assets
- **Scenario JSON** files in repo (`/scenarios/*.json`).  
- **Static assets** in `/public`: `bg/**`, `monitor/**`, `evidence/**`, optional `video/**`.  
- **MVP Storage:** in‑memory + `localStorage` via a `RunStore` adapter.  
- **Optional Supabase** for persistence: add `SupabaseRunStore` later.

---

## 4) Scenario Schema (Authorable JSON)

```jsonc
{
  "id": "anaphylaxis_pacu_v1",
  "title": "PACU Anaphylaxis",
  "initial_state": "S0",
  "mode_defaults": { "teaching": true, "exam": true },
  "checklist": [
    {"id":"adrenaline","label":"IM adrenaline given"},
    {"id":"positioning","label":"Supine + legs elevated"},
    {"id":"oxygen","label":"High-flow O₂"}
  ],
  "teachbacks": {
    "why_adrenaline": {
      "prompt": "In ≤10 words, why is IM adrenaline first-line?",
      "rubric": ["airway edema", "vasodilation", "shock reversal"]
    }
  },
  "nodes": {
    "S0": {
      "scene": "bg/pacu_day.png",
      "video": null,                       // optional pre-rendered clip
      "vitals": {"hr":124,"bp_sys":78,"bp_dia":40,"rr":28,"spo2":88},
      "evidence": ["evidence/wrist_hives_s0.png"],
      "choices": [
        {
          "id":"adrenaline_im",
          "label":"IM Adrenaline 0.5 mg (1:1000)",
          "next":"S1_GOOD",
          "delta":{"bp_sys":"+14","bp_dia":"+18","spo2":"+4","rr":"-2"},
          "ticks":["adrenaline"],
          "ask_uncertainty": true,
          "teachback_id":"why_adrenaline",
          "caption_key":"why_adrenaline_first",
          "voice_aliases": ["give intramuscular adrenaline", "adrenaline point five milligrams"]
        },
        {
          "id":"airway_oxygen",
          "label":"Airway maneuvers + High-flow O₂",
          "next":"S1_SUPPORT",
          "delta":{"spo2":"+3"},
          "ticks":["oxygen"],
          "caption_key":"supportive_only_limits",
          "voice_aliases": ["start oxygen", "apply high flow oxygen", "airway and oxygen"]
        },
        {
          "id":"iv_fluids",
          "label":"500 mL IV bolus",
          "next":"S1_DELAY",
          "delta":{"bp_sys":"+6"},
          "caption_key":"fluids_help_not_primary",
          "voice_aliases": ["give five hundred mils fluids", "start iv bolus"]
        }
      ],
      "time_limit_sec": 15,
      "timeout_next": "S0_TIMEOUT"
    },

    "S1_GOOD": {
      "scene": "bg/pacu_day.png",
      "vitals_target":{"hr":116,"bp_sys":92,"bp_dia":58,"rr":26,"spo2":92},
      "choices":[
        {"id":"airway_oxygen","label":"High-flow O₂","next":"S2_BETTER","delta":{"spo2":"+3"},"ticks":["oxygen"],"voice_aliases":["start oxygen"]},
        {"id":"iv_fluids","label":"500 mL IV bolus","next":"S2_STABLE","delta":{"bp_sys":"+8"},"voice_aliases":["iv bolus"]}
      ],
      "time_limit_sec": 20,
      "timeout_next": "S1_TIMEOUT"
    }
  },

  "end_states": {
    "END_GOOD": {"outcome":"Stabilized promptly"},
    "END_OK":   {"outcome":"Improved, delayed therapy"}
  },

  "captions": {
    "why_adrenaline_first": "IM adrenaline reverses airway edema & vasodilation; reassess in 2–5 min.",
    "supportive_only_limits": "O₂ supports saturation but doesn't halt the reaction.",
    "fluids_help_not_primary": "Fluids counteract vasodilation but adrenaline is first-line."
  },

  "scoring": {
    "weights": {"timing":40,"correctness":40,"completeness":20,"calibration":0}, // set 0–10 if you want it to count
    "timers": {"adrenaline_im":{"<=30":20,"<=60":15,">60":0}},

    "correct": {
      "S0": ["adrenaline_im"],
      "S1_GOOD": ["airway_oxygen","iv_fluids"]
    },

    "completeness": {
      "checklist":{"adrenaline":6,"positioning":4,"oxygen":4},
      "teachback_pass":6,
      "hint_penalty":-3
    }
  }
}
```

**Notes**
- `delta` or `vitals_target` drive animation interpolation; renderer eases numbers 500–900 ms.  
- `voice_aliases` improve mapping accuracy in `/api/parse-action`.  
- `caption_key` provides **fallback** text if Gemini times out (>1.2s).

---

## 5) Algorithms & Scoring

### 5.1 Transition Function (Deterministic)
```
Given: (nodeId, actionId, vitals, t_remaining)
Find: nextNodeId = nodes[nodeId].choices[actionId].next
Apply vitals' = interpolate(vitals, delta|target, duration=~800ms)
If t_remaining <= 0: nextNodeId = nodes[nodeId].timeout_next
Record in history: {t, nodeId, actionId, uncertainty?, teachback?, correct?}
```

### 5.2 Speech → Action Mapping
- Inputs: `transcript`, `allowed = [(id, label, voice_aliases[])]`.  
- Normalize transcript (lowercase, strip filler).  
- Compute similarity: token overlap + fuzzy ratio vs. all `(label ∪ voice_aliases)`; pick best above threshold.  
- If **tie**: prompt disambiguation (“say ‘adrenaline’ or ‘oxygen’”).  
- If **below threshold**: respond “not available here; options are …” and list labels.

### 5.3 Scores
- **Timing (0–40):** buckets in `scoring.timers`. E.g., adrenaline at 26s → +20.  
- **Correctness (0–40):** node’s action in `scoring.correct[node]` → points.  
- **Completeness (0–20):** checklist ticks + teach‑back bonus − hint penalties.  
- **Calibration (0–100 reported; optional 0–10 weight):**
  - For each scored step: `p = uncertainty`, `y ∈ {0,1}`.  
  - **Brier** = `(p − y)^2`. Calibration = `100 × (1 − mean(Brier))`.

---

## 6) LLM Contracts (Edge)

### 6.1 `/api/caption` (Teaching Mode)
**Input**
```json
{
  "scenario_id":"anaphylaxis_pacu_v1",
  "node_id":"S0",
  "last_action":"adrenaline_im",
  "state_snapshot":{"hr":124,"bp_sys":78,"bp_dia":40,"rr":28,"spo2":88},
  "rubric_snippets":["IM adrenaline first-line in anaphylaxis..."],
  "fallback_key":"why_adrenaline_first"
}
```
**Output**
```json
{"caption":"Right move—IM adrenaline reverses airway edema & vasodilation; reassess in 2–5 min."}
```
Timeout (>1200 ms) → return `captions[fallback_key]` client‑side.

### 6.2 `/api/debrief`
**Input**
```json
{
  "history":[
    {"t":11,"nodeId":"S0","actionId":"adrenaline_im","uncertainty":0.7,"teachback":"reverses edema and vasodilation"},
    {"t":24,"nodeId":"S1_GOOD","actionId":"airway_oxygen","uncertainty":0.8}
  ],
  "scores":{"timing":36,"correctness":40,"completeness":14,"calibration":78},
  "outcome":"Stabilized promptly",
  "top_misses":["Adjuncts not given"]
}
```
**Output**
```json
{
  "headline":"Stabilized promptly",
  "strengths":["IM adrenaline at 00:11","Early high-flow O₂"],
  "misses":["Adjuncts (antihistamine/steroid) not given—non-critical"],
  "tip":"If BP remains low, repeat IM adrenaline at 5–10 min.",
  "narrative":"You recognized anaphylaxis quickly and treated the cause..."
}
```

### 6.3 `/api/parse-action`
**Input**
```json
{
  "transcript":"give intramuscular adrenaline point five milligrams now",
  "allowed":[
    {"id":"adrenaline_im","label":"IM Adrenaline 0.5 mg","aliases":["intramuscular adrenaline","adrenaline point five"]},
    {"id":"airway_oxygen","label":"Airway + O₂","aliases":["oxygen","high flow oxygen"]}
  ]
}
```
**Output**
```json
{"actionId":"adrenaline_im","confidence":0.87}
```

---

## 7) Rendering & Latency

- **Assets preload** at scenario load; video (if any) muted autoplay ready.  
- **ECG strip**: requestAnimationFrame loop; waveform asset swap by node.  
- **Vitals easing**: numeric tween (e.g., cubic ease) over 500–900 ms; never jump‑cut.  
- **Audio cues**: QRS beep (toggle), escalating chime as timer nears 0, soft puff on O₂.  
- **Latency budgets**:  
  - Action → visual ≤ **200 ms**.  
  - Caption ≤ **600 ms** (non‑blocking).  
  - Edge handler hard timeout (1.2 s) → client fallback.

---

## 8) Analytics (Local first; DB‑ready)

### Run Object
```ts
type Run = {
  runId: string;
  scenarioId: string;
  mode: "teaching" | "exam";
  startedAt: number; endedAt: number;
  history: Array<{t:number; nodeId:string; actionId:string; uncertainty?:number; teachback?:string; correct?:boolean;}>;
  metrics: { timeToCritical?: number; branch: "good"|"delay"|"timeout"; checklistTicks: string[]; usedHints: number; teachbackPasses: number; };
  score: { total: number; timing: number; correctness: number; completeness: number; calibration: number; };
};
```

### Dashboard Cards
- Median **time‑to‑critical**, **pass rate**, **top misses**, **avg calibration**, **hint usage**.

### Storage Adapters
```ts
interface RunStore { saveRun(run: Run): Promise<void>; listRuns(opts?: {limit?: number; scenarioId?: string}): Promise<Run[]>; }
class LocalRunStore implements RunStore { /* in-memory + localStorage */ }
class SupabaseRunStore implements RunStore { /* inserts/selects with RLS */ }
```

**Supabase minimal schema (optional)**
```sql
create table runs (
  id uuid primary key default gen_random_uuid(),
  scenario_id text not null,
  mode text not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  score_total int, score_timing int, score_correctness int, score_completeness int, score_calibration int,
  history jsonb, metrics jsonb
);
```

---

## 9) Repo Layout (Vercel)

```
simward/
  app/
    sim/runner/page.tsx           # main voice-first sim UI
    sim/author/page.tsx           # v0 authoring form
    analytics/page.tsx            # mini dashboard
    api/parse-action/route.ts     # Edge: speech -> action mapping
    api/caption/route.ts          # Edge: Gemini step caption (Teaching Mode)
    api/debrief/route.ts          # Edge: Gemini debrief
    api/record-run/route.ts       # Edge: optional Supabase persistence
  lib/engine/{machine.ts,transition.ts,scoring.ts}
  lib/voice/{stt.ts,match.ts}     # client STT glue + fuzzy matcher
  lib/anim/{monitor.ts,easing.ts}
  lib/llm/{caption.ts,debrief.ts} # prompt builders
  scenarios/anaphylaxis_pacu_v1.json
  public/{bg,monitor,evidence,video}/...
  env.d.ts
  package.json
  README.md
```

---

## 10) Security, Safety, Accessibility

- **Safety**: no PHI, no real patient faces; model never controls transitions.  
- **Accessibility**: keyboard equivalent for all mic flows, high‑contrast theme, captions textual, ARIA on buttons/sliders.  
- **Privacy**: speech transcripts used transiently; do not store raw audio.

---

## 11) Stretch (Post‑MVP)

- **Adaptive timers**; **hint tokens** economy; **ghost replay** (beat your timeline).  
- **Team mode** with role prompts and closed‑loop comms checklist.  
- **Veo micro‑clips per node** (pre‑generated) for cinematic motion.  
- **LMS export (xAPI/SCORM)** and **SSO/OIDC** for institutions.  
- **RAG/Vectara** for guideline citations in debrief (optional).

---

## 12) Judge Script (3 minutes)

1. **Intro (20 s):** “Voice‑only micro‑sim. You talk; the monitor reacts; Gemini explains; deterministic state machine guarantees safety.”  
2. **Run (90 s):** Speak *“IM adrenaline 0.5 mg”* → vitals animate; speak **“80 percent sure”**; give 8‑word teach‑back; proceed with **oxygen** and **fluids**; reach end state.  
3. **Debrief (30 s):** Show scored debrief + calibration and checklist; open analytics page (median time‑to‑adrenaline).  
4. **Close (20 s):** Show scenario JSON + FSM diagram, emphasize **deterministic branching**, **Vercel Edge**, and **Gemini as teacher, not controller**.
