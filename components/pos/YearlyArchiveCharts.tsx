'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { formatUSD } from '@/lib/currency';

interface Props {
  monthly: { month: string; revenue: number; transactions: number }[];
  topProducts: { product_name: string; qty_sold: string; revenue_usd: string }[];
  year: number;
}

const COLORS = ['#6c63ff', '#38bdf8', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#84cc16'];

export default function YearlyArchiveCharts({ monthly, topProducts, year }: Props) {
  const productData = topProducts.map((p) => ({
    name: p.product_name.length > 18 ? p.product_name.slice(0, 18) + '…' : p.product_name,
    qty: parseInt(p.qty_sold),
    revenue: parseFloat(p.revenue_usd),
  }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
      {/* Monthly Revenue */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Monthly Revenue — {year}</h3>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthly} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip
              formatter={(v: any) => [formatUSD(v), 'Revenue']}
              contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3147', borderRadius: 8, fontSize: 12 }}
              cursor={{ fill: 'rgba(108,99,255,0.08)' }}
            />
            <Bar dataKey="revenue" fill="#6c63ff" radius={[6, 6, 0, 0]}>
              {monthly.map((m, i) => (
                <Cell key={i} fill={m.revenue > 0 ? '#6c63ff' : '#2a3147'} fillOpacity={m.revenue > 0 ? 1 : 0.5} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Top Products {year}</h3>
        </div>
        {productData.length === 0 ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No data for {year}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {productData.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', background: COLORS[i % COLORS.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.qty} units · {formatUSD(p.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
