# SimWard Quick Start Guide

**Phase 8 Complete** - Ready to test the full simulation!

---

## 🚀 Getting Started

### 1. Start the Development Server

```bash
npm run dev
```

Then open http://localhost:3000

---

## 🎮 Testing the Main Simulation

### Step 1: Navigate to Runner
Go to: http://localhost:3000/sim/runner

### Step 2: Select Scenario
Click on **"PACU Anaphylaxis"** card

### Step 3: Choose Mode
- **Teaching Mode** (recommended for first test): Shows captions, hints, teach-backs
- **Exam Mode**: Silent assessment, no hints

Click **"Start Simulation"** →

### Step 4: Interact with Voice
1. **Press Space bar** (or click the mic button)
2. Say one of these commands:
   - "IM adrenaline point five milligrams"
   - "give intramuscular adrenaline"
   - "airway and oxygen"
   - "five hundred mils fluids"

3. **Watch the magic happen**:
   - ✓ Action confirmed
   - Vitals change (HR, BP, SpO2, RR)
   - ECG waveform updates
   - Timer resets for next node
   - Caption appears (Teaching Mode)

### Step 5: Confidence Rating (Teaching Mode)
If prompted, say: **"80 percent"** or any number 0-100

### Step 6: Teach-Back (Teaching Mode)
If prompted, answer in ≤10 words, e.g.:
- "adrenaline reverses airway edema and shock"

### Step 7: Complete the Scenario
Continue making decisions until you reach an end state (2-3 minutes)

### Step 8: View Debrief
- See your scores (timing, correctness, completeness, calibration)
- Read AI-generated feedback
- Click **"View Analytics"** or **"Try Again"**

---

## 📊 Testing Analytics

Go to: http://localhost:3000/analytics

You should see:
- Total runs count
- Pass rate
- Median time to critical action
- Run history table with your completed simulation

**Try**:
- Filter by mode (Teaching/Exam)
- Delete a run
- View score breakdowns

---

## 🎨 Testing the Authoring Tool

Go to: http://localhost:3000/sim/author

### Import Existing Scenario:
1. Click **"Import Scenario"**
2. Navigate to `/public/scenarios/anaphylaxis_pacu_v1.json`
3. Select and upload
4. Explore the scenario structure

### Edit Metadata:
- Change the title
- Click **"Validate"** to check integrity
- Click **"View JSON"** to see the structure

### Export:
- Click **"Download"** to save as JSON
- Or **"Copy"** to clipboard

---

## 🧪 Test Pages (Still Available)

These test pages from earlier phases are still functional:

1. **/test-scenario** - Scenario loading validation
2. **/test-scoring** - Scoring algorithm demos
3. **/test-gemini** - AI caption & debrief testing
4. **/visual-demo** - Monitor animations & ECG
5. **/test** - Voice input testing

---

## 🎯 Quick Voice Commands Cheat Sheet

### Node S0 (Initial):
- "IM adrenaline" or "intramuscular adrenaline"
- "airway and oxygen" or "start oxygen"
- "IV fluids" or "five hundred mils fluids"

### Confidence Prompts:
- "80" or "80 percent" or "eighty percent"
- Any number 0-100

### Teach-Back Example:
- "adrenaline reverses edema and shock"
- "first line for anaphylaxis"

---

## 🐛 Troubleshooting

### Voice Not Working?
- **Browser**: Use Chrome or Edge (Web Speech API required)
- **Microphone**: Check browser permissions
- **Fallback**: Text input fallback planned for Phase 11

### Gemini API Errors?
- Check `.env.local` has `GEMINI_API_KEY`
- Fallback captions will be used automatically

### No Runs Showing in Analytics?
- Complete at least one full simulation
- Check browser console for localStorage errors
- Runs are saved automatically on simulation end

### Timer Not Working?
- This is a known issue if you navigate away and back
- Refresh the page to reset state

---

## 📱 Browser Support

| Browser | Voice | AI | Simulation | Notes |
|---------|-------|----|-----------|----|
| Chrome | ✅ | ✅ | ✅ | **Recommended** |
| Edge | ✅ | ✅ | ✅ | Chromium-based |
| Safari | ⚠️ | ✅ | ✅ | Limited Web Speech API |
| Firefox | ❌ | ✅ | ✅ | No Web Speech API |

---

## 🎬 Demo Script (3 minutes)

### For Presentations:

**0:00-0:30** - "SimWard is a voice-first clinical simulation platform..."
- Show main page
- Select scenario
- Choose Teaching Mode

**0:30-2:00** - Live Demo
- Press Space
- Say "IM adrenaline"
- Show vitals change
- Show caption
- Say confidence
- Complete 2-3 more actions

**2:00-2:30** - Debrief
- Show score breakdown
- Read AI feedback
- Highlight calibration metric

**2:30-3:00** - Technical
- Show analytics dashboard
- Mention deterministic FSM
- Highlight Edge functions
- Show authoring tool

---

## 📈 Expected Results

### First Run (Teaching Mode):
- **Timing**: 20-30/40 (depends on speed)
- **Correctness**: 30-40/40 (if you choose right actions)
- **Completeness**: 10-15/20 (based on checklist)
- **Calibration**: Varies based on confidence accuracy
- **Total**: 60-85/100 typically

### Goal:
- Score ≥70 = Pass
- Speed + Correct choices = Higher score
- Use hints sparingly (they cost points)

---

## 🔄 Next Steps

After testing Phase 8:
- **Phase 9**: API persistence, Supabase integration
- **Phase 10**: Enhanced analytics, branch analysis
- **Phase 11**: Evidence overlays, accessibility
- **Phase 12**: Testing & polish
- **Phase 13**: Production deployment

---

## 💡 Tips

1. **Use Chrome** for the best experience
2. **Enable microphone** when prompted
3. **Speak clearly** but naturally
4. **Watch the timer** - it's strict in Exam Mode
5. **Check the checklist** to track your progress
6. **Try both modes** - Teaching for learning, Exam for assessment
7. **Review analytics** after multiple runs for insights

---

## 🆘 Need Help?

Check these files:
- `PROGRESS.md` - Overall project status
- `PHASE8_SUMMARY.md` - Detailed implementation notes
- `IMPLEMENTATION_PLAN.md` - Full technical spec
- `simward_voice_first_spec.md` - Original requirements

Or check the browser console for detailed error messages.

---

**Happy Testing!** 🎉

The simulation is fully functional. Have fun practicing emergency medicine! 🏥

