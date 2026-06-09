-- ================================================================
-- Run this in Supabase SQL Editor to fix write operations
-- Adds pg_execute() for INSERT/UPDATE/DELETE (returns rowCount)
-- and fixes pg_query() to return rows correctly
-- ================================================================

-- READ function: wraps in SELECT to return rows as JSON array
CREATE OR REPLACE FUNCTION public.pg_query(sql TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', sql)
  INTO result;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

-- WRITE function: executes INSERT/UPDATE/DELETE and returns affected rows as JSON
CREATE OR REPLACE FUNCTION public.pg_execute(sql TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  row_count INT;
BEGIN
  -- Try to execute with RETURNING clause support
  BEGIN
    EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', sql)
    INTO result;
    RETURN jsonb_build_object(
      'rows', COALESCE(result, '[]'::JSONB),
      'rowCount', jsonb_array_length(COALESCE(result, '[]'::JSONB))
    );
  EXCEPTION WHEN syntax_error OR others THEN
    -- Fallback: plain execute for statements without RETURNING
    EXECUTE sql;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RETURN jsonb_build_object('rows', '[]'::JSONB, 'rowCount', row_count);
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pg_query(TEXT)   TO service_role;
GRANT EXECUTE ON FUNCTION public.pg_query(TEXT)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.pg_execute(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.pg_execute(TEXT) TO authenticated;

-- Test both:
SELECT public.pg_query('SELECT 1 AS num, NOW() AS ts');
SELECT public.pg_execute('SELECT 1');  -- safe test
