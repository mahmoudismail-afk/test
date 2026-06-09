import { NextRequest, NextResponse } from 'next/server';
import { logDebtPayment } from '@/lib/actions/pos';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { debt_id, amount_usd, amount_lbp, notes } = body;

    if (!debt_id)       return NextResponse.json({ error: 'debt_id required' }, { status: 400 });
    if (!amount_usd || amount_usd <= 0) return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });

    const result = await logDebtPayment({ debt_id, amount_usd, amount_lbp: amount_lbp ?? 0, notes });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
