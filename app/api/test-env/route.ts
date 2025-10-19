/**
 * Test endpoint to verify environment variables are loaded
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  const keyPrefix = process.env.GEMINI_API_KEY 
    ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' 
    : 'NOT SET';

  return NextResponse.json({
    gemini_api_key_loaded: hasApiKey,
    key_prefix: keyPrefix,
    all_env_keys: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('NEXT')),
    note: hasApiKey 
      ? 'API key is loaded and ready!' 
      : 'API key NOT found. Check .env.local file and restart dev server.'
  });
}

