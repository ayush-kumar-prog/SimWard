/**
 * Caption Generation with Gemini
 * Generates educational explanations for actions taken during Teaching Mode
 */

import { VitalSigns } from '../types';

interface CaptionContext {
  scenario_id: string;
  node_id: string;
  last_action: string;
  vitals_snapshot: VitalSigns;
  rubric_snippets?: string[];
  fallback_key?: string;
}

/**
 * Build a prompt for Gemini to generate a caption explaining why an action was performed
 */
export function buildCaptionPrompt(context: CaptionContext): string {
  const { scenario_id, node_id, last_action, vitals_snapshot, rubric_snippets = [] } = context;

  const vitalsText = `HR ${vitals_snapshot.hr} bpm, BP ${vitals_snapshot.bp_sys}/${vitals_snapshot.bp_dia} mmHg, SpO2 ${vitals_snapshot.spo2}%, RR ${vitals_snapshot.rr}/min`;

  const rubricContext = rubric_snippets.length > 0 
    ? `\n\nClinical Guidelines:\n${rubric_snippets.join('\n')}` 
    : '';

  return `You are a clinical educator providing real-time feedback during medical simulation training.

Scenario: ${scenario_id}
Current State: ${node_id}
Action Taken: ${last_action}
Vital Signs: ${vitalsText}${rubricContext}

Task: Explain in ≤260 characters why this action was performed and what clinical reasoning supports it. Be concise, educational, and supportive. Focus on the "why" behind the decision.

Response (≤260 chars):`;
}

/**
 * Call Gemini API to generate a caption
 * @param context The context for caption generation
 * @param apiKey Gemini API key
 * @param timeout Timeout in milliseconds (default: 3500ms for Gemini 2.5)
 * @returns Generated caption string
 */
export async function generateCaption(
  context: CaptionContext,
  apiKey: string,
  timeout: number = 10000
): Promise<string> {
  const prompt = buildCaptionPrompt(context);

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
            temperature: 0.7,
            maxOutputTokens: 10000,  // Gemini 2.5 Flash uses up to 600 thinking tokens, plus need room for actual output
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

    const data = await response.json();
    
    // Extract text from Gemini response
    const caption = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!caption) {
      // Log only essential info for debugging
      console.warn('Gemini response missing caption:', {
        finishReason: data.candidates?.[0]?.finishReason,
        thoughtsTokens: data.usageMetadata?.thoughtsTokenCount,
        totalTokens: data.usageMetadata?.totalTokenCount,
      });
      throw new Error('No caption generated from Gemini response');
    }

    // Ensure caption is within character limit
    return caption.length > 260 ? caption.substring(0, 257) + '...' : caption;

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Caption generation timeout');
      }
      throw error;
    }
    
    throw new Error('Unknown error generating caption');
  }
}
