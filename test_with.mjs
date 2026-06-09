import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const sql = "WITH _mut AS (UPDATE pos_products SET is_active = FALSE WHERE id = '12345678-1234-1234-1234-123456789012' RETURNING *) SELECT * FROM _mut";
  const { data, error } = await supabase.rpc('pg_query', { sql });
  console.log(JSON.stringify(data));
  console.log('Error:', error);
})();
