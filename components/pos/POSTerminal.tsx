'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingCart, Search, BarChart2, LogOut,
  Package, Coffee, Zap, Apple, MoreHorizontal, DollarSign,
  RefreshCw, LayoutDashboard, CreditCard, Sun, Moon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';
import { formatUSD, formatLBP, usdToLbp } from '@/lib/currency';
import CartPanel from './CartPanel';
import CheckoutModal from './CheckoutModal';
import PettyCashModal from './PettyCashModal';
import QuickDebtModal from './QuickDebtModal';
import '../../app/(pos)/pos/pos.css';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

const CATEGORY_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  all:          { icon: <LayoutDashboard size={14} />, label: 'All' },
  drinks:       { icon: <Coffee size={14} />,          label: 'Drinks' },
  snacks:       { icon: <Apple size={14} />,           label: 'Snacks' },
  supplements:  { icon: <Zap size={14} />,             label: 'Supplements' },
  other:        { icon: <Package size={14} />,         label: 'Other' },
};

const PRODUCT_EMOJIS: Record<string, string> = {
  drinks: '🥤', snacks: '🍿', supplements: '💊', other: '📦',
};

const BARCODE_TIMEOUT = 80; // ms between keystrokes to be considered a scanner

interface Props {
  products: Product[];
  lbpRate: number;
  cashierName: string;
  cashierRole: string;
}

