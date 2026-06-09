import { NextRequest, NextResponse } from 'next/server';
import { logPettyCash } from '@/lib/actions/pos';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await logPettyCash(body);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
