'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Users, DollarSign, Check, AlertCircle, Search } from 'lucide-react';
import { formatUSD, formatLBP } from '@/lib/currency';

interface Debtor {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  balance_usd: number;
}

interface Props {
  lbpRate: number;
  onClose: () => void;
  toast: (msg: string, type?: string) => void;
}

export default function QuickDebtModal({ lbpRate, onClose, toast }: Props) {
  const [debtors, setDebtors]       = useState<Debtor[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState<Debtor | null>(null);
  const [amountUsd, setAmountUsd]   = useState('');
  const [notes, setNotes]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load all debtors on mount
  useEffect(() => {
    fetch('/api/pos/debts')
      .then(r => r.json())
      .then(data => { setDebtors(data.debtors ?? []); setLoading(false); })
      .catch(() => { setLoading(false); toast('Failed to load debtors', 'error'); });
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const filtered = debtors.filter(d =>
    d.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    (d.customer_phone ?? '').includes(search)
  );

  const amount    = parseFloat(amountUsd) || 0;
  const amountLbp = Math.round(amount * lbpRate);

  const handlePay = async () => {
    if (!selected) { toast('Select a customer', 'error'); return; }
    if (amount <= 0) { toast('Enter a valid amount', 'error'); return; }
    if (amount > selected.balance_usd + 0.001) {
      toast(`Amount exceeds balance (${formatUSD(selected.balance_usd)})`, 'error'); return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/pos/debt-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debt_id:    selected.id,
          amount_usd: amount,
          amount_lbp: amountLbp,
          notes:      notes || null,
        }),
      });
      const data = await res.json();
      if (data.error) { toast(data.error, 'error'); return; }
      toast(`✓ ${formatUSD(amount)} collected from ${selected.customer_name}`, 'success');
      onClose();
    } catch {
      toast('Failed to record payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pos-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal" style={{ maxWidth: 460 }}>

        {/* Header */}
        <div className="pos-modal-header">
          <div className="pos-modal-title">
            <Users size={18} style={{ color: 'var(--accent)' }} />
            Collect Debt Payment
          </div>
          <button className="pos-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="pos-modal-body">

          {/* Step 1: Select customer */}
          {!selected ? (
            <div>
              <div className="pos-modal-section-title">Select Customer</div>

              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  ref={searchRef}
                  className="pos-input"
                  style={{ paddingLeft: 32 }}
                  placeholder="Search by name or phone…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Debtor list */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Loading…</div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  {debtors.length === 0 ? 'No open debts 🎉' : 'No matches found'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                  {filtered.map(d => (
                    <button
                      key={d.id}
                      onClick={() => { setSelected(d); setAmountUsd(d.balance_usd.toFixed(2)); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px', borderRadius: 'var(--radius)',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer', textAlign: 'left', gap: 12, transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108,99,255,0.12)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{d.customer_name}</div>
                        {d.customer_phone && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.customer_phone}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--red, #f87171)' }}>{formatUSD(d.balance_usd)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatLBP(d.balance_usd * lbpRate)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Enter amount */
            <div>
              {/* Selected customer badge */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 'var(--radius)',
                background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.3)',
                marginBottom: 16,
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{selected.customer_name}</div>
                  {selected.customer_phone && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.customer_phone}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Outstanding</div>
                  <div style={{ fontWeight: 700, color: 'var(--red, #f87171)' }}>{formatUSD(selected.balance_usd)}</div>
                </div>
              </div>

              {/* Amount input */}
              <div className="pos-modal-section-title">Payment Amount</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className="pos-cash-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountUsd}
                  onChange={e => setAmountUsd(e.target.value)}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>USD</span>
              </div>

              {/* Quick amounts */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {[5, 10, 20, 50].filter(v => v <= selected.balance_usd + 0.01).map(v => (
                  <button
                    key={v}
                    className="pos-bill-btn usd"
                    onClick={() => setAmountUsd(v.toFixed(2))}
                  >${v}</button>
                ))}
                <button
                  className="pos-bill-btn"
                  style={{ background: 'rgba(108,99,255,0.15)', color: 'var(--primary-light)', border: '1px solid rgba(108,99,255,0.3)' }}
                  onClick={() => setAmountUsd(selected.balance_usd.toFixed(2))}
                >Full ({formatUSD(selected.balance_usd)})</button>
              </div>

              {/* LBP equiv */}
              {amount > 0 && (
                <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                  ≈ {formatLBP(amountLbp)}
                </div>
              )}

              {/* Remaining balance preview */}
              {amount > 0 && amount <= selected.balance_usd + 0.001 && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius)',
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                  fontSize: 13, marginBottom: 12,
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Remaining after payment: </span>
                  <strong style={{ color: amount >= selected.balance_usd - 0.001 ? 'var(--success)' : 'var(--red, #f87171)' }}>
                    {formatUSD(Math.max(0, selected.balance_usd - amount))}
                  </strong>
                </div>
              )}

              {/* Overpayment warning */}
              {amount > selected.balance_usd + 0.001 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--red, #f87171)', fontSize: 13, marginBottom: 12 }}>
                  <AlertCircle size={14} /> Exceeds balance by {formatUSD(amount - selected.balance_usd)}
                </div>
              )}

              {/* Notes */}
              <div className="pos-field">
                <label className="pos-label">Notes (optional)</label>
                <input
                  className="pos-input"
                  placeholder="e.g. Partial payment, cash"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* Change customer link */}
              <button
                onClick={() => { setSelected(null); setAmountUsd(''); setNotes(''); }}
                style={{ fontSize: 12, color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginTop: 4 }}
              >
                ← Change customer
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pos-modal-footer">
          <button className="pos-btn pos-btn-outline" onClick={onClose} style={{ minWidth: 80 }}>Cancel</button>
          {selected && (
            <button
              id="confirm-debt-payment-btn"
              className="pos-btn pos-btn-primary"
              disabled={submitting || amount <= 0 || amount > selected.balance_usd + 0.001}
              onClick={handlePay}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  Recording…
                </span>
              ) : (
                <><Check size={16} /> Collect {formatUSD(amount)}</>
              )}
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
