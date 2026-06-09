import { query } from '@/lib/db';
import { BookOpen, Shield } from 'lucide-react';
import MasterLedgerClient, { LedgerEntry } from '@/components/master-ledger/MasterLedgerClient';
import { requirePermission } from '@/lib/auth-guard';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Master Ledger' };
export const dynamic = 'force-dynamic';

export default async function MasterLedgerPage() {
  await requirePermission('pos-history'); // Or 'audit-log', but this is a financial view

  let entries: LedgerEntry[] = [];

  try {
    const sql = `
      SELECT 
        id,
        'sale' AS type,
        CASE WHEN customer_name IS NOT NULL THEN 'Sale to ' || customer_name ELSE 'POS Sale' END AS description,
        subtotal_usd AS amount_usd,
        subtotal_lbp AS amount_lbp,
        created_at,
        cashier_id AS user_id,
        CASE WHEN is_voided THEN 'voided' ELSE 'completed' END AS status
      FROM pos_transactions

      UNION ALL

      SELECT 
        id,
        'petty_cash' AS type,
        COALESCE(notes, tag, 'Petty Cash ' || flow) AS description,
        CASE WHEN flow = 'in' THEN amount_usd ELSE -amount_usd END AS amount_usd,
        CASE WHEN flow = 'in' THEN amount_lbp ELSE -amount_lbp END AS amount_lbp,
        created_at,
        cashier_id AS user_id,
        'completed' AS status
      FROM pos_petty_cash

      UNION ALL

      SELECT 
        dp.id,
        'debt_payment' AS type,
        'Debt Collection: ' || COALESCE(d.customer_name, 'Unknown') || COALESCE(' (' || dp.notes || ')', '') AS description,
        dp.amount_usd AS amount_usd,
        dp.amount_lbp AS amount_lbp,
        dp.paid_at AS created_at,
        dp.recorded_by AS user_id,
        'completed' AS status
      FROM pos_debt_payments dp
      LEFT JOIN pos_debts d ON dp.debt_id = d.id

      UNION ALL

      SELECT 
        id,
        'restock' AS type,
        'Inventory Restock' || COALESCE(' - ' || notes, '') AS description,
        -(quantity * cost_per_unit) AS amount_usd,
        0 AS amount_lbp, -- Assuming restock is recorded in USD in this DB schema
        created_at,
        restocked_by AS user_id,
        'completed' AS status
      FROM inventory_restock_log

      ORDER BY created_at DESC
      LIMIT 500
    `;

    const { rows } = await query(sql);
    
    // Now fetch user names for all the user_ids found
    const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
    const userMap = new Map<string, string>();
    
    if (userIds.length > 0) {
      const { rows: users } = await query(
        `SELECT id, full_name FROM profiles WHERE id = ANY($1::uuid[])`,
        [`{${userIds.join(',')}}`]
      );
      users.forEach(u => userMap.set(u.id, u.full_name));
    }

    entries = rows.map((r: any) => ({
      id: r.id,
      type: r.type,
      description: r.description,
      amount_usd: parseFloat(r.amount_usd) || 0,
      amount_lbp: parseFloat(r.amount_lbp) || 0,
      created_at: r.created_at,
      user_name: userMap.get(r.user_id) || 'System',
      status: r.status,
    }));

  } catch (error) {
    console.error("Master Ledger Error:", error);
    entries = [];
  }

  // Calculate quick stats
  const totalIn = entries.filter(e => e.amount_usd > 0 && e.status !== 'voided').reduce((sum, e) => sum + e.amount_usd, 0);
  const totalOut = Math.abs(entries.filter(e => e.amount_usd < 0 && e.status !== 'voided').reduce((sum, e) => sum + e.amount_usd, 0));
  const net = totalIn - totalOut;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Ledger</h1>
          <p className="page-subtitle">Unified timeline of every financial transaction</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 8, color: '#6c63ff', fontSize: 12, fontWeight: 700 }}>
          <Shield size={14} /> Global View
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Inflow</span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--success)' }}>+${totalIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="stat-card-sub">Recent 500 records</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Outflow</span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--red, #f87171)' }}>-${totalOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="stat-card-sub">Recent 500 records</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Net Flow</span>
          </div>
          <div className="stat-card-value" style={{ color: net >= 0 ? 'var(--success)' : 'var(--red, #f87171)' }}>
            {net >= 0 ? '+' : '-'}${Math.abs(net).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="stat-card-sub">Recent 500 records</div>
        </div>
      </div>

      <MasterLedgerClient entries={entries} />
    </div>
  );
}
