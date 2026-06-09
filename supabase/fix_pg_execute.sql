-- ================================================================
-- FIXED: pg_execute that correctly handles INSERT/UPDATE ... RETURNING
-- Run this in Supabase SQL Editor to replace the broken version
-- ================================================================

CREATE OR REPLACE FUNCTION public.pg_execute(sql TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result  JSONB;
  wrapped TEXT;
BEGIN
  -- Wrap DML in a CTE so RETURNING rows are captured as JSON
  -- Works for: INSERT...RETURNING, UPDATE...RETURNING, DELETE...RETURNING
  -- Also works for plain INSERT/UPDATE/DELETE without RETURNING (returns [])
  wrapped := format(
    'WITH _dml AS (%s) SELECT jsonb_agg(row_to_json(_dml)) FROM _dml',
    sql
  );

  EXECUTE wrapped INTO result;

  RETURN jsonb_build_object(
    'rows',     COALESCE(result, '[]'::JSONB),
    'rowCount', jsonb_array_length(COALESCE(result, '[]'::JSONB))
  );

EXCEPTION WHEN OTHERS THEN
  -- For DML without RETURNING, the CTE approach fails — fall back to plain execute
  BEGIN
    EXECUTE sql;
    RETURN jsonb_build_object('rows', '[]'::JSONB, 'rowCount', 0);
  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pg_execute(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.pg_execute(TEXT) TO authenticated;

-- ── Quick test ────────────────────────────────────────────────────────────────
-- Should return: {"rows": [{"id": <uuid>}], "rowCount": 1}
SELECT public.pg_execute(
  'INSERT INTO pos_sessions (status) VALUES (''open'') RETURNING id'
);
-- Clean up the test row
DELETE FROM pos_sessions WHERE status = 'open' AND cashier_id IS NULL;
