import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data, error } = await supabase.rpc('pg_query', { sql: "SELECT prosrc FROM pg_proc WHERE proname = 'pg_execute'" });
  console.log(JSON.stringify(data));
})();
