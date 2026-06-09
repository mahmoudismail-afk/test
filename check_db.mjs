import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function checkStatus() {
  console.log('Checking profiles table access as ANON...');
  const { data, error } = await supabaseAnon.from('profiles').select('id').limit(1);
  if (error) {
    console.error('Error accessing profiles:', error);
  } else {
    console.log('Profiles access OK:', data);
  }
}

checkStatus();
