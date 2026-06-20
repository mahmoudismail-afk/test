import { getDashboardStats } from '@/lib/actions/pos';
import { getExpiringSoon } from '@/lib/actions/products';
import { getLbpRate } from '@/lib/actions/settings';
import { formatUSD, formatLBP, usdToLbp } from '@/lib/currency';
import {
  ShoppingCart, DollarSign, TrendingUp, AlertTriangle,
  Activity, Users, Package, ArrowUpRight, Calendar, Receipt, TrendingDown, Wallet
} from 'lucide-react';
import Link from 'next/link';
import DashboardPOSCharts from '@/components/dashboard/DashboardPOSCharts';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let stats: Awaited<ReturnType<typeof getDashboardStats>> | null = null;
  let expiring: any[] = [];
  let lbpRate = 89500;

  try { stats     = await getDashboardStats(); } catch { stats     = null; }
  try { expiring  = await getExpiringSoon();   } catch { expiring  = []; }
  try { lbpRate   = await getLbpRate();        } catch { lbpRate   = 89500; }

  const kpis             = stats?.kpis             ?? null;
  const revenueByMonth   = stats?.revenueByMonth   ?? [];
  const revenueByWeek    = stats?.revenueByWeek    ?? [];
  const topProducts      = stats?.topProducts      ?? [];
  const totalDebtUsd     = stats?.totalDebtUsd     ?? 0;
  const cogsThisMonth    = stats?.cogsThisMonth    ?? 0;
  const expensesMonth    = stats?.expensesThisMonth ?? { totalUsd: 0, count: 0 };
  const revenueMonth     = stats?.revenueThisMonth  ?? { totalUsd: 0, transactions: 0 };
  
  // As per screenshot math: Net Profit = Revenue - General Expenses
  const netProfitMonth   = revenueMonth.totalUsd - expensesMonth.totalUsd;
  // Gross = Revenue - COGS
  const grossProfitMonth = revenueMonth.totalUsd - cogsThisMonth;

  const revenue6m    = parseFloat(kpis?.revenue_6m ?? '0');
  const transactions = parseInt(kpis?.transactions_6m ?? '0');
  const activeDays   = parseInt(kpis?.active_days ?? '0');
  const avgDaily     = activeDays > 0 ? revenue6m / activeDays : 0;

  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Dashboard</h1>
          <p className="page-subtitle">Showing data for {monthName} & last 6 months</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            href="/pos"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', background: 'var(--primary)', color: '#fff',
              borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none',
              boxShadow: '0 0 20px var(--primary-glow)',
            }}
          >
            <ShoppingCart size={15} />
            Open Register
          </Link>
          <div className="badge badge-success" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.875rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none' }}>
            <Activity size={14} /> Live
          </div>
        </div>
      </div>

      {/* THIS MONTH section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          This Month — {monthName}
        </div>
        <div className="grid-3">

          {/* Revenue This Month */}
          <div className="card" style={{ borderLeft: '3px solid #10b981', padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Revenue</span>
              <TrendingUp size={16} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem' }}>
              {formatUSD(revenueMonth.totalUsd)}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 600, marginBottom: '0.5rem' }}>
              {formatLBP(usdToLbp(revenueMonth.totalUsd, lbpRate))}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              {revenueMonth.transactions} transactions
            </div>
          </div>

          {/* Expenses This Month */}
          <div className="card" style={{ borderLeft: '3px solid #ef4444', padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Expenses</span>
              <TrendingDown size={16} style={{ color: '#ef4444' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem' }}>
              {formatUSD(expensesMonth.totalUsd)}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 600, marginBottom: '0.5rem' }}>
              {formatLBP(usdToLbp(expensesMonth.totalUsd, lbpRate))}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6c63ff', fontWeight: 600 }}>
              {expensesMonth.count} general expenses <span style={{ color: 'var(--text-primary)' }}>· {formatUSD(cogsThisMonth)} COGS</span>
            </div>
          </div>

          {/* Net Profit This Month */}
          <div className="card" style={{ borderLeft: `3px solid ${netProfitMonth >= 0 ? '#6c63ff' : '#f59e0b'}`, padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Net Profit</span>
              <Wallet size={16} style={{ color: '#6c63ff' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: netProfitMonth >= 0 ? '#6c63ff' : '#f87171', marginBottom: '0.5rem' }}>
              {netProfitMonth >= 0 ? '' : '−'}{formatUSD(Math.abs(netProfitMonth))}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 600, marginBottom: '0.5rem' }}>
              {formatLBP(usdToLbp(Math.abs(netProfitMonth), lbpRate))}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#10b981' }}>
              Gross: {formatUSD(grossProfitMonth)}
            </div>
          </div>
        </div>
      </div>

      {/* 6 MONTH section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          Last 6 Months
        </div>
        <div className="grid-3">
          {/* Revenue 6M */}
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Total Revenue</span>
              <TrendingUp size={16} style={{ color: '#6c63ff' }} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {formatUSD(revenue6m)}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 600 }}>
              {formatLBP(usdToLbp(revenue6m, lbpRate))}
            </div>
          </div>

          {/* Transactions */}
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Transactions</span>
              <Receipt size={16} style={{ color: '#38bdf8' }} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {transactions.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Over 6 months
            </div>
          </div>

          {/* Avg Daily */}
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Avg. Daily Revenue</span>
              <DollarSign size={16} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {formatUSD(avgDaily)}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Over {activeDays} active days
            </div>
          </div>
        </div>
      </div>

      {/* ANALYTICS */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          Analytics
        </div>
        <DashboardPOSCharts 
          revenueByMonth={revenueByMonth} 
          revenueByWeek={revenueByWeek} 
          topProducts={topProducts} 
        />
      </div>

      {/* Bottom Row */}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        {/* Outstanding Debt */}
        <div className="card" style={{ borderTop: '3px solid #ef4444', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Users size={16} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Outstanding Debt</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem' }}>
            {formatUSD(totalDebtUsd)}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 600, marginBottom: '1.5rem' }}>
            {formatLBP(usdToLbp(totalDebtUsd, lbpRate))}
          </div>
          <div>
            <Link href="/debts" style={{ 
              display: 'inline-block',
              background: 'rgba(108,99,255,0.15)', color: '#6c63ff', 
              fontSize: '0.8rem', fontWeight: 600, padding: '0.4rem 0.8rem', borderRadius: 6,
              textDecoration: 'none'
            }}>
              Manage Debt Ledger →
            </Link>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Expiring Within 30 Days</span>
            </div>
          </div>
          <Link href="/inventory" style={{ fontSize: '0.8rem', color: '#6c63ff', textDecoration: 'none', display: 'block', marginBottom: '1rem' }}>
            View all
          </Link>
          {expiring.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '4px 0' }}>
              ✓ No items expiring soon
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {expiring.slice(0, 4).map((item: any) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>
                      Expires: {new Date(item.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>qty: {item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Quick Actions</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/pos',         label: 'Open POS Register',    icon: <ShoppingCart size={16} />, color: '#6c63ff' },
              { href: '/z-report',    label: 'View Z-Report (Today)', icon: <Calendar size={16} />,     color: '#10b981' },
              { href: '/expenses',    label: 'Log Expense',           icon: <TrendingDown size={16} />, color: '#ef4444' },
              { href: '/inventory',   label: 'Manage Items',          icon: <Package size={16} />,      color: '#f59e0b' },
              { href: '/debts',       label: 'Debt Ledger',           icon: <Users size={16} />,        color: '#f87171' },
            ].map(({ href, label, icon, color }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--bg-card)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  color: 'var(--text-primary)', textDecoration: 'none', fontSize: 13, fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, color }}>
                  {icon} {label}
                </span>
                <ArrowUpRight size={14} style={{ color: 'var(--text-muted)' }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
