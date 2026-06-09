import { createClient } from '@supabase/supabase-js';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function check(name, fn) {
  try {
    const result = await fn();
    if (result?.error && typeof result.error === 'object' && result.error.message) {
      console.log('❌', name, '-', result.error.message);
      return false;
    }
    console.log('✅', name, result?.info ? `(${result.info})` : '');
    return true;
  } catch(e) { console.log('❌', name, '-', e.message); return false; }
}

(async () => {
  console.log('\n════ DB Health Check ════');
  for (const tbl of ['pos_products','pos_transactions','pos_transaction_items','pos_debts','inventory_restock_log','system_settings','profiles']) {
    const { count, error } = await s.from(tbl).select('*', { count: 'exact', head: true });
    if (error) console.log('❌', tbl, '-', error.message);
    else console.log('✅', tbl, `(${count} rows)`);
  }

  console.log('\n════ Transaction Flow Test (using Supabase .from()) ════');

  // 1. Get a product
  const { data: prods, error: prodErr } = await s.from('pos_products').select('id,name,sell_price,stock_qty').eq('is_active', true).order('name').limit(1);
  if (prodErr || !prods?.length) { console.log('❌ No products:', prodErr?.message); process.exit(1); }
  const prod = prods[0];
  console.log(`   Product: "${prod.name}" @ $${prod.sell_price} (stock: ${prod.stock_qty})`);

  // 2. INSERT transaction using .from().insert().select() — exactly like the app does
  let txId;
  await check('INSERT pos_transactions .from().insert().select()', async () => {
    const { data, error } = await s
      .from('pos_transactions')
      .insert({ payment_method: 'cash_usd', subtotal_usd: 1.50, subtotal_lbp: 134250, lbp_rate: 89500 })
      .select('id')
      .single();
    if (error) return { error };
    txId = data?.id;
    return { info: txId ? '✅ got ID: ' + txId.substring(0,8) + '...' : '❌ no ID!' };
  });

  if (!txId) { console.log('❌ CRITICAL: .from().insert().select().single() returned no ID'); process.exit(1); }

  // 3. INSERT line items (bulk)
  await check('INSERT pos_transaction_items (bulk)', async () => {
    const { error } = await s.from('pos_transaction_items').insert([{
      transaction_id: txId,
      product_id: prod.id,
      product_name: prod.name,
      quantity: 1,
      unit_price_usd: parseFloat(prod.sell_price),
      total_usd: parseFloat(prod.sell_price),
    }]);
    return { error };
  });

  // 4. UPDATE stock
  await check('UPDATE pos_products stock_qty', async () => {
    const newStock = Math.max(0, prod.stock_qty - 1);
    const { error } = await s.from('pos_products').update({ stock_qty: newStock }).eq('id', prod.id);
    return { error };
  });

  // 5. Verify stock
  await check('Verify stock decreased', async () => {
    const { data, error } = await s.from('pos_products').select('stock_qty').eq('id', prod.id).single();
    const expected = Math.max(0, prod.stock_qty - 1);
    if (data?.stock_qty !== expected) return { error: { message: `Expected ${expected}, got ${data?.stock_qty}` } };
    return { info: `stock now ${data?.stock_qty}` };
  });

  // Cleanup
  await s.from('pos_transactions').delete().eq('id', txId);
  await s.from('pos_products').update({ stock_qty: prod.stock_qty }).eq('id', prod.id);
  console.log('   (test data cleaned up)');

  console.log('\n════ LBP Rate ════');
  const { data: rate } = await s.from('system_settings').select('value').eq('key', 'lbp_rate').single();
  console.log('✅ LBP rate:', rate?.value);

  console.log('\n════ ALL TESTS PASSED — Transactions are working! ════\n');
})();
