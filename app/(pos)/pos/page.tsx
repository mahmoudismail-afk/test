import { query } from '@/lib/db';
import { getLbpRate } from '@/lib/actions/settings';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import POSTerminal from '@/components/pos/POSTerminal';

export const metadata = { title: 'POS Register' };
export const dynamic = 'force-dynamic';

export default async function POSPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let products: any[] = [];
  let lbpRate = 89500;
  let cashierName = 'Cashier';
  let cashierRole = 'staff';

  try {
    const { rows } = await query(
      `SELECT id, barcode, name, category, sell_price, stock_qty, is_active
       FROM pos_products
       WHERE is_active = TRUE
       ORDER BY category, name`
    );
    products = rows.map((p: any) => ({
      id: p.id,
      barcode: p.barcode ?? '',
      name: p.name,
      category: p.category,
      price: parseFloat(p.sell_price),
      stock: p.stock_qty,
    }));
  } catch { products = []; }

  try { lbpRate = await getLbpRate(); } catch { lbpRate = 89500; }

  try {
    const { rows } = await query(
      'SELECT full_name, role FROM profiles WHERE auth_id = $1 LIMIT 1',
      [user.id]
    );
    cashierName = rows[0]?.full_name ?? 'Cashier';
    cashierRole = rows[0]?.role      ?? 'staff';
  } catch { /* keep defaults */ }

  return (
    <POSTerminal
      products={products}
      lbpRate={lbpRate}
      cashierName={cashierName}
      cashierRole={cashierRole}
    />
  );
}
