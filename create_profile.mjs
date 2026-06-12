import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  // 1. Find the admin auth user
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) { console.error('List users error:', error.message); process.exit(1); }

  const admin = users.find(u => u.email === 'admin@possystem.local');
  if (!admin) { console.error('Admin user not found — run create_admin.mjs first'); process.exit(1); }
  console.log('Found auth user:', admin.id);

  // 2. Upsert profile row using Supabase .from() client (works for INSERT)
  const { data, error: upsertErr } = await supabase
    .from('profiles')
    .upsert({
      auth_id:   admin.id,
      role:      'admin',
      full_name: 'System Admin',
      email:     'admin@possystem.local',
    }, { onConflict: 'auth_id' })
    .select('id, role, full_name');

  if (upsertErr) { console.error('Upsert error:', upsertErr.message); process.exit(1); }

  console.log('✅ Profile row created/updated successfully:', data);
  console.log('\nYou can now log in with:');
  console.log('  Username: admin');
  console.log('  Password: 1234567');
})();
