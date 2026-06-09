import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkLogin() {
  console.log('Testing login...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@salonraed.local',
    password: '1234567',
  });

  if (error) {
    console.error('Login error:', error.message);
  } else {
    console.log('Login successful for:', data.user.email);
    console.log('Checking profile...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('auth_id', data.user.id)
      .single();
    
    if (profileError) {
      console.error('Profile fetch error:', profileError.message);
    } else {
      console.log('Profile found:', profile);
    }
  }
}

checkLogin();
