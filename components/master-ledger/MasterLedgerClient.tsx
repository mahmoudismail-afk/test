'use client';

import { useState } from 'react';
import { Search, DollarSign, Activity, ShoppingCart, ArrowDownLeft, ArrowUpRight, Box } from 'lucide-react';
import { formatUSD, formatLBP } from '@/lib/currency';

export interface LedgerEntry {
  id: string;
  type: 'sale' | 'petty_cash' | 'debt_payment' | 'restock';
  description: string;
  amount_usd: number;
  amount_lbp: number;
  created_at: string;
  user_name: string;
  status?: string;
}

export default function MasterLedgerClient({ entries }: { entries: LedgerEntry[] }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = entries.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase()) || 
                          e.user_name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'sale': return <ShoppingCart size={15} />;
      case 'petty_cash': return <Activity size={15} />;
      case 'debt_payment': return <ArrowDownLeft size={15} />;
      case 'restock': return <Box size={15} />;
      default: return <DollarSign size={15} />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'sale': return { bg: 'rgba(16,185,129,0.15)', text: '#10b981' };
      case 'debt_payment': return { bg: 'rgba(108,99,255,0.15)', text: '#6c63ff' };
      case 'petty_cash': return { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' };
      case 'restock': return { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' };
      default: return { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' };
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'sale': return 'Sale';
      case 'debt_payment': return 'Debt Collection';
      case 'petty_cash': return 'Petty Cash';
      case 'restock': return 'Restock Expense';
      default: return type;
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: 200, maxWidth: 350 }}>
          <Search size={16} className="search-icon" />
          <input
            type="search"
            className="search-input"
            placeholder="Search descriptions or users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {['all', 'sale', 'debt_payment', 'petty_cash', 'restock'].map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTypeFilter(t)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {t === 'all' ? 'All Transactions' : getLabel(t)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)' }}>
              {['Date & Time', 'Type', 'Description', 'User', 'Amount (USD)', 'Amount (LBP)'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                  No transactions found matching your filters.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const badge = getBadgeColor(row.type);
                const isPositive = row.amount_usd > 0;
                const isNegative = row.amount_usd < 0;
                const amountColor = isPositive ? 'var(--success)' : isNegative ? 'var(--red, #f87171)' : 'var(--text-primary)';
                const sign = isPositive ? '+' : '';

                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(row.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: badge.bg, color: badge.text, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>
                        {getIcon(row.type)} {getLabel(row.type)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                      {row.description || '—'}
                      {row.status === 'voided' && (
                        <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--red, #f87171)', padding: '2px 6px', background: 'rgba(248,113,113,0.1)', borderRadius: 4 }}>VOIDED</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{row.user_name || '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: amountColor, whiteSpace: 'nowrap' }}>
                      {sign}{formatUSD(row.amount_usd)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {sign}{formatLBP(row.amount_lbp)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
