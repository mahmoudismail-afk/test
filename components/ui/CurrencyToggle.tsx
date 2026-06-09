'use client';

import { useCurrency } from '@/contexts/CurrencyContext';

export default function CurrencyToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-base)',
        border: '1px solid var(--border)',
        borderRadius: 9999,
        padding: '3px',
        gap: '2px',
        width: collapsed ? 'fit-content' : '100%',
        margin: collapsed ? '0 auto' : '0',
      }}
      title="Switch currency"
    >
      {(['USD', 'LBP'] as const).map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          style={{
            flex: collapsed ? undefined : 1,
            padding: collapsed ? '4px 8px' : '4px 10px',
            borderRadius: 9999,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.04em',
            transition: 'all 0.18s',
            background: currency === c ? 'var(--primary)' : 'transparent',
            color: currency === c ? '#fff' : 'var(--text-muted)',
            whiteSpace: 'nowrap',
          }}
          id={`currency-toggle-${c.toLowerCase()}`}
        >
          {c === 'USD' ? '$' : 'ل.ل'}
          {!collapsed && ` ${c}`}
        </button>
      ))}
    </div>
  );
}
