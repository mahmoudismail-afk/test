import { getDebts } from '@/lib/actions/pos';
import { getLbpRate } from '@/lib/actions/settings';
import { formatUSD, formatLBP, usdToLbp } from '@/lib/currency';
import { Users, DollarSign, AlertCircle } from 'lucide-react';
import DebtLedgerClient from '@/components/pos/DebtLedgerClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Debt Ledger' };
export const dynamic = 'force-dynamic';

export default async function DebtsPage() {
  let debts: any[] = [];
  let lbpRate = 89500;

  try { debts   = await getDebts();   } catch { debts   = []; }
  try { lbpRate = await getLbpRate(); } catch { lbpRate = 89500; }

  const totalDebt = debts.reduce((s: number, d: any) => s + parseFloat(d.balance_usd), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Debt Ledger</h1>
          <p className="page-subtitle">On-Account customer balances</p>
        </div>
        {totalDebt > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 700 }}>
            <AlertCircle size={14} />
            Total Outstanding: {formatUSD(totalDebt)}
          </div>
        )}
      </div>

      {/* KPI */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Customers with Debt</span>
            <span className="stat-card-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              <Users size={18} />
            </span>
          </div>
          <div className="stat-card-value">{debts.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total (USD)</span>
            <span className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <DollarSign size={18} />
            </span>
          </div>
          <div className="stat-card-value" style={{ color: '#ef4444' }}>{formatUSD(totalDebt)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total (ل.ل)</span>
            <span className="stat-card-icon" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
              <DollarSign size={18} />
            </span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--amber)', fontSize: 18 }}>
            {formatLBP(usdToLbp(totalDebt, lbpRate))}
          </div>
        </div>
      </div>

      <DebtLedgerClient
        debts={debts.map((d: any) => ({ ...d, balance_usd: parseFloat(d.balance_usd) }))}
        lbpRate={lbpRate}
      />
    </div>
  );
}
