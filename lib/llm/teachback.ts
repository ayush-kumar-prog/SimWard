/**
 * Teach-Back Grading
 * Evaluates user's teach-back answers against rubric criteria
 */

interface TeachBackRubric {
  prompt: string;
  rubric: string[]; // Array of required keywords/concepts
}

interface TeachBackResult {
  passed: boolean;
  score: number; // 0-1 based on keyword matches
  matched_concepts: string[];
  missing_concepts: string[];
}

/**
 * Grade a teach-back answer using keyword matching
 * Simple implementation: checks for presence of key concepts in the user's answer
 * 
 * @param userAnswer The user's teach-back response (≤10 words ideally)
 * @param rubric Array of key concepts that should be present
 * @param passThreshold Minimum fraction of concepts needed to pass (default: 0.5)
 * @returns TeachBackResult with pass/fail and matched concepts
 */
export function gradeTeachback(
  userAnswer: string,
  rubric: string[],
  passThreshold: number = 0.5
): TeachBackResult {
  if (!userAnswer || !rubric || rubric.length === 0) {
    return {
      passed: false,
      score: 0,
      matched_concepts: [],
      missing_concepts: rubric || []
    };
  }

  // Normalize user answer: lowercase, remove punctuation
  const normalizedAnswer = userAnswer
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const matched: string[] = [];
  const missing: string[] = [];

  // Check each rubric concept
  rubric.forEach((concept) => {
    const normalizedConcept = concept.toLowerCase();
    
    // Check for exact phrase match
    if (normalizedAnswer.includes(normalizedConcept)) {
      matched.push(concept);
      return;
    }

    // Check for word-level matches (all words of concept present)
    const conceptWords = normalizedConcept.split(/\s+/);
    const allWordsPresent = conceptWords.every((word) => 
      normalizedAnswer.includes(word)
    );

    if (allWordsPresent) {
      matched.push(concept);
    } else {
      missing.push(concept);
    }
  });

  const score = matched.length / rubric.length;
  const passed = score >= passThreshold;

  return {
    passed,
    score,
    matched_concepts: matched,
    missing_concepts: missing
  };
}

/**
 * Grade teach-back using Gemini API for semantic understanding
 * More sophisticated than keyword matching, but requires API call
 * 
 * @param userAnswer The user's teach-back response
 * @param rubric Array of key concepts
 * @param apiKey Gemini API key
 * @param timeout Timeout in milliseconds
 * @returns TeachBackResult with AI-evaluated pass/fail
 */
export async function gradeTeachbackWithGemini(
  userAnswer: string,
  rubric: string[],
  apiKey: string,
  timeout: number = 1500
): Promise<TeachBackResult> {
  const prompt = `You are evaluating a medical trainee's teach-back answer.

Question rubric requires these concepts: ${rubric.join(', ')}

Trainee's answer: "${userAnswer}"

Task: Evaluate if the trainee's answer demonstrates understanding of the key concepts. The answer should be brief (≤10 words ideally) but capture the essence.

Respond with JSON only:
{
  "passed": true/false,
  "score": 0.0-1.0,
  "matched_concepts": ["concept1", ...],
  "missing_concepts": ["concept2", ...]
}

Be generous if the concepts are expressed in different words but mean the same thing.`;

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
            temperature: 0.3,
            maxOutputTokens: 10000,  // Gemini 2.5 Flash uses up to 600 thinking tokens, plus need room for output
            topP: 0.9,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Fallback to keyword matching on API error
      return gradeTeachback(userAnswer, rubric);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!textResponse) {
      return gradeTeachback(userAnswer, rubric);
    }

    // Parse JSON response (handle markdown code blocks)
    let jsonText = textResponse;
    const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || textResponse.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const result: TeachBackResult = JSON.parse(jsonText);

    // Validate response structure
    if (typeof result.passed !== 'boolean' || typeof result.score !== 'number') {
      return gradeTeachback(userAnswer, rubric);
    }

    return result;

  } catch (error) {
    clearTimeout(timeoutId);
    
    // Fallback to keyword matching on any error
    return gradeTeachback(userAnswer, rubric);
  }
}

/**
 * Build a feedback message for the teach-back result
 */
export function buildTeachbackFeedback(result: TeachBackResult): string {
  if (result.passed) {
    if (result.score === 1.0) {
      return '✓ Excellent! You captured all key concepts.';
    } else {
      return `✓ Good! You covered ${result.matched_concepts.length} key concept${result.matched_concepts.length > 1 ? 's' : ''}.`;
    }
  } else {
    if (result.matched_concepts.length > 0) {
      return `Partial understanding. Missing: ${result.missing_concepts.join(', ')}`;
    } else {
      return `Not quite. Key concepts: ${result.missing_concepts.join(', ')}`;
    }
  }
}

