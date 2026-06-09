import { getZReport } from '@/lib/actions/pos';
import { getLbpRate } from '@/lib/actions/settings';
import { formatUSD, formatLBP, usdToLbp } from '@/lib/currency';
import { FileText, DollarSign, ShoppingCart, ArrowDownLeft, CreditCard } from 'lucide-react';
import ZReportTimestamp from '@/components/z-report/ZReportTimestamp';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Z-Report' };
export const dynamic = 'force-dynamic';

export default async function ZReportPage() {
  let report: Awaited<ReturnType<typeof getZReport>> | null = null;
  let lbpRate = 89500;

  try { report  = await getZReport(); } catch { report  = null; }
  try { lbpRate = await getLbpRate(); } catch { lbpRate = 89500; }

  const summary         = report?.summary        ?? null;
  const itemsSold       = report?.itemsSold       ?? [];
  const totalPayoutsUsd = report?.totalPayoutsUsd ?? 0;

  const totalUsd   = parseFloat(summary?.total_usd ?? '0');
  const cashUsd    = parseFloat(summary?.cash_usd_collected ?? '0');
  const cashLbp    = parseFloat(summary?.cash_lbp_collected ?? '0');
  const cardUsd    = parseFloat(summary?.card_usd_collected ?? '0');
  const accountUsd = parseFloat(summary?.on_account_usd ?? '0');
  const txCount    = parseInt(summary?.transaction_count ?? '0');
  const netUsd     = totalUsd - totalPayoutsUsd;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Z-Report</h1>
          <p className="page-subtitle">End-of-Shift Reconciliation</p>
        </div>
        <ZReportTimestamp />
      </div>

      {/* Summary Cards */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Sales</span>
            <span className="stat-card-icon" style={{ background: 'rgba(108,99,255,0.15)', color: '#6c63ff' }}>
              <DollarSign size={18} />
            </span>
          </div>
          <div className="stat-card-value">{formatUSD(totalUsd)}</div>
          <div className="stat-card-sub" style={{ color: 'var(--amber)' }}>{formatLBP(usdToLbp(totalUsd, lbpRate))}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Transactions</span>
            <span className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
              <ShoppingCart size={18} />
            </span>
          </div>
          <div className="stat-card-value">{txCount}</div>
          <div className="stat-card-sub">Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Cash Payouts</span>
            <span className="stat-card-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              <ArrowDownLeft size={18} />
            </span>
          </div>
          <div className="stat-card-value" style={{ color: '#ef4444' }}>{formatUSD(totalPayoutsUsd)}</div>
          <div className="stat-card-sub">From drawer</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Net Cash</span>
            <span className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <FileText size={18} />
            </span>
          </div>
          <div className="stat-card-value">{formatUSD(netUsd)}</div>
          <div className="stat-card-sub">After payouts</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Payment Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Payment Breakdown</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Cash (USD)',    amount: cashUsd,    lbp: usdToLbp(cashUsd, lbpRate),    color: '#10b981', icon: <DollarSign size={14} /> },
              { label: 'Cash (ل.ل)',   amount: cashLbp / lbpRate, lbp: cashLbp, color: '#f59e0b', icon: <DollarSign size={14} /> },
              { label: 'Card',          amount: cardUsd,    lbp: usdToLbp(cardUsd, lbpRate),    color: '#6c63ff', icon: <CreditCard size={14} /> },
              { label: 'On Account',    amount: accountUsd, lbp: usdToLbp(accountUsd, lbpRate), color: '#ef4444', icon: <ShoppingCart size={14} /> },
            ].map(({ label, amount, lbp, color, icon }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color, fontSize: 13, fontWeight: 600 }}>
                  {icon} {label}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{formatUSD(amount)}</div>
                  <div style={{ fontSize: 11, color: 'var(--amber)' }}>{formatLBP(lbp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Items Sold */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Items Sold Today</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{itemsSold.reduce((s: number, i: any) => s + parseInt(i.qty_sold), 0)} total units</span>
          </div>
          {itemsSold.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No sales recorded today</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {itemsSold.map((item: any) => (
                <div key={item.product_name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.product_name}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>×{item.qty_sold}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{formatUSD(parseFloat(item.revenue_usd))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
