'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, CreditCard, Banknote, UserCheck, Check, AlertCircle } from 'lucide-react';
import { formatUSD, formatLBP, usdToLbp, lbpToUsd } from '@/lib/currency';
import type { CartItem } from './POSTerminal';

type PaymentMethod = 'cash_usd' | 'cash_lbp' | 'card' | 'on_account';
type CashCurrency = 'USD' | 'LBP';

const USD_BILLS = [1, 5, 10, 20, 50, 100];
const LBP_BILLS = [100_000, 250_000, 500_000, 1_000_000, 5_000_000];

interface Props {
  cart: CartItem[];
  cartTotal: number;
  lbpRate: number;
  onClose: () => void;
  onComplete: () => void;
  toast: (msg: string, type?: string) => void;
}

export default function CheckoutModal({ cart, cartTotal, lbpRate, onClose, onComplete, toast }: Props) {
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash_usd');
  const [cashCurrency, setCashCurrency] = useState<CashCurrency>('USD');
  const [cashInput, setCashInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debtor autocomplete
  const [debtors, setDebtors] = useState<{ id: string; customer_name: string; customer_phone: string | null; balance_usd: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [existingDebt, setExistingDebt] = useState<number | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (payMethod === 'on_account') {
      fetch('/api/pos/debts').then(r => r.json()).then(d => setDebtors(d.debtors ?? [])).catch(() => {});
    }
  }, [payMethod]);

  const totalLbp = usdToLbp(cartTotal, lbpRate);

  // ── Change calculation ─────────────────────────────────────
  const { changeUsd, changeLbp, isInsufficient } = useMemo(() => {
    const tendered = parseFloat(cashInput) || 0;
    if (tendered <= 0) return { changeUsd: 0, changeLbp: 0, isInsufficient: false };

    let tenderedUsd: number;
    if (cashCurrency === 'USD') {
      tenderedUsd = tendered;
    } else {
      tenderedUsd = lbpToUsd(tendered, lbpRate);
    }

    const diff = tenderedUsd - cartTotal;
    const changeUsd = Math.max(0, diff);
    const changeLbp = usdToLbp(changeUsd, lbpRate);
    const isInsufficient = diff < -0.001;

    return { changeUsd, changeLbp, isInsufficient };
  }, [cashInput, cashCurrency, cartTotal, lbpRate]);

  const setQuickBill = (value: number, currency: CashCurrency) => {
    setCashCurrency(currency);
    setCashInput(String(value));
  };

  // ── Submit sale ────────────────────────────────────────────
  const handleConfirm = async () => {
    if (payMethod === 'on_account' && !customerName.trim()) {
      toast('Enter customer name for On Account', 'error');
      return;
    }
    if ((payMethod === 'cash_usd' || payMethod === 'cash_lbp') && isInsufficient) {
      toast('Insufficient cash tendered', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: cart.map((i) => ({
          product_id:    i.product.id,
          product_name:  i.product.name,
          quantity:      i.quantity,
          unit_price_usd: i.product.price,
          total_usd:     i.product.price * i.quantity,
        })),
        payment_method:    payMethod,
        subtotal_usd:      cartTotal,
        subtotal_lbp:      Math.round(totalLbp),
        lbp_rate:          lbpRate,
        cash_tendered_usd: cashCurrency === 'USD' ? parseFloat(cashInput) || null : changeUsd + cartTotal || null,
        cash_tendered_lbp: cashCurrency === 'LBP' ? parseFloat(cashInput) || null : null,
        change_usd:        changeUsd || null,
        change_lbp:        Math.round(changeLbp) || null,
        customer_name:     customerName || null,
        customer_phone:    customerPhone || null,
      };

      const res = await fetch('/api/pos/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.queued) {
        toast('📴 Saved offline — will sync when online', 'warning');
      } else if (data.error) {
        toast(data.error, 'error');
        return;
      }

      onComplete();
    } catch (err) {
      toast('Failed to process sale', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showCashInput = payMethod === 'cash_usd' || payMethod === 'cash_lbp';

  return (
    <div className="pos-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal">
        {/* Header */}
        <div className="pos-modal-header">
          <div className="pos-modal-title">
            <CreditCard size={18} style={{ color: 'var(--accent)' }} />
            Checkout
          </div>
          <button className="pos-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="pos-modal-body">

          {/* Order Summary */}
          <div>
            <div className="pos-modal-section-title">Order Summary</div>
            <div className="pos-checkout-summary">
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="pos-checkout-summary-row">
                  <span>{product.name} ×{quantity}</span>
                  <span>{formatUSD(product.price * quantity)}</span>
                </div>
              ))}
              <div className="pos-checkout-summary-total">
                <span className="label">Total</span>
                <div style={{ textAlign: 'right' }}>
                  <div className="value-usd">{formatUSD(cartTotal)}</div>
                  <div className="value-lbp">{formatLBP(totalLbp)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <div className="pos-modal-section-title">Payment Method</div>
            <div className="pos-pay-methods">
              {([
                { method: 'cash_usd',   label: 'Cash (USD)',  icon: <Banknote size={16} /> },
                { method: 'cash_lbp',   label: 'Cash (ل.ل)', icon: <Banknote size={16} /> },
                { method: 'card',       label: 'Card',        icon: <CreditCard size={16} /> },
                { method: 'on_account', label: 'On Account',  icon: <UserCheck size={16} /> },
              ] as { method: PaymentMethod; label: string; icon: React.ReactNode }[]).map(({ method, label, icon }) => {
                // Highlight "On Account" in red/amber when this customer already has a debt
                const hasDebtWarning = method === 'on_account' && existingDebt !== null && existingDebt > 0;
                const isSelected = payMethod === method;
                return (
                  <button
                    key={method}
                    className={`pos-pay-method-btn${isSelected ? ' selected' : ''}`}
                    onClick={() => { setPayMethod(method); if (method === 'cash_usd') setCashCurrency('USD'); if (method === 'cash_lbp') setCashCurrency('LBP'); }}
                    style={hasDebtWarning && !isSelected ? {
                      background: 'rgba(239,68,68,0.15)',
                      border: '1px solid rgba(239,68,68,0.5)',
                      color: '#f87171',
                      opacity: 1,
                    } : hasDebtWarning && isSelected ? {
                      background: 'rgba(239,68,68,0.3)',
                      border: '1px solid rgba(239,68,68,0.7)',
                      color: '#fca5a5',
                    } : {}}
                  >
                    {icon} {label}
                    {hasDebtWarning && (
                      <span style={{
                        marginLeft: 4, fontSize: 10, fontWeight: 700,
                        background: '#ef4444', color: '#fff',
                        borderRadius: 4, padding: '1px 5px',
                      }}>
                        !</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Input */}
          {showCashInput && (
            <div>
              <div className="pos-modal-section-title">Cash Received</div>

              {/* Currency Toggle */}
              <div className="pos-cash-currency-toggle">
                {(['USD', 'LBP'] as CashCurrency[]).map((c) => (
                  <button
                    key={c}
                    className={`pos-currency-tab${cashCurrency === c ? ' active' : ''}`}
                    onClick={() => { setCashCurrency(c); setCashInput(''); }}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <input
                id="cash-input"
                className="pos-cash-input"
                type="number"
                inputMode="decimal"
                placeholder={cashCurrency === 'USD' ? '0.00' : '0'}
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                autoFocus
              />

              {/* Quick Bills */}
              <div style={{ marginTop: 10 }}>
                <div className="pos-modal-section-title">Quick Bills</div>
                <div className="pos-quick-bills">
                  {USD_BILLS.map((v) => (
                    <button key={`usd-${v}`} className="pos-bill-btn usd" onClick={() => setQuickBill(v, 'USD')}>
                      ${v}
                    </button>
                  ))}
                  {LBP_BILLS.map((v) => (
                    <button key={`lbp-${v}`} className="pos-bill-btn lbp" onClick={() => setQuickBill(v, 'LBP')}>
                      {v >= 1_000_000 ? `${v / 1_000_000}M` : `${v / 1_000}k`} ل.ل
                    </button>
                  ))}
                </div>
              </div>

              {/* Change Calculator */}
              {cashInput && (
                <div style={{ marginTop: 12 }}>
                  <div className="pos-modal-section-title">Change Due</div>
                  <div className="pos-change-display">
                    {isInsufficient ? (
                      <div className="pos-change-row">
                        <span className="pos-change-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertCircle size={14} style={{ color: 'var(--red)' }} /> Insufficient
                        </span>
                        <span className="pos-change-value negative">
                          −{formatUSD(cartTotal - (cashCurrency === 'USD' ? parseFloat(cashInput) : lbpToUsd(parseFloat(cashInput), lbpRate)))}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="pos-change-row">
                          <span className="pos-change-label">Change (USD)</span>
                          <span className={`pos-change-value ${changeUsd > 0 ? 'positive' : 'zero'}`}>
                            {formatUSD(changeUsd)}
                          </span>
                        </div>
                        <div className="pos-change-row">
                          <span className="pos-change-label">Change (ل.ل)</span>
                          <span className={`pos-change-value ${changeLbp > 0 ? 'positive' : 'zero'}`}>
                            {formatLBP(changeLbp)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* On Account Form */}
          {payMethod === 'on_account' && (
            <div className="pos-debt-form">
              <div className="pos-modal-section-title">Customer Details</div>

              {/* Name with autocomplete */}
              <div className="pos-field" style={{ position: 'relative' }}>
                <label className="pos-label" htmlFor="debt-customer-name">Customer Name *</label>
                <input
                  ref={nameRef}
                  id="debt-customer-name"
                  className="pos-input"
                  placeholder="Type name or search existing…"
                  value={customerName}
                  autoComplete="off"
                  onChange={e => {
                    setCustomerName(e.target.value);
                    setExistingDebt(null);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                />

                {/* Suggestions dropdown */}
                {showSuggestions && customerName.length >= 1 && (() => {
                  const matches = debtors.filter(d =>
                    d.customer_name.toLowerCase().includes(customerName.toLowerCase())
                  );
                  if (matches.length === 0) return null;
                  return (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      marginTop: 4, overflow: 'hidden',
                    }}>
                      {matches.slice(0, 6).map(d => (
                        <button
                          key={d.id}
                          onMouseDown={() => {
                            setCustomerName(d.customer_name);
                            setCustomerPhone(d.customer_phone ?? '');
                            setExistingDebt(d.balance_usd);
                            setShowSuggestions(false);
                          }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', padding: '10px 14px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108,99,255,0.12)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{d.customer_name}</div>
                            {d.customer_phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.customer_phone}</div>}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>owes</div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--red, #f87171)' }}>{formatUSD(d.balance_usd)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="pos-field">
                <label className="pos-label" htmlFor="debt-customer-phone">Phone (optional)</label>
                <input
                  id="debt-customer-phone"
                  className="pos-input"
                  placeholder="e.g. +961 76 000 000"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                />
              </div>

              {/* Existing balance warning */}
              {existingDebt !== null && existingDebt > 0 && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 10,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <AlertCircle size={14} style={{ color: 'var(--red, #f87171)', flexShrink: 0 }} />
                  <span>
                    <strong>{customerName}</strong> already owes <strong style={{ color: 'var(--red, #f87171)' }}>{formatUSD(existingDebt)}</strong> — this sale will be added to their tab.
                  </span>
                </div>
              )}

              <div style={{
                padding: 12,
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--amber)',
                display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <AlertCircle size={14} />
                <span>
                  {formatUSD(cartTotal)} ({formatLBP(totalLbp)}) will be added to {customerName || "customer"}&apos;s tab
                  {existingDebt ? `. New total: ${formatUSD(existingDebt + cartTotal)}` : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="pos-modal-footer">
          <button className="pos-btn pos-btn-outline" onClick={onClose} style={{ minWidth: 80 }}>
            Cancel
          </button>
          <button
            id="confirm-sale-btn"
            className="pos-btn pos-btn-primary"
            disabled={isSubmitting || (showCashInput && isInsufficient)}
            onClick={handleConfirm}
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                Processing…
              </span>
            ) : (
              <><Check size={16} /> Confirm Sale — {formatUSD(cartTotal)}</>
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
