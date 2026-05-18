import { query } from '@/lib/db';
import { Users, DollarSign, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { getLastNMonths } from '@/lib/utils';
import StatCard from '@/components/dashboard/StatCard';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import DashboardRefresher from '@/components/dashboard/DashboardRefresher';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

async function getDashboardData() {
  const months = getLastNMonths(6);
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const todayStr      = now.toISOString().split('T')[0];
    const weekStartStr  = startOfWeek.toISOString().split('T')[0];
    const monthStartStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEndStr   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const sixMonthsAgo  = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

    // All 8 queries fired simultaneously via Hyperdrive pool — no sequential waiting!
    const [
      totalRes, activeRes, newRes,
      paymentsRes, expensesRes, weekPaymentsRes,
      memberGrowthRes, planRes,
    ] = await Promise.all([
      query('SELECT COUNT(*) FROM members'),
      query("SELECT COUNT(*) FROM members WHERE status = 'active'"),
      query('SELECT COUNT(*) FROM members WHERE created_at >= $1', [monthStartStr]),
      query('SELECT amount, payment_date FROM payments WHERE payment_date >= $1 AND deleted_at IS NULL', [new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]]),
      query('SELECT amount FROM expenses WHERE date >= $1 AND date <= $2', [monthStartStr, monthEndStr]),
      query('SELECT amount, payment_date FROM payments WHERE payment_date >= $1 AND payment_date <= $2 AND deleted_at IS NULL', [weekStartStr, todayStr]),
      query('SELECT created_at FROM members WHERE created_at >= $1', [sixMonthsAgo]),
      query("SELECT mp.name FROM memberships ms JOIN membership_plans mp ON ms.plan_id = mp.id WHERE ms.status = 'active'"),
    ]);

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekDays: { date: string; day: string; revenue: number }[] = [];
    const totalDays = daysFromMonday + 1;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDays.push({ date: d.toISOString().split('T')[0], day: i === totalDays - 1 ? 'Today' : DAYS[d.getDay()], revenue: 0 });
    }
    weekPaymentsRes.rows.forEach((p: any) => {
      const entry = weekDays.find(d => d.date === p.payment_date);
      if (entry) entry.revenue += Number(p.amount);
    });
    const weeklyChartData = weekDays.map(({ day, revenue }) => ({ day, revenue }));
    const weeklyRevenue = weekDays.reduce((s, d) => s + d.revenue, 0);

    const revenueByMonth: Record<string, number> = {};
    months.forEach((m) => (revenueByMonth[m] = 0));
    paymentsRes.rows.forEach((p: any) => {
      const m = new Date(p.payment_date).toLocaleString('en-US', { month: 'short' });
      if (revenueByMonth[m] !== undefined) revenueByMonth[m] += Number(p.amount);
    });
    const revenueData    = months.map((month) => ({ month, revenue: revenueByMonth[month] }));
    const monthlyRevenue = revenueByMonth[months[months.length - 1]] ?? 0;
    const monthlyExpenses = expensesRes.rows.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const monthlyProfit  = monthlyRevenue - monthlyExpenses;

    const memberGrowthMap: Record<string, number> = {};
    months.forEach((m) => { memberGrowthMap[m] = 0; });
    memberGrowthRes.rows.forEach((mb: any) => {
      const m = new Date(mb.created_at).toLocaleString('en-US', { month: 'short' });
      if (memberGrowthMap[m] !== undefined) memberGrowthMap[m]++;
    });
    const memberGrowthData = months.map((month) => ({ month, members: memberGrowthMap[month] }));

    const planMap: Record<string, number> = {};
    planRes.rows.forEach((ms: any) => {
      const name = ms.name ?? 'Unknown';
      planMap[name] = (planMap[name] ?? 0) + 1;
    });
    const planData = Object.entries(planMap).map(([name, value]) => ({ name, value }));

    return {
      stats: {
        totalMembers:  Number(totalRes.rows[0]?.count  ?? 0),
        activeMembers: Number(activeRes.rows[0]?.count ?? 0),
        newThisMonth:  Number(newRes.rows[0]?.count    ?? 0),
        weeklyRevenue, monthlyRevenue, monthlyExpenses, monthlyProfit,
      },
      weeklyChartData, revenueData, memberGrowthData, planData,
    };
  } catch (error) {
    console.error('Dashboard data error:', error);
    const emptyWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'].map(day => ({ day, revenue: 0 }));
    return {
      stats: { totalMembers: 0, activeMembers: 0, newThisMonth: 0, weeklyRevenue: 0, monthlyRevenue: 0, monthlyExpenses: 0, monthlyProfit: 0 },
      weeklyChartData: emptyWeek,
      revenueData:      months.map((month) => ({ month, revenue: 0 })),
      memberGrowthData: months.map((month) => ({ month, members: 0 })),
      planData: [],
    };
  }
}

export default async function DashboardPage() {
  const { stats, revenueData, memberGrowthData, planData } = await getDashboardData();

  return (
    <div>
      <DashboardRefresher />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back — here&apos;s what&apos;s happening today</p>
        </div>
        <div className="badge badge-success" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.875rem' }}>
          <Activity size={14} /> Live
        </div>
      </div>

      {/* Members + Monthly Revenue row */}
      <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
        <StatCard
          title="Total Members"
          value={stats.totalMembers}
          icon={<Users size={22} />}
          iconColor="var(--primary-light)"
          iconBg="var(--primary-glow)"
          change={stats.newThisMonth}
          changeLabel="new this month"
        />
        <StatCard
          title="Active Members"
          value={stats.activeMembers}
          icon={<Users size={22} />}
          iconColor="#10b981"
          iconBg="rgba(16,185,129,0.15)"
        />
        <StatCard
          title="Revenue This Month"
          amountUsd={stats.monthlyRevenue}
          icon={<DollarSign size={22} />}
          iconColor="#f59e0b"
          iconBg="rgba(245,158,11,0.15)"
        />
      </div>

      {/* Expenses / Profit */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Expenses This Month"
          amountUsd={stats.monthlyExpenses}
          icon={<TrendingDown size={22} />}
          iconColor="#ef4444"
          iconBg="rgba(239,68,68,0.15)"
        />
        <StatCard
          title="Profit This Month"
          amountUsd={stats.monthlyProfit}
          icon={stats.monthlyProfit >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          iconColor={stats.monthlyProfit >= 0 ? '#10b981' : '#ef4444'}
          iconBg={stats.monthlyProfit >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}
        />
      </div>

      {/* All Charts */}
      <DashboardCharts
        revenueData={revenueData}
        memberGrowthData={memberGrowthData}
        planData={planData}
      />
    </div>
  );
}
