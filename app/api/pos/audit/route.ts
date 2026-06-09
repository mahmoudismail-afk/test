import { NextRequest, NextResponse } from 'next/server';
import { logCartVoid } from '@/lib/actions/pos';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await logCartVoid(body);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
