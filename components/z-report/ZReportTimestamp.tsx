'use client';

import { Clock } from 'lucide-react';

export default function ZReportTimestamp() {
  const now = new Date();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, color: 'var(--text-muted)', fontSize: 13 }}>
      <span style={{ fontWeight: 500 }}>
        {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={13} />
        Generated at {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