export default function POSTerminal({ products, lbpRate, cashierName, cashierRole }: Props) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPettyCash, setShowPettyCash] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: string }[]>([]);
  const [scanFlashId, setScanFlashId] = useState<string | null>(null);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Barcode scanner buffer
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Exit / Logout ─────────────────────────────────────────
  const handleExit = useCallback(async () => {
    if (cashierRole === 'staff') {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } else {
      router.push('/dashboard');
    }
  }, [cashierRole, router]);

  // ── Toast helper ──────────────────────────────────────────
  const toast = useCallback((msg: string, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  // ── Add to cart ───────────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) { toast('Out of stock', 'error'); return; }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { toast('Max stock reached', 'warning'); return prev; }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, [toast]);

  // ── Global barcode scanner keydown listener ───────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in a text input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        const code = barcodeBuffer.current.trim();
        barcodeBuffer.current = '';
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        if (code.length >= 4) {
          const match = products.find((p) => p.barcode === code);
          if (match) {
            addToCart(match);
            setScanFlashId(match.id);
            setTimeout(() => setScanFlashId(null), 600);
            toast(`Scanned: ${match.name}`, 'info');
          } else {
            toast(`Barcode not found: ${code}`, 'error');
          }
        }
        return;
      }

      if (/^[0-9a-zA-Z\-]$/.test(e.key)) {
        barcodeBuffer.current += e.key;
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, BARCODE_TIMEOUT);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, addToCart, toast]);

  // ── Derived values ────────────────────────────────────────
  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.barcode.includes(search);
    return matchCat && matchSearch;
  });

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const cartItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  // ── Cart operations ───────────────────────────────────────
  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemoveItem = (productId: string, productName: string, qty: number, price: number) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
    // Fire-and-forget audit log (non-blocking)
    fetch('/api/pos/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'item_deleted', product_id: productId, product_name: productName, quantity: qty, unit_price: price }),
    }).catch(() => {});
  };

  const handleVoidCart = () => {
    if (cart.length === 0) return;
    // Log void event
    fetch('/api/pos/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cart_voided', quantity: cartItems }),
    }).catch(() => {});
    setCart([]);
    toast('Cart cleared', 'warning');
  };

  const handleCheckoutComplete = () => {
    setCart([]);
    setShowCheckout(false);
    toast('✓ Sale completed!', 'success');
  };

  return (
    <div className="pos-shell">

      {/* ── Top Bar ── */}
      <header className="pos-topbar">
        <div className="pos-topbar-brand">
          <BarChart2 size={20} />
          <span>POS System</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 400 }}>Register</span>
        </div>

        <div className="pos-topbar-center">
          <div className="pos-search-wrap">
            <Search size={15} />
            <input
              id="pos-search"
              className="pos-search"
              placeholder="Search or type barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="pos-topbar-right">

          {mounted && (
            <button
              className="pos-icon-btn"
              title="Toggle Theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          )}

          <div className="pos-rate-badge">
            <DollarSign size={12} />
            <span>Rate:</span>
            <strong>{lbpRate.toLocaleString()}</strong>
          </div>

          <button
            className="pos-icon-btn"
            title="Collect Debt Payment"
            onClick={() => setShowDebtModal(true)}
            style={{ color: '#f87171' }}
            id="collect-debt-btn"
          >
            <CreditCard size={15} />
          </button>

          <button
            className="pos-icon-btn"
            title="Petty Cash / Payout"
            onClick={() => setShowPettyCash(true)}
          >
            <RefreshCw size={15} />
          </button>

          <button
            className="pos-icon-btn"
            title={cashierRole === 'staff' ? 'End Session & Log Out' : 'Back to Dashboard'}
            onClick={handleExit}
            id="pos-exit-btn"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── Main Area ── */}
      <div className="pos-main">

        {/* ── Product Grid ── */}
        <section className="pos-products-pane">
          {/* Category Filter */}
          <div className="pos-categories">
            {categories.map((cat) => {
              const meta = CATEGORY_ICONS[cat] ?? { icon: <MoreHorizontal size={14} />, label: cat };
              return (
                <button
                  key={cat}
                  className={`pos-cat-btn${activeCategory === cat ? ' active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {meta.icon}
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* Products */}
          <div className="pos-product-grid">
            {filteredProducts.length === 0 ? (
              <div className="pos-empty-state" style={{ gridColumn: '1/-1' }}>
                <Package size={40} />
                <span>No products found</span>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const stockStatus =
                  product.stock === 0 ? 'empty' :
                  product.stock <= 5  ? 'low' : 'ok';
                return (
                  <button
                    key={product.id}
                    id={`product-${product.id}`}
                    className={`pos-product-card${product.stock === 0 ? ' out-of-stock' : ''}${scanFlashId === product.id ? ' pos-scan-flash' : ''}`}
                    onClick={() => addToCart(product)}
                  >
                    <span className="pos-product-stock" style={{}} data-status={stockStatus}>
                      {/* styled via CSS data-status */}
                      <span className={`pos-product-stock ${stockStatus}`}>
                        {product.stock}
                      </span>
                    </span>
                    <span className="pos-product-icon">
                      {PRODUCT_EMOJIS[product.category] ?? '📦'}
                    </span>
                    <span className="pos-product-name">{product.name}</span>
                    <span className="pos-product-price">{formatUSD(product.price)}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {formatLBP(usdToLbp(product.price, lbpRate))}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* ── Cart Panel ── */}
        <CartPanel
          cart={cart}
          lbpRate={lbpRate}
          cartTotal={cartTotal}
          cartItems={cartItems}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onVoidCart={handleVoidCart}
          onCheckout={() => setShowCheckout(true)}
        />
      </div>

      {/* ── Modals ── */}
      {showCheckout && (
        <CheckoutModal
          cart={cart}
          cartTotal={cartTotal}
          lbpRate={lbpRate}
          onClose={() => setShowCheckout(false)}
          onComplete={handleCheckoutComplete}
          toast={toast}
        />
      )}

      {showPettyCash && (
        <PettyCashModal
          lbpRate={lbpRate}
          onClose={() => setShowPettyCash(false)}
          toast={toast}
        />
      )}

      {showDebtModal && (
        <QuickDebtModal
          lbpRate={lbpRate}
          onClose={() => setShowDebtModal(false)}
          toast={toast}
        />
      )}

      {/* ── Toast Notifications ── */}
      <div className="pos-toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`pos-toast ${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
