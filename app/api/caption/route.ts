/**
 * Caption API Route (Edge Function)
 * Generates educational captions for actions in Teaching Mode
 * Returns fallback caption on timeout or error
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCaption } from '@/lib/llm/caption';
import type { VitalSigns } from '@/lib/types';

export const runtime = 'edge';

interface CaptionRequest {
  scenario_id: string;
  node_id: string;
  last_action: string;
  state_snapshot: VitalSigns;
  rubric_snippets?: string[];
  fallback_key?: string;
  fallback_text?: string;
}

interface CaptionResponse {
  caption: string;
  source: 'gemini' | 'fallback';
  latency_ms?: number;
}

interface ErrorResponse {
  error: string;
  caption?: string;
  source?: 'fallback';
}

export async function POST(request: NextRequest): Promise<NextResponse<CaptionResponse | ErrorResponse>> {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: CaptionRequest = await request.json();

    const { 
      scenario_id, 
      node_id, 
      last_action, 
      state_snapshot, 
      rubric_snippets,
      fallback_key,
      fallback_text 
    } = body;

    // Validate required fields
    if (!scenario_id || !node_id || !last_action || !state_snapshot) {
      return NextResponse.json(
        { error: 'Missing required fields: scenario_id, node_id, last_action, state_snapshot' },
        { status: 400 }
      );
    }

    // Get Gemini API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not configured, using fallback caption');
      
      if (fallback_text) {
        return NextResponse.json({
          caption: fallback_text,
          source: 'fallback'
        });
      }

      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured and no fallback provided' },
        { status: 500 }
      );
    }

    // Call Gemini with 3500ms timeout (increased for Gemini 2.5 Flash response time)
    try {
      const caption = await generateCaption(
        {
          scenario_id,
          node_id,
          last_action,
          vitals_snapshot: state_snapshot,
          rubric_snippets,
          fallback_key
        },
        apiKey,
        10000
      );

      const latency = Date.now() - startTime;

      return NextResponse.json({
        caption,
        source: 'gemini',
        latency_ms: latency
      });

    } catch (geminiError) {
      // On timeout or error, return fallback caption
      console.warn('Gemini caption generation failed:', geminiError);

      if (fallback_text) {
        return NextResponse.json({
          caption: fallback_text,
          source: 'fallback'
        });
      }

      // If no fallback provided, return generic caption
      return NextResponse.json({
        caption: 'Action performed. Monitor patient response and vital signs.',
        source: 'fallback'
      });
    }

  } catch (error) {
    console.error('Caption API error:', error);

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        caption: 'Action recorded. Continue monitoring patient.',
        source: 'fallback'
      },
      { status: 500 }
    );
  }
}
