import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { Users, DollarSign, TrendingUp, Calendar, TrendingDown, Receipt, ShoppingCart } from 'lucide-react';
import HistoryClient from '@/components/history/HistoryClient';
import { requirePermission } from '@/lib/auth-guard';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'History' };
export const dynamic = 'force-dynamic';

const ALL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function getHistoryData(year: number) {
  const supabase = await createClient();

  const yearStart = `${year}-01-01`;
  const yearEnd   = `${year}-12-31`;

  const [
    { data: payments },
    { data: membersJoined },
    { data: membershipsActive },
    { data: planData },
    { data: expensesData },
    { data: inventoryTxData },
  ] = await Promise.all([
    supabase.from('payments')
      .select('amount, payment_date')
      .gte('payment_date', yearStart)
      .lte('payment_date', yearEnd),

    supabase.from('members')
      .select('created_at, status')
      .gte('created_at', `${yearStart}T00:00:00`)
      .lte('created_at', `${yearEnd}T23:59:59`),

    supabase.from('memberships')
      .select('status, start_date')
      .gte('start_date', yearStart)
      .lte('start_date', yearEnd),

    supabase.from('memberships')
      .select('plan:membership_plans(name), start_date')
      .gte('start_date', yearStart)
      .lte('start_date', yearEnd),

    supabase.from('expenses')
      .select('amount, date, type')
      .gte('date', yearStart)
      .lte('date', yearEnd),

    supabase.from('inventory_transactions')
      .select('type, total_amount, created_at')
      .gte('created_at', `${yearStart}T00:00:00`)
      .lte('created_at', `${yearEnd}T23:59:59`),
  ]);

  // --- Revenue per month ---
  const revenueByMonth: Record<string, number> = {};
  ALL_MONTHS.forEach(m => (revenueByMonth[m] = 0));
  (payments ?? []).forEach(p => {
    const m = new Date(p.payment_date).toLocaleString('en-US', { month: 'short' });
    if (revenueByMonth[m] !== undefined) revenueByMonth[m] += Number(p.amount);
  });
  const revenueData = ALL_MONTHS.map(month => ({ month, revenue: revenueByMonth[month] }));
  const totalRevenue = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);

  // --- New members per month ---
  const membersByMonth: Record<string, number> = {};
  ALL_MONTHS.forEach(m => (membersByMonth[m] = 0));
  (membersJoined ?? []).forEach(mb => {
    const m = new Date(mb.created_at).toLocaleString('en-US', { month: 'short' });
    if (membersByMonth[m] !== undefined) membersByMonth[m]++;
  });
  const memberGrowthData = ALL_MONTHS.map(month => ({ month, members: membersByMonth[month] }));
  const totalNewMembers = membersJoined?.length ?? 0;


  // --- Plan distribution ---
  const planMap: Record<string, number> = {};
  (planData ?? []).forEach((ms: any) => {
    const name = ms.plan?.name ?? 'Unknown';
    planMap[name] = (planMap[name] ?? 0) + 1;
  });
  const planDistData = Object.entries(planMap).map(([name, value]) => ({ name, value }));

  // --- Renewals per month (total memberships started) ---
  const renewalsByMonth: Record<string, number> = {};
  ALL_MONTHS.forEach(m => (renewalsByMonth[m] = 0));
  (membershipsActive ?? []).forEach(ms => {
    const m = new Date(ms.start_date).toLocaleString('en-US', { month: 'short' });
    if (renewalsByMonth[m] !== undefined) renewalsByMonth[m]++;
  });
  const renewalsData = ALL_MONTHS.map(month => ({ month, renewals: renewalsByMonth[month] }));
  const totalRenewals = membershipsActive?.length ?? 0;

  // --- Expenses & Salaries per month ---
  const expByMonth: Record<string, { expense: number; salary: number }> = {};
  ALL_MONTHS.forEach(m => (expByMonth[m] = { expense: 0, salary: 0 }));
  (expensesData ?? []).forEach((e: any) => {
    const m = new Date(e.date).toLocaleString('en-US', { month: 'short' });
    if (!expByMonth[m]) return;
    if (e.type === 'salary') expByMonth[m].salary += Number(e.amount);
    else expByMonth[m].expense += Number(e.amount);
  });
  const monthlyExpensesData = ALL_MONTHS.map(month => ({
    month,
    expense: expByMonth[month].expense,
    salary: expByMonth[month].salary,
    total: expByMonth[month].expense + expByMonth[month].salary,
  }));
  const totalExpenses = (expensesData ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);

  // --- Profit per month (revenue - expenses) ---
  const profitData = ALL_MONTHS.map(month => ({
    month,
    revenue: revenueByMonth[month],
    expenses: expByMonth[month].expense + expByMonth[month].salary,
    profit: revenueByMonth[month] - (expByMonth[month].expense + expByMonth[month].salary),
  }));

  // --- Inventory sales & restocks per month ---
  const invByMonth: Record<string, { sales: number; restocks: number }> = {};
  ALL_MONTHS.forEach(m => (invByMonth[m] = { sales: 0, restocks: 0 }));
  (inventoryTxData ?? []).forEach((tx: any) => {
    const m = new Date(tx.created_at).toLocaleString('en-US', { month: 'short' });
    if (!invByMonth[m]) return;
    if (tx.type === 'sale') invByMonth[m].sales += Number(tx.total_amount);
    else if (tx.type === 'restock') invByMonth[m].restocks += Number(tx.total_amount);
  });
  const inventoryData = ALL_MONTHS.map(month => ({
    month,
    sales: invByMonth[month].sales,
    restocks: invByMonth[month].restocks,
  }));
  const totalInventorySales = (inventoryTxData ?? []).filter((t: any) => t.type === 'sale').reduce((s: number, t: any) => s + Number(t.total_amount), 0);

  return {
    revenueData,
    memberGrowthData,
    planDistData,
    renewalsData,
    monthlyExpensesData,
    profitData,
    inventoryData,
    stats: {
      totalRevenue,
      totalNewMembers,
      totalRenewals,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      avgMonthlyRevenue: Math.round(totalRevenue / 12),
      totalInventorySales,
    },
  };
}

