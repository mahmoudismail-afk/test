import { getProducts, getExpiringSoon } from '@/lib/actions/products';
import { getLbpRate } from '@/lib/actions/settings';
import { formatUSD } from '@/lib/currency';
import { Package, AlertTriangle, Plus, BarChart2 } from 'lucide-react';
import InventoryClient from '@/components/inventory/InventoryClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Inventory' };
export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  let products: any[] = [];
  let expiring: any[] = [];
  let lbpRate = 89500;

  try { products = await getProducts();     } catch { products = []; }
  try { expiring = await getExpiringSoon(); } catch { expiring = []; }
  try { lbpRate  = await getLbpRate();      } catch { lbpRate  = 89500; }

  const totalProducts  = products.length;
  const lowStock       = products.filter((p: any) => p.stock_qty > 0 && p.stock_qty <= p.low_stock_threshold).length;
  const outOfStock     = products.filter((p: any) => p.stock_qty === 0).length;
  const totalSkuValue  = products.reduce((s: number, p: any) => s + parseFloat(p.sell_price) * p.stock_qty, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage products, stock levels, and restock with expiry tracking</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Products</span>
            <span className="stat-card-icon" style={{ background: 'rgba(108,99,255,0.15)', color: '#6c63ff' }}>
              <Package size={18} />
            </span>
          </div>
          <div className="stat-card-value">{totalProducts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Low Stock</span>
            <span className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <AlertTriangle size={18} />
            </span>
          </div>
          <div className="stat-card-value" style={{ color: lowStock > 0 ? '#f59e0b' : 'inherit' }}>{lowStock}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Out of Stock</span>
            <span className="stat-card-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              <Package size={18} />
            </span>
          </div>
          <div className="stat-card-value" style={{ color: outOfStock > 0 ? '#ef4444' : 'inherit' }}>{outOfStock}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Stock Value</span>
            <span className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
              <BarChart2 size={18} />
            </span>
          </div>
          <div className="stat-card-value">{formatUSD(totalSkuValue)}</div>
          <div className="stat-card-sub">At sell price</div>
        </div>
      </div>

      {/* Expiry Alert */}
      {expiring.length > 0 && (
        <div style={{ marginBottom: '1.25rem', padding: '14px 18px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#f59e0b' }}>
          <AlertTriangle size={16} />
          <strong>{expiring.length} batch{expiring.length !== 1 ? 'es' : ''}</strong> expiring within 30 days — check restock logs
        </div>
      )}

      <InventoryClient
        products={products.map((p: any) => ({
          ...p,
          cost_price: parseFloat(p.cost_price),
          sell_price: parseFloat(p.sell_price),
          stock_qty: parseInt(p.stock_qty),
        }))}
        lbpRate={lbpRate}
      />
    </div>
  );
}
