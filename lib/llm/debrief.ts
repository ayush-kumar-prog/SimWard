/**
 * Debrief Generation with Gemini
 * Generates comprehensive post-simulation feedback with scores and insights
 */

interface HistoryStep {
  t: number;
  nodeId: string;
  actionId: string;
  uncertainty?: number;
  teachback?: string;
  correct?: boolean;
}

interface Scores {
  total: number;
  timing: number;
  correctness: number;
  completeness: number;
  calibration: number;
}

interface DebriefData {
  history: HistoryStep[];
  scores: Scores;
  outcome: string;
  top_misses?: string[];
  checklist_ticks?: string[];
  teachback_results?: { passed: number; total: number };
}

export interface DebriefResponse {
  headline: string;
  strengths: string[];
  misses: string[];
  tip: string;
  narrative: string;
}

/**
 * Build a structured prompt for Gemini to generate a debrief
 */
export function buildDebriefPrompt(data: DebriefData): string {
  const { history, scores, outcome, top_misses = [], checklist_ticks = [], teachback_results } = data;

  // Format timeline
  const timelineText = history
    .map((step, idx) => {
      const correctMarker = step.correct !== undefined ? (step.correct ? '✓' : '✗') : '';
      const uncertaintyText = step.uncertainty !== undefined ? ` (${Math.round(step.uncertainty * 100)}% confident)` : '';
      const teachbackText = step.teachback ? ` → "${step.teachback}"` : '';
      return `  ${idx + 1}. t=${step.t}s: ${step.actionId} ${correctMarker}${uncertaintyText}${teachbackText}`;
    })
    .join('\n');

  // Format scores
  const scoresText = `
  Total Score: ${scores.total}/100
  - Timing: ${scores.timing}/40
  - Correctness: ${scores.correctness}/40
  - Completeness: ${scores.completeness}/20
  - Calibration: ${scores.calibration}/100 (reported separately)`;

  // Format additional context
  const missesText = top_misses.length > 0 ? `\n\nActions Not Taken:\n${top_misses.map(m => `  - ${m}`).join('\n')}` : '';
  const checklistText = checklist_ticks.length > 0 ? `\n\nChecklist Completed: ${checklist_ticks.join(', ')}` : '';
  const teachbackText = teachback_results ? `\n\nTeach-Back Results: ${teachback_results.passed}/${teachback_results.total} passed` : '';

  return `You are a clinical educator providing post-simulation debrief for medical training.

Outcome: ${outcome}

Timeline of Actions:
${timelineText}

Performance Scores:${scoresText}${missesText}${checklistText}${teachbackText}

Task: Generate a structured debrief with the following components:
1. Headline (≤50 chars): Summarize the overall performance
2. Strengths (2-4 items): Specific actions done well with timestamps
3. Misses (1-3 items): Important actions not taken or incorrect choices (be constructive)
4. Tip (≤100 chars): One actionable clinical pearl for future scenarios
5. Narrative (≤300 words): Educational summary of the performance, clinical reasoning, and learning points

Format your response as JSON:
{
  "headline": "...",
  "strengths": ["...", "..."],
  "misses": ["...", "..."],
  "tip": "...",
  "narrative": "..."
}`;
}

/**
 * Call Gemini API to generate a debrief
 * @param data The debrief data including history and scores
 * @param apiKey Gemini API key
 * @param timeout Timeout in milliseconds (default: 3000ms for longer generation)
 * @returns Structured debrief response
 */
export async function generateDebrief(
  data: DebriefData,
  apiKey: string,
  timeout: number = 3000
): Promise<DebriefResponse> {
  const prompt = buildDebriefPrompt(data);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 10000,  // Gemini 2.5 Flash needs ~1000+ for thinking, plus actual debrief output
            topP: 0.95,
            topK: 40,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    
    // Extract text from Gemini response
    const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!textResponse) {
      throw new Error('No debrief generated from Gemini response');
    }

    // Parse JSON from response (handle markdown code blocks if present)
    let jsonText = textResponse;
    const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || textResponse.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const debrief: DebriefResponse = JSON.parse(jsonText);

    // Validate response structure
    if (!debrief.headline || !debrief.strengths || !debrief.misses || !debrief.tip || !debrief.narrative) {
      throw new Error('Invalid debrief structure from Gemini');
    }

    return debrief;

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Debrief generation timeout');
      }
      throw error;
    }
    
    throw new Error('Unknown error generating debrief');
  }
}

/**
 * Generate a fallback debrief when Gemini is unavailable
 */
export function generateFallbackDebrief(data: DebriefData): DebriefResponse {
  const { scores, outcome, history } = data;

  // Determine performance level
  const performanceLevel = scores.total >= 80 ? 'excellent' : scores.total >= 60 ? 'good' : 'needs improvement';

  // Extract strengths based on correct actions
  const strengths: string[] = [];
  history.forEach((step) => {
    if (step.correct) {
      strengths.push(`Performed ${step.actionId} at t=${step.t}s`);
    }
  });

  if (strengths.length === 0) {
    strengths.push('Completed the simulation');
  }

  // Extract misses based on incorrect actions
  const misses: string[] = [];
  history.forEach((step) => {
    if (step.correct === false) {
      misses.push(`${step.actionId} was not optimal at t=${step.t}s`);
    }
  });

  if (misses.length === 0) {
    misses.push('Consider reviewing timing optimization');
  }

  return {
    headline: `${outcome} - Performance ${performanceLevel}`,
    strengths: strengths.slice(0, 4),
    misses: misses.slice(0, 3),
    tip: 'Review critical action timing and consider guideline recommendations.',
    narrative: `You achieved a total score of ${scores.total}/100 with ${outcome}. Your timing score was ${scores.timing}/40, correctness ${scores.correctness}/40, and completeness ${scores.completeness}/20. Continue practicing to improve your clinical decision-making speed and accuracy.`
  };
}
