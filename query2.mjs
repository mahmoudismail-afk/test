import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data } = await supabase.rpc('pg_query', { sql: "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('expenses', 'payments')" });
  console.log(JSON.stringify(data, null, 2));
})();