async function getAvailableYears(): Promise<number[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('members')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1);

  const earliestYear = data?.[0]
    ? new Date(data[0].created_at).getFullYear()
    : new Date().getFullYear();

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= earliestYear; y--) {
    years.push(y);
  }
  return years;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string }>;
}) {
  const resolved = searchParams ? await searchParams : {};
  const currentYear = new Date().getFullYear();
  const year = resolved.year ? parseInt(resolved.year) : currentYear;
  await requirePermission('history');

  const [historyData, availableYears] = await Promise.all([
    getHistoryData(year),
    getAvailableYears(),
  ]);

  const { stats, revenueData, memberGrowthData, planDistData, renewalsData, monthlyExpensesData, profitData, inventoryData } = historyData;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">Annual performance overview — all data by year</p>
        </div>
      </div>

      {/* Year Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {availableYears.map(y => (
          <a
            key={y}
            href={`/history?year=${y}`}
            className={`btn btn-sm ${y === year ? 'btn-primary' : 'btn-secondary'}`}
          >
            {y}
          </a>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid-stats" style={{ marginBottom: '1.5rem' }}>
        {[
          { title: `Total Revenue ${year}`, value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
          { title: 'New Members', value: stats.totalNewMembers, icon: Users, color: 'var(--primary-light)', bg: 'var(--primary-glow)' },
          { title: 'Total Subscriptions', value: stats.totalRenewals, icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
          { title: `Total Expenses ${year}`, value: formatCurrency(stats.totalExpenses), icon: Receipt, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
          { title: `Net Profit ${year}`, value: formatCurrency(stats.netProfit), icon: stats.netProfit >= 0 ? TrendingUp : TrendingDown, color: stats.netProfit >= 0 ? '#10b981' : '#ef4444', bg: stats.netProfit >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' },
          { title: 'Avg Monthly Revenue', value: formatCurrency(stats.avgMonthlyRevenue), icon: Calendar, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
          { title: `Inventory Sales ${year}`, value: formatCurrency(stats.totalInventorySales), icon: ShoppingCart, color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
        ].map(({ title, value, icon: Icon, color, bg }) => (
          <div key={title} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{title}</p>
              <p style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>{String(value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <HistoryClient
        year={year}
        revenueData={revenueData}
        memberGrowthData={memberGrowthData}
        planDistData={planDistData}
        renewalsData={renewalsData}
        monthlyExpensesData={monthlyExpensesData}
        profitData={profitData}
        inventoryData={inventoryData}
      />
    </div>
  );
}
