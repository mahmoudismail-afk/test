import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  // Update staff permissions to POS routes
  const { error: permErr } = await supabase
    .from('system_settings')
    .upsert({ key: 'staff_permissions', value: '["dashboard","pos","inventory","debts","z-report"]' }, { onConflict: 'key' });

  if (permErr) console.error('staff_permissions error:', permErr.message);
  else console.log('✅ staff_permissions updated');

  // Ensure lbp_rate exists
  const { error: rateErr } = await supabase
    .from('system_settings')
    .upsert({ key: 'lbp_rate', value: '89500' }, { onConflict: 'key' });

  if (rateErr) console.error('lbp_rate error:', rateErr.message);
  else console.log('✅ lbp_rate set to 89500');
})();
