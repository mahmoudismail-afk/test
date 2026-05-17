'use client';

import { useState } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { lbpToUsd, usdToLbp } from '@/lib/currency';

interface CurrencyInputProps {
  /** USD value (always stored/passed in USD) */
  valueUsd: number | string;
  onChange: (usdValue: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  lbpRate?: number; // kept for backwards compat
}

export default function CurrencyInput({
  valueUsd,
  onChange,
  disabled = false,
  placeholder,
  id,
}: CurrencyInputProps) {
  const { currency: globalCurrency, lbpRate } = useCurrency();

  // Local currency toggle — starts from global setting
  const [localCurrency, setLocalCurrency] = useState<'USD' | 'LBP'>(globalCurrency);
  const [displayVal, setDisplayVal] = useState<string>(() => {
    const usd = Number(valueUsd);
    if (!valueUsd || isNaN(usd) || usd === 0) return '';
    return localCurrency === 'LBP'
      ? String(Math.round(usdToLbp(usd, lbpRate)))
      : String(usd);
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDisplayVal(raw);
    const num = parseFloat(raw);
    if (isNaN(num) || raw === '') {
      onChange('');
      return;
    }
    if (localCurrency === 'LBP') {
      // Convert to USD rounded to 6 dp to avoid float drift
      const usd = lbpToUsd(num, lbpRate);
      onChange(String(usd));
    } else {
      onChange(raw);
    }
  }

  function toggleCurrency() {
    const next = localCurrency === 'USD' ? 'LBP' : 'USD';
    setLocalCurrency(next);

    // Convert displayed value to the new currency
    const num = parseFloat(displayVal);
    if (!isNaN(num) && num > 0) {
      if (next === 'LBP') {
        // USD → LBP: round to nearest 1,000
        const lbp = Math.round(usdToLbp(num, lbpRate) / 1000) * 1000;
        setDisplayVal(String(lbp));
      } else {
        // LBP → USD: snap to 1,000 first, then convert
        setDisplayVal(String(lbpToUsd(num, lbpRate)));
      }
    }
  }

  const isLBP = localCurrency === 'LBP';
  const prefix = isLBP ? 'ل.ل' : '$';
  const ph = placeholder ?? (isLBP ? '0' : '0.00');
  const step = isLBP ? '1000' : '0.01';

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.5rem' }}>
      {/* Currency toggle pill */}
      <button
        type="button"
        onClick={toggleCurrency}
        disabled={disabled}
        title="Click to switch between USD and LBP"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.2rem',
          padding: '0 0.625rem',
          fontSize: isLBP ? '0.7rem' : '0.8rem',
          fontWeight: 700,
          color: isLBP ? '#f59e0b' : '#10b981',
          background: isLBP ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
          border: `1.5px solid ${isLBP ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.35)'}`,
          borderRadius: '0.5rem',
          cursor: disabled ? 'default' : 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.18s ease',
          minWidth: '3rem',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          if (!disabled) (e.currentTarget.style.opacity = '0.8');
        }}
        onMouseLeave={e => {
          (e.currentTarget.style.opacity = '1');
        }}
      >
        {prefix}
        <span style={{ fontSize: '0.6rem', opacity: 0.7, marginLeft: 1 }}>▾</span>
      </button>

      <input
        id={id}
        type="number"
        min="0"
        step={step}
        className="form-input"
        value={displayVal}
        onChange={handleChange}
        disabled={disabled}
        placeholder={ph}
        style={{ flex: 1 }}
      />
    </div>
  );
}
