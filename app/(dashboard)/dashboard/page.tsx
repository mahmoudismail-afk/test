import { createClient } from '@/lib/supabase/server';
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
    const supabase = await createClient();
    const now = new Date();

    // Date boundaries
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Start of current week (Monday)
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sun wraps to 6
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const todayStr      = now.toISOString().split('T')[0];
    const weekStartStr  = startOfWeek.toISOString().split('T')[0];
    const monthStartStr = startOfMonth.split('T')[0];
    const monthEndStr   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [
      { count: totalMembers },
      { count: activeMembers },
      { count: newThisMonth },
      { data: payments },
      { data: expensesThisMonth },
      { data: weekPayments },
    ] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }),
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('members').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
      supabase.from('payments')
        .select('amount, payment_date')
        .gte('payment_date', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0])
        .is('deleted_at', null),
      supabase.from('expenses')
        .select('amount')
        .gte('date', monthStartStr)
        .lte('date', monthEndStr),
      // Last 7 days: fetch for day-level grouping
      supabase.from('payments')
        .select('amount, payment_date')
        .gte('payment_date', weekStartStr)
        .lte('payment_date', todayStr)
        .is('deleted_at', null),
    ]);


    // ── Weekly chart: Mon → today ──
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekDays: { date: string; day: string; revenue: number }[] = [];
    const totalDays = daysFromMonday + 1; // Mon=1 day, Tue=2 days, ... today
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr  = d.toISOString().split('T')[0];
      const dayLabel = i === totalDays - 1 ? 'Today' : DAYS[d.getDay()];
      weekDays.push({ date: dateStr, day: dayLabel, revenue: 0 });
    }
    (weekPayments ?? []).forEach((p: any) => {
      const entry = weekDays.find(d => d.date === p.payment_date);
      if (entry) entry.revenue += Number(p.amount);
    });
    const weeklyChartData = weekDays.map(({ day, revenue }) => ({ day, revenue }));
    const weeklyRevenue = weekDays.reduce((s, d) => s + d.revenue, 0);

    // ── Monthly revenue per month ──
    const revenueByMonth: Record<string, number> = {};
    months.forEach((m) => (revenueByMonth[m] = 0));
    (payments ?? []).forEach((p) => {
      const m = new Date(p.payment_date).toLocaleString('en-US', { month: 'short' });
      if (revenueByMonth[m] !== undefined) revenueByMonth[m] += Number(p.amount);
    });
    const revenueData    = months.map((month) => ({ month, revenue: revenueByMonth[month] }));
    const monthlyRevenue = revenueByMonth[months[months.length - 1]] ?? 0;
    const monthlyExpenses = (expensesThisMonth ?? []).reduce((s, e) => s + Number(e.amount), 0);
    const monthlyProfit  = monthlyRevenue - monthlyExpenses;

    // ── Member growth ──
    const { data: membersByMonth } = await supabase
      .from('members')
      .select('created_at')
      .gte('created_at', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString());

    const memberGrowthMap: Record<string, number> = {};
    months.forEach((m) => {
      memberGrowthMap[m] = 0;
    });
    (membersByMonth ?? []).forEach((mb: any) => {
      const m = new Date(mb.created_at).toLocaleString('en-US', { month: 'short' });
      if (memberGrowthMap[m] !== undefined) memberGrowthMap[m]++;
    });
    const memberGrowthData = months.map((month) => ({ month, members: memberGrowthMap[month] }));

    // ── Plan distribution ──
    const { data: membershipsWithPlan } = await supabase
      .from('memberships')
      .select('plan:membership_plans(name)')
      .eq('status', 'active');

    const planMap: Record<string, number> = {};
    (membershipsWithPlan ?? []).forEach((ms: any) => {
      const name = ms.plan?.name ?? 'Unknown';
      planMap[name] = (planMap[name] ?? 0) + 1;
    });
    const planData = Object.entries(planMap).map(([name, value]) => ({ name, value }));

    return {
      stats: {
        totalMembers:    totalMembers   ?? 0,
        activeMembers:   activeMembers  ?? 0,
        newThisMonth:    newThisMonth   ?? 0,
        weeklyRevenue,
        monthlyRevenue,
        monthlyExpenses,
        monthlyProfit,
      },
      weeklyChartData,
      revenueData,
      memberGrowthData,
      planData,
    };
  } catch (error) {
    console.error('Error fetching dashboard data during build:', error);
    const emptyWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'].map(day => ({ day, revenue: 0 }));
    return {
      stats: {
        totalMembers: 0, activeMembers: 0, newThisMonth: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0, monthlyExpenses: 0, monthlyProfit: 0,
      },
      weeklyChartData:  emptyWeek,
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
