/**
 * Voice Action Matching
 * Phase 3: Voice Interface & Action Parsing
 * 
 * Fuzzy matching of spoken phrases to allowed actions
 * Handles medical terminology, typos, and variations
 */

/**
 * Action candidate for matching
 */
export interface ActionCandidate {
  id: string;
  label: string;
  aliases?: string[];
}

/**
 * Match result
 */
export interface MatchResult {
  actionId: string;
  score: number;
  matched: string; // Which text matched (label or alias)
}

/**
 * Disambiguation result when multiple matches are close
 */
export interface DisambiguationResult {
  needsDisambiguation: true;
  candidates: Array<{
    id: string;
    label: string;
    score: number;
  }>;
}

/**
 * No match result
 */
export interface NoMatchResult {
  noMatch: true;
  suggestions: Array<{
    id: string;
    label: string;
  }>;
}

/**
 * Combined match response
 */
export type MatchResponse =
  | { success: true; match: MatchResult }
  | DisambiguationResult
  | NoMatchResult;

/**
 * Normalize text for matching
 * - Lowercase
 * - Remove filler words
 * - Trim whitespace
 */
export function normalizeTranscript(text: string): string {
  const fillerWords = ['um', 'uh', 'er', 'ah', 'like', 'you know', 'so'];
  
  let normalized = text.toLowerCase().trim();
  
  // Remove filler words
  fillerWords.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  });
  
  // Normalize multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy string matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity ratio (0-1) using Levenshtein distance
 */
function similarityRatio(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  
  if (maxLen === 0) return 1.0;
  
  return 1 - distance / maxLen;
}

/**
 * Calculate token overlap score
 * Measures how many words from transcript appear in the action text
 */
function tokenOverlapScore(transcript: string, actionText: string): number {
  const transcriptTokens = transcript.split(/\s+/);
  const actionTokens = actionText.split(/\s+/);
  
  let matches = 0;
  
  for (const token of transcriptTokens) {
    // Check for exact match or fuzzy match
    for (const actionToken of actionTokens) {
      if (token === actionToken || similarityRatio(token, actionToken) > 0.8) {
        matches++;
        break;
      }
    }
  }
  
  // Score is percentage of transcript tokens found
  return transcriptTokens.length > 0 ? matches / transcriptTokens.length : 0;
}

/**
 * Calculate overall match score for an action
 */
function calculateMatchScore(
  transcript: string,
  label: string,
  aliases: string[] = []
): { score: number; matched: string } {
  const normalizedTranscript = normalizeTranscript(transcript);
  
  // Check label
  const normalizedLabel = normalizeTranscript(label);
  let bestScore = 0;
  let bestMatch = label;
  
  // Token overlap score for label
  const labelTokenScore = tokenOverlapScore(normalizedTranscript, normalizedLabel);
  
  // Similarity ratio for label
  const labelSimilarity = similarityRatio(normalizedTranscript, normalizedLabel);
  
  // Combined score (weighted average)
  bestScore = labelTokenScore * 0.6 + labelSimilarity * 0.4;
  
  // Check each alias
  for (const alias of aliases) {
    const normalizedAlias = normalizeTranscript(alias);
    const aliasTokenScore = tokenOverlapScore(normalizedTranscript, normalizedAlias);
    const aliasSimilarity = similarityRatio(normalizedTranscript, normalizedAlias);
    const aliasScore = aliasTokenScore * 0.6 + aliasSimilarity * 0.4;
    
    if (aliasScore > bestScore) {
      bestScore = aliasScore;
      bestMatch = alias;
    }
  }
  
  return { score: bestScore, matched: bestMatch };
}

/**
 * Match transcript to allowed actions
 * 
 * @param transcript - User's spoken text
 * @param allowedActions - List of available actions
 * @param threshold - Minimum score to consider a match (default: 0.5)
 * @param disambiguationThreshold - Score difference for disambiguation (default: 0.1)
 * @returns Match response
 */
export function matchActionToTranscript(
  transcript: string,
  allowedActions: ActionCandidate[],
  threshold: number = 0.5,
  disambiguationThreshold: number = 0.1
): MatchResponse {
  if (!transcript || transcript.trim().length === 0) {
    return {
      noMatch: true,
      suggestions: allowedActions.map(a => ({ id: a.id, label: a.label })),
    };
  }
  
  if (allowedActions.length === 0) {
    return {
      noMatch: true,
      suggestions: [],
    };
  }
  
  // Calculate scores for all actions
  const results: MatchResult[] = allowedActions.map(action => {
    const { score, matched } = calculateMatchScore(
      transcript,
      action.label,
      action.aliases || []
    );
    
    return {
      actionId: action.id,
      score,
      matched,
    };
  });
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  const bestMatch = results[0];
  const secondBest = results[1];
  
  // No good matches
  if (bestMatch.score < threshold) {
    return {
      noMatch: true,
      suggestions: allowedActions
        .slice(0, 3)
        .map(a => ({ id: a.id, label: a.label })),
    };
  }
  
  // Check for disambiguation need
  if (
    secondBest &&
    secondBest.score >= threshold &&
    bestMatch.score - secondBest.score <= disambiguationThreshold
  ) {
    // Multiple candidates are close
    const candidates = results
      .filter(r => r.score >= threshold)
      .slice(0, 3)
      .map(r => ({
        id: r.actionId,
        label: allowedActions.find(a => a.id === r.actionId)?.label || '',
        score: r.score,
      }));
    
    return {
      needsDisambiguation: true,
      candidates,
    };
  }
  
  // Clear winner
  return {
    success: true,
    match: bestMatch,
  };
}

/**
 * Handle disambiguation input
 * User says "option 1", "option 2", or repeats a label
 * 
 * @param transcript - User's disambiguation response
 * @param candidates - Array of candidate actions from disambiguation
 * @returns Selected action ID or null
 */
export function disambiguate(
  transcript: string,
  candidates: Array<{ id: string; label: string }>
): string | null {
  const normalized = normalizeTranscript(transcript);
  
  // Check for "option X" or "number X" patterns
  const optionMatch = normalized.match(/(?:option|number|choice)\s*(\d+)/);
  if (optionMatch) {
    const index = parseInt(optionMatch[1], 10) - 1;
    if (index >= 0 && index < candidates.length) {
      return candidates[index].id;
    }
  }
  
  // Check for single digit
  const digitMatch = normalized.match(/^(\d+)$/);
  if (digitMatch) {
    const index = parseInt(digitMatch[1], 10) - 1;
    if (index >= 0 && index < candidates.length) {
      return candidates[index].id;
    }
  }
  
  // Try matching against labels again
  let bestScore = 0;
  let bestId: string | null = null;
  
  for (const candidate of candidates) {
    const score = similarityRatio(normalized, normalizeTranscript(candidate.label));
    if (score > bestScore && score > 0.6) {
      bestScore = score;
      bestId = candidate.id;
    }
  }
  
  return bestId;
}

/**
 * Extract confidence percentage from speech
 * User says "I'm 70 percent sure" or "80%"
 * 
 * @param transcript - User's spoken text
 * @returns Confidence value (0-1) or null if not found
 */
export function extractConfidence(transcript: string): number | null {
  const normalized = normalizeTranscript(transcript);
  
  // Match patterns like "70 percent", "80%", "I'm 90 percent sure"
  const patterns = [
    /(\d+)\s*percent/,
    /(\d+)\s*%/,
    /(\d+)\s*per\s*cent/,
  ];
  
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      if (value >= 0 && value <= 100) {
        return value / 100;
      }
    }
  }
  
  return null;
}
