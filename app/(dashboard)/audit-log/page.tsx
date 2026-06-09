import { query } from '@/lib/db';
import { Shield, Trash2, MinusCircle, ShoppingBag } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Audit Log' };
export const dynamic = 'force-dynamic';

const ACTION_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  item_deleted: { label: 'Item Deleted',  icon: <Trash2 size={14} />,      color: '#ef4444' },
  cart_voided:  { label: 'Cart Voided',   icon: <ShoppingBag size={14} />, color: '#f59e0b' },
  qty_reduced:  { label: 'Qty Reduced',   icon: <MinusCircle size={14} />, color: '#6c63ff' },
};

export default async function AuditLogPage() {
  let rows: any[] = [];
  try {
    const result = await query(
      `SELECT
         al.id, al.action, al.product_name, al.quantity, al.unit_price,
         al.reason, al.created_at,
         p.full_name AS cashier_name
       FROM pos_cart_audit_log al
       LEFT JOIN profiles p ON p.id = al.cashier_id
       ORDER BY al.created_at DESC
       LIMIT 200`
    );
    rows = result.rows;
  } catch {
    rows = [];
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Cart void and item deletion history (Admin only)</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 8, color: '#6c63ff', fontSize: 12, fontWeight: 700 }}>
          <Shield size={14} /> Admin View
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <Shield size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>No audit events recorded yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-card)' }}>
                  {['Time', 'Action', 'Cashier', 'Product', 'Qty', 'Unit Price', 'Reason'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => {
                  const meta = ACTION_META[row.action] ?? { label: row.action, icon: null, color: '#94a3b8' };
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(row.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: `${meta.color}20`, color: meta.color, fontWeight: 700, fontSize: 11 }}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row.cashier_name ?? '—'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{row.product_name ?? '—'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{row.quantity ?? '—'}</td>
                      <td style={{ padding: '12px 16px' }}>{row.unit_price ? `$${parseFloat(row.unit_price).toFixed(2)}` : '—'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{row.reason ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
