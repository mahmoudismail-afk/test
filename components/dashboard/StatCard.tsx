'use client';

import React from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatUSD, formatLBP, usdToLbp } from '@/lib/currency';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value?: string | number;
  /** If provided, overrides automatic currency formatting (e.g. member count) */
  rawValue?: boolean;
  /** USD amount to auto-format in both currencies */
  amountUsd?: number;
  subValue?: string;
  icon: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  change?: number;
  changeLabel?: string;
  prefix?: string;
  suffix?: string;
}

export default function StatCard({
  title,
  value,
  rawValue = false,
  amountUsd,
  subValue,
  icon,
  iconColor = 'var(--primary-light)',
  iconBg = 'var(--primary-glow)',
  change,
  changeLabel = 'vs last month',
  prefix = '',
  suffix = '',
}: StatCardProps) {
  const { currency, lbpRate } = useCurrency();

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral  = change === 0;

  // Determine what to show as the primary value
  let displayValue: string;
  let secondaryValue: string | undefined;

  if (amountUsd !== undefined) {
    if (currency === 'LBP') {
      displayValue = formatLBP(usdToLbp(amountUsd, lbpRate));
      secondaryValue = formatUSD(amountUsd);
    } else {
      displayValue = formatUSD(amountUsd);
      secondaryValue = formatLBP(usdToLbp(amountUsd, lbpRate));
    }
  } else {
    displayValue = `${prefix}${typeof value === 'number' ? value.toLocaleString() : value}${suffix}`;
    secondaryValue = subValue;
  }

  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="stat-label">{title}</p>
          <p className="stat-value" style={{ fontSize: displayValue.length > 14 ? '1.25rem' : undefined }}>
            {displayValue}
          </p>
          {secondaryValue && (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', letterSpacing: '0.01em' }}>
              {secondaryValue}
            </p>
          )}
        </div>
        <div className="stat-icon" style={{ background: iconBg, color: iconColor, flexShrink: 0 }}>
          {icon}
        </div>
      </div>

      {change !== undefined && (
        <div className={`stat-change ${isPositive ? 'positive' : isNegative ? 'negative' : ''}`}>
          {isPositive && <TrendingUp size={13} />}
          {isNegative && <TrendingDown size={13} />}
          {isNeutral  && <Minus size={13} />}
          <span>
            {isPositive ? '+' : ''}{change}% {changeLabel}
          </span>
        </div>
      )}
    </div>
  );
}
