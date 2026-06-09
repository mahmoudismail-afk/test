'use client';

import React, { useState } from 'react';
import { X, ArrowDownLeft, Check } from 'lucide-react';
import { formatUSD, formatLBP } from '@/lib/currency';

const TAGS = ['delivery', 'supplies', 'utilities', 'cleaning', 'salary', 'other'];

interface Props {
  lbpRate: number;
  onClose: () => void;
  toast: (msg: string, type?: string) => void;
}

export default function PettyCashModal({ lbpRate, onClose, toast }: Props) {
  const [currency, setCurrency] = useState<'USD' | 'LBP'>('USD');
  const [amount, setAmount] = useState('');
  const [tag, setTag] = useState('delivery');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const amountUsd = currency === 'USD' ? amountNum : amountNum / lbpRate;
  const amountLbp = currency === 'LBP' ? amountNum : amountNum * lbpRate;

  const handleSubmit = async () => {
    if (amountNum <= 0) { toast('Enter a valid amount', 'error'); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/pos/petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: 'out',
          amount_usd: amountUsd,
          amount_lbp: Math.round(amountLbp),
          tag,
          notes,
        }),
      });
      const data = await res.json();
      if (data.error) { toast(data.error, 'error'); return; }
      toast(`Cash out recorded: ${formatUSD(amountUsd)}`, 'success');
      onClose();
    } catch {
      toast('Failed to record payout', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pos-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal" style={{ maxWidth: 440 }}>
        {/* Header */}
        <div className="pos-modal-header">
          <div className="pos-modal-title">
            <ArrowDownLeft size={18} style={{ color: 'var(--amber)' }} />
            Petty Cash / Payout
          </div>
          <button className="pos-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="pos-modal-body">
          {/* Currency + Amount */}
          <div>
            <div className="pos-modal-section-title">Amount</div>
            <div className="pos-cash-currency-toggle">
              {(['USD', 'LBP'] as const).map((c) => (
                <button
                  key={c}
                  className={`pos-currency-tab${currency === c ? ' active' : ''}`}
                  onClick={() => { setCurrency(c); setAmount(''); }}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              id="petty-cash-amount"
              className="pos-cash-input"
              type="number"
              inputMode="decimal"
              placeholder={currency === 'USD' ? '0.00' : '0'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            {amountNum > 0 && (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                ≈ {currency === 'USD' ? formatLBP(amountLbp) : formatUSD(amountUsd)}
              </div>
            )}
          </div>

          {/* Tag */}
          <div>
            <div className="pos-modal-section-title">Expense Tag</div>
            <div className="pos-petty-tags">
              {TAGS.map((t) => (
                <button
                  key={t}
                  className={`pos-tag-btn${tag === t ? ' active' : ''}`}
                  onClick={() => setTag(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="pos-field">
            <label className="pos-label" htmlFor="petty-notes">Notes (optional)</label>
            <input
              id="petty-notes"
              className="pos-input"
              placeholder="e.g. Paid delivery driver"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pos-modal-footer">
          <button className="pos-btn pos-btn-outline" onClick={onClose} style={{ minWidth: 80 }}>
            Cancel
          </button>
          <button
            id="confirm-payout-btn"
            className="pos-btn pos-btn-amber"
            disabled={isSubmitting || amountNum <= 0}
            onClick={handleSubmit}
            style={{ flex: 1 }}
          >
            {isSubmitting ? 'Saving…' : <><Check size={16} /> Record Payout</>}
          </button>
        </div>
      </div>
    </div>
  );
}
