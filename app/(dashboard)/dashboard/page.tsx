import { getDashboardStats } from '@/lib/actions/pos';
import { getExpiringSoon } from '@/lib/actions/products';
import { getLbpRate } from '@/lib/actions/settings';
import { formatUSD, formatLBP, usdToLbp } from '@/lib/currency';
import {
  ShoppingCart, DollarSign, TrendingUp, AlertTriangle,
  Activity, Users, Package, ArrowUpRight, Calendar
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

  const kpis          = stats?.kpis           ?? null;
  const revenueByMonth = stats?.revenueByMonth ?? [];
  const topProducts   = stats?.topProducts    ?? [];
  const totalDebtUsd  = stats?.totalDebtUsd   ?? 0;

  const revenue6m    = parseFloat(kpis?.revenue_6m ?? '0');
  const transactions = parseInt(kpis?.transactions_6m ?? '0');
  const activeDays   = parseInt(kpis?.active_days ?? '0');
  const avgDaily     = activeDays > 0 ? revenue6m / activeDays : 0;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Rolling last 6 months · Live data</p>
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
          <div className="badge badge-success" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.875rem' }}>
            <Activity size={14} /> Live
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
        {/* Revenue 6M */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Revenue (6 Months)</span>
            <span className="stat-card-icon" style={{ background: 'rgba(108,99,255,0.15)', color: '#6c63ff' }}>
              <TrendingUp size={18} />
            </span>
          </div>
          <div className="stat-card-value">{formatUSD(revenue6m)}</div>
          <div className="stat-card-sub" style={{ color: 'var(--amber)' }}>
            {formatLBP(usdToLbp(revenue6m, lbpRate))}
          </div>
        </div>

        {/* Transactions */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Transactions</span>
            <span className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
              <ShoppingCart size={18} />
            </span>
          </div>
          <div className="stat-card-value">{transactions.toLocaleString()}</div>
          <div className="stat-card-sub">Last 6 months</div>
        </div>

        {/* Avg Daily */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Avg. Daily Revenue</span>
            <span className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <DollarSign size={18} />
            </span>
          </div>
          <div className="stat-card-value">{formatUSD(avgDaily)}</div>
          <div className="stat-card-sub">Over {activeDays} active days</div>
        </div>

        {/* Total Debt */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Outstanding Debt</span>
            <span className="stat-card-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              <Users size={18} />
            </span>
          </div>
          <div className="stat-card-value" style={{ color: totalDebtUsd > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {formatUSD(totalDebtUsd)}
          </div>
          <div className="stat-card-sub">
            <Link href="/debts" style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 600 }}>
              View debts →
            </Link>
          </div>
        </div>
      </div>

      {/* Charts */}
      <DashboardPOSCharts revenueByMonth={revenueByMonth} topProducts={topProducts} />

      {/* Alerts Row */}
      <div className="grid-2" style={{ marginTop: '1.5rem' }}>
        {/* Expiring Soon */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
              Expiring Within 30 Days
            </h3>
            <Link href="/inventory" style={{ fontSize: 12, color: 'var(--primary)' }}>
              View all
            </Link>
          </div>
          {expiring.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>
              ✓ No items expiring soon
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {expiring.slice(0, 5).map((item: any) => (
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

        {/* Quick Links */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/pos',         label: 'Open POS Register',       icon: <ShoppingCart size={16} />, color: '#6c63ff' },
              { href: '/z-report',    label: 'View Z-Report (Today)',    icon: <Calendar size={16} />,     color: '#10b981' },
              { href: '/inventory',   label: 'Manage Inventory',         icon: <Package size={16} />,      color: '#f59e0b' },
              { href: '/debts',       label: 'Debt Ledger',              icon: <Users size={16} />,        color: '#ef4444' },
              { href: '/pos-history', label: 'Yearly Archive',           icon: <TrendingUp size={16} />,   color: '#38bdf8' },
              { href: '/audit-log',   label: 'Audit Log (Admin)',        icon: <Activity size={16} />,     color: '#94a3b8' },
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
