/**
 * Parse Action API Route
 * Phase 3: Voice Interface & Action Parsing
 * 
 * Edge function that maps speech transcript to allowed actions
 * Uses fuzzy matching for medical terminology
 */

import { NextRequest, NextResponse } from 'next/server';
import { matchActionToTranscript, type ActionCandidate } from '@/lib/voice/match';

export const runtime = 'edge';

/**
 * Request body schema
 */
interface ParseActionRequest {
  transcript: string;
  allowed: ActionCandidate[];
  threshold?: number;
  disambiguationThreshold?: number;
}

/**
 * Success response
 */
interface SuccessResponse {
  actionId: string;
  confidence: number;
  matched: string;
}

/**
 * Disambiguation response
 */
interface DisambiguationResponse {
  error: 'disambiguation_needed';
  suggestions: Array<{
    id: string;
    label: string;
    score: number;
  }>;
}

/**
 * No match response
 */
interface NoMatchResponse {
  error: 'no_match';
  suggestions: Array<{
    id: string;
    label: string;
  }>;
}

/**
 * Error response
 */
interface ErrorResponse {
  error: string;
  message?: string;
}

type ParseActionResponse =
  | SuccessResponse
  | DisambiguationResponse
  | NoMatchResponse
  | ErrorResponse;

/**
 * Validate request body
 */
function validateRequest(body: any): {
  valid: boolean;
  error?: string;
  data?: ParseActionRequest;
} {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  if (typeof body.transcript !== 'string') {
    return { valid: false, error: 'transcript must be a string' };
  }

  if (!Array.isArray(body.allowed)) {
    return { valid: false, error: 'allowed must be an array' };
  }

  for (const action of body.allowed) {
    if (typeof action.id !== 'string' || typeof action.label !== 'string') {
      return { valid: false, error: 'Each action must have id and label strings' };
    }
  }

  return {
    valid: true,
    data: {
      transcript: body.transcript,
      allowed: body.allowed,
      threshold: body.threshold,
      disambiguationThreshold: body.disambiguationThreshold,
    },
  };
}

/**
 * POST /api/parse-action
 * 
 * Match a speech transcript to one of the allowed actions
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'validation_error', message: validation.error },
        { status: 400 }
      );
    }

    const { transcript, allowed, threshold, disambiguationThreshold } = validation.data!;

    // Perform matching
    const result = matchActionToTranscript(
      transcript,
      allowed,
      threshold,
      disambiguationThreshold
    );

    // Handle different result types
    if ('success' in result && result.success) {
      const response: SuccessResponse = {
        actionId: result.match.actionId,
        confidence: result.match.score,
        matched: result.match.matched,
      };
      return NextResponse.json(response, { status: 200 });
    }

    if ('needsDisambiguation' in result) {
      const response: DisambiguationResponse = {
        error: 'disambiguation_needed',
        suggestions: result.candidates,
      };
      return NextResponse.json(response, { status: 200 });
    }

    if ('noMatch' in result) {
      const response: NoMatchResponse = {
        error: 'no_match',
        suggestions: result.suggestions,
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Should never reach here
    return NextResponse.json(
      { error: 'unknown_error', message: 'Unexpected result type' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Parse action error:', error);
    
    return NextResponse.json(
      {
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/parse-action
 * 
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'parse-action',
    status: 'healthy',
    runtime: 'edge',
  });
}
