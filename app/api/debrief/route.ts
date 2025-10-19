/**
 * Debrief API Route (Edge Function)
 * Generates comprehensive post-simulation feedback with Gemini
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDebrief, generateFallbackDebrief, type DebriefResponse } from '@/lib/llm/debrief';

export const runtime = 'edge';

interface DebriefRequest {
  history: Array<{
    t: number;
    nodeId: string;
    actionId: string;
    uncertainty?: number;
    teachback?: string;
    correct?: boolean;
  }>;
  scores: {
    total: number;
    timing: number;
    correctness: number;
    completeness: number;
    calibration: number;
  };
  outcome: string;
  top_misses?: string[];
  checklist_ticks?: string[];
  teachback_results?: { passed: number; total: number };
}

interface ErrorResponse {
  error: string;
  debrief?: DebriefResponse;
  source?: 'fallback';
}

export async function POST(request: NextRequest): Promise<NextResponse<DebriefResponse & { source: string; latency_ms?: number } | ErrorResponse>> {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: DebriefRequest = await request.json();

    const { history, scores, outcome, top_misses, checklist_ticks, teachback_results } = body;

    // Validate required fields
    if (!history || !scores || !outcome) {
      return NextResponse.json(
        { error: 'Missing required fields: history, scores, outcome' },
        { status: 400 }
      );
    }

    if (!Array.isArray(history) || history.length === 0) {
      return NextResponse.json(
        { error: 'History must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get Gemini API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not configured, using fallback debrief');
      
      const fallbackDebrief = generateFallbackDebrief({
        history,
        scores,
        outcome,
        top_misses,
        checklist_ticks,
        teachback_results
      });

      return NextResponse.json({
        ...fallbackDebrief,
        source: 'fallback'
      });
    }

    // Call Gemini with 5000ms timeout (increased for Gemini 2.5 Flash)
    try {
      const debrief = await generateDebrief(
        {
          history,
          scores,
          outcome,
          top_misses,
          checklist_ticks,
          teachback_results
        },
        apiKey,
        10000
      );

      const latency = Date.now() - startTime;

      return NextResponse.json({
        ...debrief,
        source: 'gemini',
        latency_ms: latency
      });

    } catch (geminiError) {
      // On timeout or error, return fallback debrief
      console.warn('Gemini debrief generation failed:', geminiError);

      const fallbackDebrief = generateFallbackDebrief({
        history,
        scores,
        outcome,
        top_misses,
        checklist_ticks,
        teachback_results
      });

      return NextResponse.json({
        ...fallbackDebrief,
        source: 'fallback'
      });
    }

  } catch (error) {
    console.error('Debrief API error:', error);

    // Return generic fallback on parsing error
    const genericDebrief: DebriefResponse = {
      headline: 'Simulation Completed',
      strengths: ['Completed the simulation'],
      misses: ['Review the timeline for improvement opportunities'],
      tip: 'Practice critical actions to improve timing and accuracy.',
      narrative: 'Your simulation has been recorded. Review your performance metrics to identify areas for improvement.'
    };

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        debrief: genericDebrief,
        source: 'fallback'
      },
      { status: 500 }
    );
  }
}
