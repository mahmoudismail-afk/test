'use client';

import React from 'react';
import { ShoppingCart, Trash2, ShoppingBag, Minus, Plus } from 'lucide-react';
import { formatUSD, formatLBP, usdToLbp } from '@/lib/currency';
import type { CartItem } from './POSTerminal';

interface Props {
  cart: CartItem[];
  lbpRate: number;
  cartTotal: number;
  cartItems: number;
  onUpdateQty: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string, name: string, qty: number, price: number) => void;
  onVoidCart: () => void;
  onCheckout: () => void;
}

export default function CartPanel({
  cart, lbpRate, cartTotal, cartItems,
  onUpdateQty, onRemoveItem, onVoidCart, onCheckout,
}: Props) {
  const totalLbp = usdToLbp(cartTotal, lbpRate);

  return (
    <aside className="pos-cart-pane">
      {/* Header */}
      <div className="pos-cart-header">
        <div className="pos-cart-title">
          <ShoppingCart size={16} />
          Cart
          {cartItems > 0 && <span className="pos-cart-count">{cartItems}</span>}
        </div>
        {cart.length > 0 && (
          <button
            className="pos-btn pos-btn-danger"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={onVoidCart}
            title="Void entire cart"
          >
            <Trash2 size={13} />
            Void
          </button>
        )}
      </div>

      {/* Items */}
      <div className="pos-cart-items">
        {cart.length === 0 ? (
          <div className="pos-cart-empty">
            <ShoppingBag size={48} />
            <span>Cart is empty</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Tap a product or scan a barcode
            </span>
          </div>
        ) : (
          cart.map(({ product, quantity }) => (
            <div key={product.id} className="pos-cart-item">
              <div className="pos-cart-item-info">
                <div className="pos-cart-item-name">{product.name}</div>
                <div className="pos-cart-item-price">
                  {formatUSD(product.price)} ea ·{' '}
                  <span style={{ color: 'var(--amber)' }}>
                    {formatLBP(usdToLbp(product.price * quantity, lbpRate))}
                  </span>
                </div>
              </div>

              <div className="pos-qty-ctrl">
                <button
                  className="pos-qty-btn"
                  onClick={() => onUpdateQty(product.id, -1)}
                  aria-label="Decrease quantity"
                >
                  <Minus size={12} />
                </button>
                <span className="pos-qty-num">{quantity}</span>
                <button
                  className="pos-qty-btn"
                  onClick={() => onUpdateQty(product.id, 1)}
                  disabled={quantity >= product.stock}
                  aria-label="Increase quantity"
                >
                  <Plus size={12} />
                </button>
              </div>

              <button
                className="pos-item-delete"
                onClick={() => onRemoveItem(product.id, product.name, quantity, product.price)}
                aria-label={`Remove ${product.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer / Totals */}
      <div className="pos-cart-footer">
        <div className="pos-total-row">
          <span className="pos-total-label">Total</span>
          <div style={{ textAlign: 'right' }}>
            <div className="pos-total-usd">{formatUSD(cartTotal)}</div>
            <div className="pos-total-lbp">{formatLBP(totalLbp)}</div>
          </div>
        </div>

        <div className="pos-divider" />

        <div className="pos-action-row">
          <button
            id="checkout-btn"
            className="pos-btn pos-btn-primary"
            disabled={cart.length === 0}
            onClick={onCheckout}
          >
            <ShoppingCart size={16} />
            Charge {cart.length > 0 ? formatUSD(cartTotal) : ''}
          </button>
        </div>

        {/* Line-item breakdown */}
        {cart.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 2 }}>
            {cart.map(({ product, quantity }) => (
              <div
                key={product.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  padding: '2px 0',
                }}
              >
                <span>
                  {product.name} ×{quantity}
                </span>
                <span>{formatUSD(product.price * quantity)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
