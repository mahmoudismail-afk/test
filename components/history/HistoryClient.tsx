'use client';

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
const tooltipStyle = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '0.8125rem',
};

const BAR_COLORS = ['#6c63ff', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

interface HistoryClientProps {
  year: number;
  revenueData: { month: string; revenue: number }[];
  memberGrowthData: { month: string; members: number }[];
  planDistData: { name: string; value: number }[];
  renewalsData: { month: string; renewals: number }[];
  monthlyExpensesData: { month: string; expense: number; salary: number; total: number }[];
  profitData: { month: string; revenue: number; expenses: number; profit: number }[];
  inventoryData: { month: string; sales: number; restocks: number }[];
}

export default function HistoryClient({
  year, revenueData, memberGrowthData, planDistData, renewalsData,
  monthlyExpensesData, profitData, inventoryData,
}: HistoryClientProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Revenue vs Expenses vs Profit — full width */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <p className="chart-card-title">Revenue vs Expenses vs Profit — {year}</p>
            <p className="chart-card-subtitle">Monthly comparison of income, costs and net profit</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={profitData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6c63ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${v >= 1000 ? `${v / 1000}k` : v}`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(val: number, name: string) => [`$${val.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)]} />
            <Legend formatter={v => (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textTransform: 'capitalize' }}>{v}</span>
            )} />
            <Area type="monotone" dataKey="revenue"  stroke="#6c63ff" strokeWidth={2} fill="url(#revGrad2)" dot={false} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expGrad)"  dot={false} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="profit"   stroke="#10b981" strokeWidth={2} fill="url(#profGrad)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue — full width */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <p className="chart-card-title">Monthly Revenue — {year}</p>
            <p className="chart-card-subtitle">Total income collected each month</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6c63ff" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${v >= 1000 ? `${v / 1000}k` : v}`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [`$${val.toLocaleString()}`, 'Revenue']} />
            <Area type="monotone" dataKey="revenue" stroke="#6c63ff" strokeWidth={2.5}
              fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#6c63ff' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 2-column row */}
      <div className="chart-grid-2" style={{ gap: '1.5rem' }}>

        {/* Monthly Expenses breakdown */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <p className="chart-card-title">Monthly Expenses — {year}</p>
              <p className="chart-card-subtitle">Expenses vs salaries per month</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyExpensesData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v >= 1000 ? `${v / 1000}k` : v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(val: number, name: string) => [`$${val.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                cursor={{ fill: 'rgba(239,68,68,0.08)' }} />
              <Legend formatter={v => (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textTransform: 'capitalize' }}>{v}</span>
              )} />
              <Bar dataKey="expense" stackId="a" fill="#ef4444" />
              <Bar dataKey="salary"  stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* New Members */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <p className="chart-card-title">New Members — {year}</p>
              <p className="chart-card-subtitle">Members who joined each month</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={memberGrowthData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [val, 'New Members']}
                cursor={{ fill: 'rgba(108,99,255,0.08)' }} />
              <Bar dataKey="members" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subscriptions started */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <p className="chart-card-title">Subscriptions Started — {year}</p>
              <p className="chart-card-subtitle">New &amp; renewed memberships per month</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={renewalsData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [val, 'Subscriptions']}
                cursor={{ fill: 'rgba(108,99,255,0.08)' }} />
              <Bar dataKey="renewals" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>


        {/* Plan distribution */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <p className="chart-card-title">Plan Distribution — {year}</p>
              <p className="chart-card-subtitle">Memberships started by plan type</p>
            </div>
          </div>
          {planDistData.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No membership data for this year</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={planDistData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [val, 'Members']}
                  cursor={{ fill: 'rgba(108,99,255,0.08)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {planDistData.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Inventory Sales vs Restocks — full width */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <p className="chart-card-title">Inventory — Sales vs Restocks — {year}</p>
            <p className="chart-card-subtitle">Monthly inventory activity: revenue from sales and cost of restocks</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={inventoryData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${v >= 1000 ? `${v / 1000}k` : v}`} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(val: number, name: string) => [`$${val.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)]}
              cursor={{ fill: 'rgba(6,182,212,0.08)' }} />
            <Legend formatter={v => (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textTransform: 'capitalize' }}>{v}</span>
            )} />
            <Bar dataKey="sales"    fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="restocks" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}

