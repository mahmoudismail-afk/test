import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('Testing with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Test failed:', error.message);
  } else {
    console.log('Test success! Found', data.users.length, 'users.');
  }
}

test();
