'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell
} from 'recharts';
import { formatUSD } from '@/lib/currency';

interface Props {
  revenueByMonth: { month: string; month_date: string; revenue_usd: string; transactions: string }[];
  revenueByWeek: { week: string; week_date: string; revenue_usd: string }[];
  topProducts: { product_name: string; qty_sold: string; revenue_usd: string }[];
}

const COLORS = ['#6c63ff', '#38bdf8', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'];

const CustomTooltipRevenue = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '12px 16px', fontSize: 13,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ color: '#38bdf8' }}>{formatUSD(parseFloat(payload[0].value))}</div>
        {payload[1] && <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{payload[1]?.value ?? 0} transactions</div>}
      </div>
    );
  }
  return null;
};

export default function DashboardPOSCharts({ revenueByMonth, revenueByWeek, topProducts }: Props) {
  const revenueData = revenueByMonth.map((r) => ({
    month: r.month,
    revenue: parseFloat(r.revenue_usd),
    transactions: parseInt(r.transactions),
  }));

  const weekData = revenueByWeek.map((r) => ({
    week: r.week,
    revenue: parseFloat(r.revenue_usd),
  }));

  const productData = topProducts.map((p) => ({
    name: p.product_name.length > 16 ? p.product_name.slice(0, 16) + '…' : p.product_name,
    qty: parseInt(p.qty_sold),
    revenue: parseFloat(p.revenue_usd),
  }));

  return (
    <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
      {/* Monthly Revenue */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Monthly Revenue (USD)</h3>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last 6 months</span>
        </div>
        {revenueData.length === 0 ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No sales data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<CustomTooltipRevenue />} cursor={{ fill: 'rgba(56,189,248,0.08)' }} />
              <Bar dataKey="revenue" fill="#38bdf8" radius={[6, 6, 0, 0]}>
                {revenueData.map((_, i) => (
                  <Cell key={i} fill="#38bdf8" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weekly Revenue */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Weekly Revenue (USD)</h3>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last 4 weeks</span>
        </div>
        {weekData.length === 0 ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No sales data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<CustomTooltipRevenue />} cursor={{ fill: 'rgba(56,189,248,0.08)' }} />
              <Bar dataKey="revenue" fill="#38bdf8" radius={[6, 6, 0, 0]}>
                {weekData.map((_, i) => (
                  <Cell key={i} fill="#38bdf8" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Products */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Top Products (Units Sold)</h3>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last 6 months</span>
        </div>
        {productData.length === 0 ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No sales data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={productData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                formatter={(v: any) => [`${v} units`, 'Sold']}
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                cursor={{ fill: 'rgba(108,99,255,0.08)' }}
              />
              <Bar dataKey="qty" radius={[0, 6, 6, 0]}>
                {productData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
