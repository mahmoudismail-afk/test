'use client';

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { DollarSign, Users, CalendarCheck, TrendingUp, Activity, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PIE_COLORS = ['#6c63ff', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthlyRevenue(payments: any[]) {
  const map: Record<string, number> = {};
  payments.forEach((p) => {
    if (!p.payment_date) return;
    const key = getMonthKey(p.payment_date);
    map[key] = (map[key] ?? 0) + Number(p.amount);
  });
  // Last 6 months
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({ name: MONTHS[d.getMonth()], revenue: map[key] ?? 0 });
  }
  return result;
}

function buildMemberGrowth(members: any[]) {
  const map: Record<string, number> = {};
  members.forEach((m) => {
    if (!m.created_at) return;
    const key = getMonthKey(m.created_at);
    map[key] = (map[key] ?? 0) + 1;
  });
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({ name: MONTHS[d.getMonth()], members: map[key] ?? 0 });
  }
  return result;
}

function buildPlanBreakdown(memberships: any[]) {
  const map: Record<string, number> = {};
  memberships
    .filter((m) => m.status === 'active')
    .forEach((m) => {
      const name = (m.membership_plans as any)?.name ?? 'Unknown';
      map[name] = (map[name] ?? 0) + 1;
    });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function buildClassAttendance(classSchedules: any[], classTypes: any[]) {
  const typeMap: Record<string, string> = {};
  classTypes.forEach((ct) => (typeMap[ct.id] = ct.name));
  const map: Record<string, number> = {};
  classSchedules.forEach((s) => {
    const name = typeMap[s.class_type_id] ?? 'Unknown';
    map[name] = (map[name] ?? 0) + 1;
  });
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.8125rem'
      }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color ?? 'var(--primary)', fontWeight: 600 }}>
            {p.dataKey === 'revenue' ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ReportsClient({ payments, members, memberships, plans, classSchedules, classTypes, checkins, inventoryTxns = [], expenses = [] }: {
  payments: any[];
  members: any[];
  memberships: any[];
  plans: any[];
  classSchedules: any[];
  classTypes: any[];
  checkins: any[];
  inventoryTxns?: any[];
  expenses?: any[];
}) {
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);
  const activeMembers = members.filter((m) => m.status === 'active').length;
  const scheduledClasses = classSchedules.filter((c) => c.status === 'scheduled').length;
  const checkinsThisMonth = checkins.filter((c) => {
    if (!c.checked_in_at) return false;
    const d = new Date(c.checked_in_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const revenueData = buildMonthlyRevenue(payments);
  const growthData = buildMemberGrowth(members);
  const planData = buildPlanBreakdown(memberships);
  const classData = buildClassAttendance(classSchedules, classTypes);

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Active Members', value: activeMembers, icon: Users, color: '#6c63ff', bg: 'rgba(108,99,255,0.15)' },
    { label: 'Scheduled Classes', value: scheduledClasses, icon: CalendarCheck, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
    { label: 'Check-ins This Month', value: checkinsThisMonth, icon: Activity, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ];

  const chartAxisStyle = { fill: '#64748b', fontSize: 12 };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Business overview and trends</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-stats" style={{ marginBottom: '2rem' }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="stat-icon" style={{ background: s.bg }}>
                <s.icon size={22} style={{ color: s.color }} />
              </div>
              <div>
                <p className="stat-label">{s.label}</p>
                <p className="stat-value" style={{ fontSize: '1.6rem', color: s.color }}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue & Growth row */}
      <div className="grid-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Monthly Revenue */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
            <TrendingUp size={18} style={{ color: '#10b981' }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Monthly Revenue</h3>
          </div>
          {revenueData.every(d => d.revenue === 0) ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No payment data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={48} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#6c63ff" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Member Growth */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
            <Users size={18} style={{ color: '#6c63ff' }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>New Members (6 months)</h3>
          </div>
          {growthData.every(d => d.members === 0) ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No member data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={growthData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone" dataKey="members"
                  stroke="#06b6d4" strokeWidth={2.5}
                  dot={{ fill: '#06b6d4', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Plan breakdown & Class attendance row */}
      <div className="grid-2" style={{ gap: '1.25rem' }}>
        {/* Membership breakdown pie */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
            <DollarSign size={18} style={{ color: '#f59e0b' }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Active Memberships by Plan</h3>
          </div>
          {planData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No active memberships</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {planData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                {planData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Class attendance */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
            <CalendarCheck size={18} style={{ color: '#06b6d4' }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Classes by Type</h3>
          </div>
          {classData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No class data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={classData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={chartAxisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={chartAxisStyle} axisLine={false} tickLine={false} width={64} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#06b6d4" radius={[0, 6, 6, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Profit Summary ─────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
          <TrendingUp size={18} style={{ color: '#10b981' }} />
          <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Profit Summary</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Gym Membership Profit */}
          {(() => {
            const gymRevenue = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
            const gymExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
            const gymProfit = gymRevenue - gymExpenses;
            return (
              <div style={{ background: 'var(--bg-base)', borderRadius: 12, padding: '1.25rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>🏋️ Gym Membership Revenue</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(gymRevenue)}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Expenses: <span style={{ color: '#ef4444' }}>{formatCurrency(gymExpenses)}</span></p>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, marginTop: 6, color: gymProfit >= 0 ? '#10b981' : '#ef4444' }}>Net: {formatCurrency(gymProfit)}</p>
              </div>
            );
          })()}
          {/* Shop / Inventory Profit */}
          {(() => {
            const shopRevenue = inventoryTxns.filter((t: any) => t.type === 'sale').reduce((s: number, t: any) => s + Number(t.total_amount), 0);
            const shopCosts = inventoryTxns.filter((t: any) => t.type === 'restock').reduce((s: number, t: any) => s + Number(t.total_amount), 0);
            const shopProfit = shopRevenue - shopCosts;
            return (
              <div style={{ background: 'var(--bg-base)', borderRadius: 12, padding: '1.25rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>🛒 Shop / Inventory Revenue</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#6c63ff' }}>{formatCurrency(shopRevenue)}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Purchase Costs: <span style={{ color: '#ef4444' }}>{formatCurrency(shopCosts)}</span></p>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, marginTop: 6, color: shopProfit >= 0 ? '#10b981' : '#ef4444' }}>Net: {formatCurrency(shopProfit)}</p>
              </div>
            );
          })()}
          {/* Combined Total */}
          {(() => {
            const gymRevenue = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
            const gymExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
            const shopRevenue = inventoryTxns.filter((t: any) => t.type === 'sale').reduce((s: number, t: any) => s + Number(t.total_amount), 0);
            const shopCosts = inventoryTxns.filter((t: any) => t.type === 'restock').reduce((s: number, t: any) => s + Number(t.total_amount), 0);
            const totalProfit = (gymRevenue + shopRevenue) - (gymExpenses + shopCosts);
            return (
              <div style={{ background: totalProfit >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${totalProfit >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 12, padding: '1.25rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>📊 Total Business Profit</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: totalProfit >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(totalProfit)}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Gym + Shop combined</p>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
