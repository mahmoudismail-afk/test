'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// ── Product CRUD ──────────────────────────────────────────────
export async function getProducts() {
  const { rows } = await query(
    `SELECT id, barcode, name, category, cost_price, sell_price, stock_qty,
            low_stock_threshold, is_active, created_at
     FROM pos_products ORDER BY category, name`
  );
  return rows;
}

export async function getProductByBarcode(barcode: string) {
  const { rows } = await query(
    'SELECT * FROM pos_products WHERE barcode = $1 AND is_active = TRUE LIMIT 1',
    [barcode]
  );
  return rows[0] ?? null;
}

import { getAdmin } from '@/lib/db';

export async function createProduct(payload: {
  barcode?: string;
  name: string;
  category: string;
  cost_price: number;
  sell_price: number;
  stock_qty: number;
  low_stock_threshold: number;
}) {
  try {
    const { data, error } = await getAdmin()
      .from('pos_products')
      .insert({
        barcode: payload.barcode || null,
        name: payload.name,
        category: payload.category,
        cost_price: payload.cost_price,
        sell_price: payload.sell_price,
        stock_qty: payload.stock_qty,
        low_stock_threshold: payload.low_stock_threshold,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath('/inventory');
    revalidatePath('/pos');
    return { data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateProduct(id: string, payload: {
  barcode?: string;
  name: string;
  category: string;
  cost_price: number;
  sell_price: number;
  stock_qty: number;
  low_stock_threshold: number;
  is_active: boolean;
}) {
  try {
    const { data, error } = await getAdmin()
      .from('pos_products')
      .update({
        barcode: payload.barcode || null,
        name: payload.name,
        category: payload.category,
        cost_price: payload.cost_price,
        sell_price: payload.sell_price,
        stock_qty: payload.stock_qty,
        low_stock_threshold: payload.low_stock_threshold,
        is_active: payload.is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath('/inventory');
    revalidatePath('/pos');
    return { data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteProduct(id: string) {
  try {
    // Soft delete — keep for historical sales data
    const { error } = await getAdmin()
      .from('pos_products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/inventory');
    revalidatePath('/pos');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ── One-Click Restock ──────────────────────────────────────────
export async function restockProduct(payload: {
  product_id: string;
  quantity: number;
  cost_per_unit: number;
  expiry_date?: string;
  notes?: string;
  restocked_by?: string;
}) {
  try {
    const admin = getAdmin();

    // 1. Get current stock
    const { data: prod, error: err1 } = await admin
      .from('pos_products')
      .select('stock_qty')
      .eq('id', payload.product_id)
      .single();
    if (err1) throw new Error(err1.message);

    const newStock = (prod?.stock_qty ?? 0) + payload.quantity;

    // 2. Update stock
    const { error: err2 } = await admin
      .from('pos_products')
      .update({ stock_qty: newStock })
      .eq('id', payload.product_id);
    if (err2) throw new Error(err2.message);

    // 3. Log restock event with optional expiry
    const { error: err3 } = await admin
      .from('inventory_restock_log')
      .insert({
        product_id: payload.product_id,
        quantity: payload.quantity,
        cost_per_unit: payload.cost_per_unit,
        expiry_date: payload.expiry_date || null,
        notes: payload.notes || null,
        restocked_by: payload.restocked_by || null,
      });
    if (err3) throw new Error(err3.message);

    revalidatePath('/inventory');
    revalidatePath('/pos');
    return { success: true, new_stock: newStock };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ── Expiring Soon (within 30 days) ────────────────────────────
export async function getExpiringSoon() {
  try {
    const { rows } = await query(
      `SELECT rl.id, p.name, rl.quantity, rl.expiry_date, rl.created_at
       FROM inventory_restock_log rl
       JOIN pos_products p ON p.id = rl.product_id
       WHERE rl.expiry_date IS NOT NULL
         AND rl.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
         AND rl.expiry_date >= CURRENT_DATE
       ORDER BY rl.expiry_date ASC`
    );
    return rows;
  } catch {
    return [];
  }
}

