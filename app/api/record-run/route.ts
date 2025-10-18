import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // TODO: Implement run recording persistence
    return NextResponse.json({ message: 'Record run endpoint - to be implemented' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record run' }, { status: 500 });
  }
}

