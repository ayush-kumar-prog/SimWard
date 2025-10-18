import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // TODO: Implement Gemini debrief generation
    return NextResponse.json({ message: 'Debrief endpoint - to be implemented' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate debrief' }, { status: 500 });
  }
}

