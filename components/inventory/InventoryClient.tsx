'use client';

import React, { useState } from 'react';
import { Plus, Search, Edit2, RotateCcw, Package, X, Check } from 'lucide-react';
import { formatUSD, formatLBP, usdToLbp } from '@/lib/currency';
import { createProduct, updateProduct, deleteProduct, restockProduct } from '@/lib/actions/products';

interface Product {
  id: string;
  barcode: string | null;
  name: string;
  category: string;
  cost_price: number;
  sell_price: number;
  stock_qty: number;
  low_stock_threshold: number;
  is_active: boolean;
}

interface Props {
  products: Product[];
  lbpRate: number;
}

const CATEGORIES = ['drinks', 'snacks', 'supplements', 'other'];
const emptyProduct = { barcode: '', name: '', category: 'drinks', cost_price: 0, sell_price: 0, stock_qty: 0, low_stock_threshold: 5 };

export default function InventoryClient({ products: initialProducts, lbpRate }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockExpiry, setRestockExpiry] = useState('');
  const [formData, setFormData] = useState({ ...emptyProduct });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToastMsg = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode ?? '').includes(search)
  );

  const openEdit = (product: Product) => {
    setEditProduct(product);
    setFormData({ barcode: product.barcode ?? '', name: product.name, category: product.category, cost_price: product.cost_price, sell_price: product.sell_price, stock_qty: product.stock_qty, low_stock_threshold: product.low_stock_threshold });
    setShowForm(true);
  };

  const openNew = () => { setEditProduct(null); setFormData({ ...emptyProduct }); setShowForm(true); };

  const handleSave = async () => {
    if (!formData.name.trim()) { showToastMsg('Product name required', 'error'); return; }
    setSaving(true);
    try {
      if (editProduct) {
        const result = await updateProduct(editProduct.id, { ...formData, is_active: true, barcode: formData.barcode || undefined });
        if (result.error) { showToastMsg(result.error, 'error'); return; }
        setProducts((prev) => prev.map((p) => p.id === editProduct.id ? { ...p, ...formData } : p));
      } else {
        const result = await createProduct({ ...formData, barcode: formData.barcode || undefined });
        if (result.error) { showToastMsg(result.error, 'error'); return; }
        if (result.data) setProducts((prev) => [...prev, result.data]);
      }
      setShowForm(false);
      showToastMsg(`Product ${editProduct ? 'updated' : 'created'}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this product?')) return;
    await deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToastMsg('Product archived');
  };

  const handleRestock = async (productId: string) => {
    const qty = parseInt(restockQty);
    if (!qty || qty <= 0) { showToastMsg('Enter a valid quantity', 'error'); return; }
    setSaving(true);
    try {
      const result = await restockProduct({ product_id: productId, quantity: qty, cost_per_unit: parseFloat(restockCost) || 0, expiry_date: restockExpiry || undefined });
      if (result.error) { showToastMsg(result.error, 'error'); return; }
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, stock_qty: (result as any).new_stock ?? p.stock_qty + qty } : p));
      setRestockingId(null); setRestockQty(''); setRestockCost(''); setRestockExpiry('');
      showToastMsg(`✓ Restocked +${qty} units`);
    } finally { setSaving(false); }
  };

  const stockBadge = (p: Product) => {
    if (p.stock_qty === 0) return { text: 'Out', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
    if (p.stock_qty <= p.low_stock_threshold) return { text: `Low (${p.stock_qty})`, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
    return { text: p.stock_qty.toString(), color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} placeholder="Search by name or barcode…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: 'var(--primary, #6c63ff)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Plus size={15} /> Add Product
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)' }}>
                {['Barcode', 'Product', 'Category', 'Cost', 'Sell Price', 'Stock', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}><Package size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} /><div>No products found</div></td></tr>
              ) : filtered.map((product) => {
                const badge = stockBadge(product);
                const isRestocking = restockingId === product.id;
                return (
                  <React.Fragment key={product.id}>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>{product.barcode ?? '—'}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{product.name}</td>
                      <td style={{ padding: '12px 16px' }}><span style={{ padding: '3px 10px', borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{product.category}</span></td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{formatUSD(product.cost_price)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700 }}>{formatUSD(product.sell_price)}</div>
                        <div style={{ fontSize: 11, color: 'var(--amber)' }}>{formatLBP(usdToLbp(product.sell_price, lbpRate))}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}><span style={{ padding: '4px 10px', borderRadius: 20, background: badge.bg, color: badge.color, fontWeight: 700, fontSize: 12 }}>{badge.text}</span></td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button title="Restock" onClick={() => { setRestockingId(isRestocking ? null : product.id); setRestockQty(''); setRestockCost(''); setRestockExpiry(''); }} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, color: '#10b981', cursor: 'pointer' }}><RotateCcw size={13} /></button>
                          <button title="Edit" onClick={() => openEdit(product)} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 6, color: '#6c63ff', cursor: 'pointer' }}><Edit2 size={13} /></button>
                          <button title="Archive" onClick={() => handleDelete(product.id)} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}><X size={13} /></button>
                        </div>
                      </td>
                    </tr>
                    {isRestocking && (
                      <tr style={{ background: 'rgba(16,185,129,0.04)', borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={7} style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>Restock: {product.name}</span>
                            <input type="number" placeholder="Qty *" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} style={{ width: 80, padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                            <input type="number" placeholder="Cost/unit ($)" value={restockCost} onChange={(e) => setRestockCost(e.target.value)} style={{ width: 120, padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                            <input type="month" value={restockExpiry} onChange={(e) => setRestockExpiry(e.target.value)} style={{ padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} title="Expiry month (optional)" />
                            <button onClick={() => handleRestock(product.id)} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#10b981', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                              <Check size={13} /> {saving ? 'Saving…' : 'Confirm'}
                            </button>
                            <button onClick={() => setRestockingId(null)} style={{ padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg-panel, #12151f)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 8px 48px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{editProduct ? 'Edit Product' : 'New Product'}</h3>
              <button onClick={() => setShowForm(false)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[{ label: 'Product Name *', key: 'name', placeholder: 'e.g. Pepsi 330ml' }, { label: 'Barcode (EAN)', key: 'barcode', placeholder: 'e.g. 6291003511037' }].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>
                  <input type="text" placeholder={placeholder} value={(formData as any)[key]} onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Category</label>
                <select value={formData.category} onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[{ label: 'Cost Price ($)', key: 'cost_price' }, { label: 'Sell Price ($)', key: 'sell_price' }, { label: 'Initial Stock', key: 'stock_qty' }, { label: 'Low Stock Alert', key: 'low_stock_threshold' }].map(({ label, key }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>
                    <input type="number" value={(formData as any)[key]} onChange={(e) => setFormData((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', background: 'var(--primary, #6c63ff)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Check size={15} /> {saving ? 'Saving…' : (editProduct ? 'Save Changes' : 'Create Product')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 18px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderLeft: `4px solid ${toast.type === 'error' ? '#ef4444' : '#10b981'}`, borderRadius: 10, fontWeight: 600, fontSize: 13, zIndex: 9999, boxShadow: '0 4px 24px rgba(0,0,0,0.4)', color: 'var(--text-primary)' }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
