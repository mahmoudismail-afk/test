import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { error } = await s.from('system_settings').upsert({ key: 'staff_permissions', value: JSON.stringify(['pos']) }, { onConflict: 'key' });
if (error) console.log('ERROR:', error.message);
else console.log('Staff permissions set to: ["pos"] (Register only)');
