'use server';

import { query, getAdmin } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ── Helper: get current cashier profile id ───────────────────
async function getCurrentCashierId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { rows } = await query(
      'SELECT id FROM profiles WHERE auth_id = $1 LIMIT 1',
      [user.id]
    );
    return rows[0]?.id ?? null;
  } catch { return null; }
}

// ── Admin Supabase client (service role) ─────────────────────
// Used for all write operations — 100% reliable, no RPC needed
function db() { return getAdmin(); }

// ════════════════════════════════════════════════════════════
// SESSIONS
// ════════════════════════════════════════════════════════════

export async function openSession(openingFloat = 0) {
  const cashierId = await getCurrentCashierId();
  const { data, error } = await db()
    .from('pos_sessions')
    .insert({ cashier_id: cashierId, opening_float: openingFloat, status: 'open' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function closeSession(sessionId: string, closingFloat?: number) {
  const { data, error } = await db()
    .from('pos_sessions')
    .update({ status: 'closed', closed_at: new Date().toISOString(), closing_float: closingFloat ?? null })
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getActiveSession() {
  const cashierId = await getCurrentCashierId();
  if (!cashierId) return null;
  const { rows } = await query(
    `SELECT * FROM pos_sessions WHERE cashier_id = $1 AND status = 'open'
     ORDER BY opened_at DESC LIMIT 1`,
    [cashierId]
  );
  return rows[0] ?? null;
}

// ════════════════════════════════════════════════════════════
// TRANSACTIONS
// ════════════════════════════════════════════════════════════

export interface TransactionPayload {
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price_usd: number;
    total_usd: number;
  }[];
  payment_method: 'cash_usd' | 'cash_lbp' | 'card' | 'on_account';
  subtotal_usd: number;
  subtotal_lbp: number;
  lbp_rate: number;
  cash_tendered_usd?: number | null;
  cash_tendered_lbp?: number | null;
  change_usd?: number | null;
  change_lbp?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  session_id?: string | null;
}

export async function createTransaction(payload: TransactionPayload) {
  const cashierId = await getCurrentCashierId();

  try {
    // 1. Insert transaction header — use .from() to guarantee RETURNING works
    const { data: tx, error: txErr } = await db()
      .from('pos_transactions')
      .insert({
        session_id:        payload.session_id     ?? null,
        cashier_id:        cashierId,
        payment_method:    payload.payment_method,
        subtotal_usd:      payload.subtotal_usd,
        subtotal_lbp:      payload.subtotal_lbp,
        lbp_rate:          payload.lbp_rate,
        cash_tendered_usd: payload.cash_tendered_usd ?? null,
        cash_tendered_lbp: payload.cash_tendered_lbp ?? null,
        change_usd:        payload.change_usd     ?? null,
        change_lbp:        payload.change_lbp     ?? null,
        customer_name:     payload.customer_name  ?? null,
      })
      .select('id')
      .single();

    if (txErr) throw new Error(txErr.message);
    if (!tx?.id) throw new Error('Transaction insert returned no ID');
    const transactionId = tx.id;

    // 2. Insert line items
    if (payload.items.length > 0) {
      const { error: itemsErr } = await db()
        .from('pos_transaction_items')
        .insert(payload.items.map(item => ({
          transaction_id: transactionId,
          product_id:     item.product_id,
          product_name:   item.product_name,
          quantity:       item.quantity,
          unit_price_usd: item.unit_price_usd,
          total_usd:      item.total_usd,
        })));
      if (itemsErr) throw new Error(itemsErr.message);
    }

    // 3. Decrement stock for each item
    for (const item of payload.items) {
      // Read current stock then update (Supabase JS doesn't support arithmetic updates directly)
      const { data: prod } = await db()
        .from('pos_products')
        .select('stock_qty')
        .eq('id', item.product_id)
        .single();

      const newStock = Math.max(0, (prod?.stock_qty ?? 0) - item.quantity);
      await db()
        .from('pos_products')
        .update({ stock_qty: newStock })
        .eq('id', item.product_id);
    }

    // 4. On-account → upsert debt record
    if (payload.payment_method === 'on_account' && payload.customer_name) {
      const { rows: debtRows } = await query(
        'SELECT id, balance_usd FROM pos_debts WHERE LOWER(customer_name) = LOWER($1) LIMIT 1',
        [payload.customer_name]
      );
      if (debtRows.length > 0) {
        const newBalance = parseFloat(debtRows[0].balance_usd) + payload.subtotal_usd;
        await db()
          .from('pos_debts')
          .update({ balance_usd: newBalance })
          .eq('id', debtRows[0].id);
      } else {
        await db()
          .from('pos_debts')
          .insert({
            customer_name:  payload.customer_name,
            customer_phone: payload.customer_phone ?? null,
            balance_usd:    payload.subtotal_usd,
          });
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/pos-history');
    return { success: true, transactionId };
  } catch (err: any) {
    console.error('[createTransaction]', err.message);
    return { error: err.message };
  }
}

// ════════════════════════════════════════════════════════════
// CART AUDIT LOG
// ════════════════════════════════════════════════════════════

export async function logCartVoid(payload: {
  action: 'item_deleted' | 'cart_voided' | 'qty_reduced';
  product_id?: string;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  session_id?: string;
  reason?: string;
}) {
  try {
    const cashierId = await getCurrentCashierId();
    const { error } = await db()
      .from('pos_cart_audit_log')
      .insert({
        cashier_id:   cashierId,
        action:       payload.action,
        product_id:   payload.product_id   ?? null,
        product_name: payload.product_name ?? null,
        quantity:     payload.quantity     ?? null,
        unit_price:   payload.unit_price   ?? null,
        session_id:   payload.session_id   ?? null,
        reason:       payload.reason       ?? null,
      });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ════════════════════════════════════════════════════════════
// PETTY CASH
// ════════════════════════════════════════════════════════════

export async function logPettyCash(payload: {
  flow: 'in' | 'out';
  amount_usd: number;
  amount_lbp: number;
  tag: string;
  notes?: string;
  session_id?: string;
}) {
  const cashierId = await getCurrentCashierId();
  try {
    const { error } = await db()
      .from('pos_petty_cash')
      .insert({
        session_id:  payload.session_id ?? null,
        cashier_id:  cashierId,
        flow:        payload.flow,
        amount_usd:  payload.amount_usd,
        amount_lbp:  payload.amount_lbp,
        tag:         payload.tag,
        notes:       payload.notes ?? null,
      });
    if (error) throw new Error(error.message);
    revalidatePath('/z-report');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}


// ════════════════════════════════════════════════════════════
// DEBTS
// ════════════════════════════════════════════════════════════

export async function getDebts() {
  const { rows } = await query(
    `SELECT id, customer_name, customer_phone, balance_usd, notes, updated_at
     FROM pos_debts WHERE balance_usd > 0 ORDER BY balance_usd DESC`
  );
  return rows;
}

export async function logDebtPayment(payload: {
  debt_id: string;
  amount_usd: number;
  amount_lbp: number;
  notes?: string;
}) {
  const cashierId = await getCurrentCashierId();
  try {
    // 1. Record payment via Supabase client (reliable INSERT)
    const { error: payErr } = await db()
      .from('pos_debt_payments')
      .insert({
        debt_id:     payload.debt_id,
        amount_usd:  payload.amount_usd,
        amount_lbp:  payload.amount_lbp,
        notes:       payload.notes ?? null,
        recorded_by: cashierId,
      });
    if (payErr) throw new Error(payErr.message);

    // 2. Reduce balance — read current then update
    const { data: debt } = await db()
      .from('pos_debts')
      .select('balance_usd')
      .eq('id', payload.debt_id)
      .single();
    const newBalance = Math.max(0, parseFloat(debt?.balance_usd ?? '0') - payload.amount_usd);
    await db()
      .from('pos_debts')
      .update({ balance_usd: newBalance })
      .eq('id', payload.debt_id);

    revalidatePath('/debts');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ════════════════════════════════════════════════════════════
// Z-REPORT
// ════════════════════════════════════════════════════════════

export async function getZReport(sessionId?: string) {
  // If no sessionId, use today's data
  const dateFilter = sessionId
    ? 'WHERE t.session_id = $1'
    : `WHERE t.created_at >= CURRENT_DATE AND t.created_at < CURRENT_DATE + INTERVAL '1 day'`;
  const params = sessionId ? [sessionId] : [];

  const { rows: summary } = await query(
    `SELECT
       COUNT(*)                                              AS transaction_count,
       COALESCE(SUM(t.subtotal_usd), 0)                    AS total_usd,
       COALESCE(SUM(t.subtotal_lbp), 0)                    AS total_lbp,
       COALESCE(SUM(CASE WHEN t.payment_method = 'cash_usd' THEN t.subtotal_usd ELSE 0 END), 0) AS cash_usd_collected,
       COALESCE(SUM(CASE WHEN t.payment_method = 'cash_lbp' THEN t.subtotal_lbp ELSE 0 END), 0) AS cash_lbp_collected,
       COALESCE(SUM(CASE WHEN t.payment_method = 'card'     THEN t.subtotal_usd ELSE 0 END), 0) AS card_usd_collected,
       COALESCE(SUM(CASE WHEN t.payment_method = 'on_account' THEN t.subtotal_usd ELSE 0 END), 0) AS on_account_usd
     FROM pos_transactions t ${dateFilter}
     AND t.is_voided = FALSE`,
    params
  );

  const { rows: itemsSold } = await query(
    `SELECT
       ti.product_name,
       SUM(ti.quantity)   AS qty_sold,
       SUM(ti.total_usd)  AS revenue_usd
     FROM pos_transaction_items ti
     JOIN pos_transactions t ON t.id = ti.transaction_id
     ${dateFilter.replace('t.', 't.')}
     AND t.is_voided = FALSE
     GROUP BY ti.product_name
     ORDER BY qty_sold DESC
     LIMIT 20`,
    params
  );

  const { rows: payouts } = await query(
    `SELECT COALESCE(SUM(amount_usd), 0) AS total_payouts_usd
     FROM pos_petty_cash
     WHERE flow = 'out'
       AND created_at >= CURRENT_DATE`,
    []
  );

  return {
    summary: summary[0],
    itemsSold,
    totalPayoutsUsd: parseFloat(payouts[0]?.total_payouts_usd ?? '0'),
  };
}

// ════════════════════════════════════════════════════════════
// DASHBOARD ANALYTICS (6-month rolling)
// ════════════════════════════════════════════════════════════

export async function getDashboardStats() {
  const { rows: revenueByMonth } = await query(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
       DATE_TRUNC('month', created_at) AS month_date,
       COALESCE(SUM(subtotal_usd), 0) AS revenue_usd,
       COUNT(*) AS transactions
     FROM pos_transactions
     WHERE is_voided = FALSE
       AND created_at >= NOW() - INTERVAL '6 months'
     GROUP BY DATE_TRUNC('month', created_at)
     ORDER BY month_date ASC`
  );

  const { rows: topProducts } = await query(
    `SELECT
       ti.product_name,
       SUM(ti.quantity) AS qty_sold,
       SUM(ti.total_usd) AS revenue_usd
     FROM pos_transaction_items ti
     JOIN pos_transactions t ON t.id = ti.transaction_id
     WHERE t.is_voided = FALSE
       AND t.created_at >= NOW() - INTERVAL '6 months'
     GROUP BY ti.product_name
     ORDER BY qty_sold DESC
     LIMIT 8`
  );

  const { rows: kpis } = await query(
    `SELECT
       COALESCE(SUM(subtotal_usd), 0) AS revenue_6m,
       COUNT(*)                        AS transactions_6m,
       COUNT(DISTINCT DATE(created_at)) AS active_days
     FROM pos_transactions
     WHERE is_voided = FALSE
       AND created_at >= NOW() - INTERVAL '6 months'`
  );

  const { rows: debtTotal } = await query(
    'SELECT COALESCE(SUM(balance_usd), 0) AS total_debt FROM pos_debts'
  );

  return {
    revenueByMonth,
    topProducts,
    kpis: kpis[0],
    totalDebtUsd: parseFloat(debtTotal[0]?.total_debt ?? '0'),
  };
}

// ════════════════════════════════════════════════════════════
// YEARLY ARCHIVE
// ════════════════════════════════════════════════════════════

export async function getYearlyArchive(year: number) {
  const { rows: monthly } = await query(
    `SELECT
       EXTRACT(MONTH FROM created_at) AS month_num,
       TO_CHAR(DATE_TRUNC('month', created_at), 'Month') AS month_name,
       COALESCE(SUM(subtotal_usd), 0) AS revenue_usd,
       COUNT(*) AS transactions
     FROM pos_transactions
     WHERE is_voided = FALSE
       AND EXTRACT(YEAR FROM created_at) = $1
     GROUP BY month_num, month_name
     ORDER BY month_num`,
    [year]
  );

  const { rows: topProducts } = await query(
    `SELECT
       ti.product_name,
       SUM(ti.quantity) AS qty_sold,
       SUM(ti.total_usd) AS revenue_usd
     FROM pos_transaction_items ti
     JOIN pos_transactions t ON t.id = ti.transaction_id
     WHERE t.is_voided = FALSE
       AND EXTRACT(YEAR FROM t.created_at) = $1
     GROUP BY ti.product_name
     ORDER BY qty_sold DESC
     LIMIT 10`,
    [year]
  );

  const { rows: years } = await query(
    `SELECT DISTINCT EXTRACT(YEAR FROM created_at)::INT AS year
     FROM pos_transactions WHERE is_voided = FALSE
     ORDER BY year DESC`
  );

  return { monthly, topProducts, availableYears: years.map((r) => r.year) };
}
