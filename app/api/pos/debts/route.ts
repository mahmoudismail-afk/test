import { NextResponse } from 'next/server';
import { getDebts } from '@/lib/actions/pos';

export async function GET() {
  try {
    const debtors = await getDebts();
    return NextResponse.json({ debtors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
