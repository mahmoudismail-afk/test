import { getYearlyArchive } from '@/lib/actions/pos';
import { formatUSD } from '@/lib/currency';
import { BarChart2, Calendar } from 'lucide-react';
import Link from 'next/link';
import YearlyArchiveCharts from '@/components/pos/YearlyArchiveCharts';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'History Archive' };
export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ year?: string }>;
}

export default async function PosHistoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = parseInt(params.year ?? String(currentYear));

  let monthly: any[] = [];
  let topProducts: any[] = [];
  let availableYears: number[] = [];

  try {
    const result = await getYearlyArchive(selectedYear);
    monthly        = result.monthly;
    topProducts    = result.topProducts;
    availableYears = result.availableYears;
  } catch {
    monthly = []; topProducts = []; availableYears = [];
  }

  const totalRevenue = monthly.reduce((s: number, m: any) => s + parseFloat(m.revenue_usd), 0);
  const totalTx      = monthly.reduce((s: number, m: any) => s + parseInt(m.transactions), 0);

  // Fill all 12 months
  const allMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthlyFilled = allMonths.map((name, i) => {
    const found = monthly.find((m: any) => parseInt(m.month_num) === i + 1);
    return {
      month: name.slice(0, 3),
      revenue: found ? parseFloat(found.revenue_usd) : 0,
      transactions: found ? parseInt(found.transactions) : 0,
    };
  });

  const years = availableYears.length > 0
    ? availableYears
    : [currentYear];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Historical Archive</h1>
          <p className="page-subtitle">Year-by-year performance — isolated queries per year</p>
        </div>
      </div>

      {/* Year Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[currentYear, currentYear - 1, currentYear - 2].concat(years.filter((y: number) => y < currentYear - 2)).map((year: number) => (
          <Link
            key={year}
            href={`/pos-history?year=${year}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 700,
              textDecoration: 'none', transition: 'all 0.15s',
              background: selectedYear === year ? 'var(--primary)' : 'var(--bg-card)',
              border: `1px solid ${selectedYear === year ? 'var(--primary)' : 'var(--border)'}`,
              color: selectedYear === year ? '#fff' : 'var(--text-secondary)',
              boxShadow: selectedYear === year ? '0 0 12px var(--primary-glow, rgba(108,99,255,0.25))' : 'none',
            }}
          >
            <Calendar size={14} />
            {year} Archive
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Revenue {selectedYear}</span>
            <span className="stat-card-icon" style={{ background: 'rgba(108,99,255,0.15)', color: '#6c63ff' }}>
              <BarChart2 size={18} />
            </span>
          </div>
          <div className="stat-card-value">{formatUSD(totalRevenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Transactions</span>
          </div>
          <div className="stat-card-value">{totalTx.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Avg. per Month</span>
          </div>
          <div className="stat-card-value">{formatUSD(totalRevenue / 12)}</div>
        </div>
      </div>

      <YearlyArchiveCharts monthly={monthlyFilled} topProducts={topProducts} year={selectedYear} />
    </div>
  );
}
