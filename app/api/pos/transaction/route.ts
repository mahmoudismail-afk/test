import { NextRequest, NextResponse } from 'next/server';
import { createTransaction, type TransactionPayload } from '@/lib/actions/pos';

export async function POST(request: NextRequest) {
  try {
    const body: TransactionPayload = await request.json();

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'No items in transaction' }, { status: 400 });
    }
    if (!body.payment_method) {
      return NextResponse.json({ error: 'Payment method required' }, { status: 400 });
    }

    const result = await createTransaction(body);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, transactionId: result.transactionId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
