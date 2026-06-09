'use client';

import React, { useState } from 'react';
import { formatUSD, formatLBP, usdToLbp, lbpToUsd } from '@/lib/currency';
import { User, Phone, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Debt {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  balance_usd: number;
  notes: string | null;
  updated_at: string;
}

interface Props {
  debts: Debt[];
  lbpRate: number;
}

export default function DebtLedgerClient({ debts: initialDebts, lbpRate }: Props) {
  const [debts, setDebts]       = useState<Debt[]>(initialDebts);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'LBP'>('USD');
  const [amount, setAmount]     = useState('');
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handlePay = async (debtId: string) => {
    const amountNum = parseFloat(amount) || 0;
    if (amountNum <= 0) { showToast('Enter a valid amount'); return; }

    const amountUsd = currency === 'USD' ? amountNum : lbpToUsd(amountNum, lbpRate);
    const amountLbp = currency === 'LBP' ? amountNum : Math.round(usdToLbp(amountNum, lbpRate));

    setSaving(true);
    try {
      const res = await fetch('/api/pos/debt-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debt_id: debtId, amount_usd: amountUsd, amount_lbp: amountLbp, notes }),
      });
      const data = await res.json();
      if (data.error) { showToast(data.error); return; }

      setDebts((prev) =>
        prev.map((d) =>
          d.id === debtId
            ? { ...d, balance_usd: Math.max(0, d.balance_usd - amountUsd) }
            : d
        ).filter((d) => d.balance_usd > 0)
      );
      setPayingId(null);
      setAmount('');
      setNotes('');
      showToast(`✓ Payment recorded: ${formatUSD(amountUsd)}`);
    } catch {
      showToast('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  if (debts.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
        <CheckCircle size={40} style={{ margin: '0 auto 12px', color: '#10b981' }} />
        <p style={{ fontWeight: 600 }}>All clear! No outstanding debts.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {debts.map((debt) => (
        <div key={debt.id} className="card" style={{ padding: '16px 20px' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setExpanded(expanded === debt.id ? null : debt.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <User size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{debt.customer_name}</div>
                {debt.customer_phone && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={10} /> {debt.customer_phone}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#ef4444' }}>
                  {formatUSD(debt.balance_usd)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--amber)' }}>
                  {formatLBP(usdToLbp(debt.balance_usd, lbpRate))}
                </div>
              </div>
              {expanded === debt.id ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
            </div>
          </div>

          {/* Expanded: Payment Form */}
          {expanded === debt.id && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              {payingId === debt.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['USD', 'LBP'] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => { setCurrency(c); setAmount(''); }}
                        style={{
                          padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
                          background: currency === c ? 'var(--primary)' : 'var(--bg-card)',
                          color: currency === c ? '#fff' : 'var(--text-secondary)',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <input
                    style={{ padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', outline: 'none' }}
                    type="number"
                    placeholder={currency === 'USD' ? '0.00' : '0'}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                  />
                  <input
                    style={{ padding: '8px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                    placeholder="Notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handlePay(debt.id)}
                      disabled={saving}
                      style={{ flex: 1, padding: '10px', background: '#10b981', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {saving ? 'Saving…' : `Record Payment`}
                    </button>
                    <button
                      onClick={() => { setPayingId(null); setAmount(''); }}
                      style={{ padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setPayingId(debt.id)}
                  style={{ padding: '10px 20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  ✓ Log Payment
                </button>
              )}

              {debt.notes && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Notes: {debt.notes}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 18px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderLeft: '4px solid #10b981', borderRadius: 10, fontWeight: 600, fontSize: 13, zIndex: 9999, boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
