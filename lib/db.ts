/**
 * lib/db.ts — Database adapter
 *
 * READ  (SELECT) → Supabase RPC pg_query()     — works in local dev + production
 * WRITE (INSERT/UPDATE/DELETE) → Supabase JS client .from()  — 100% reliable
 * PRODUCTION → Cloudflare Hyperdrive pg.Pool   — full raw SQL
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

export interface QueryResult {
  rows: Record<string, any>[];
  rowCount: number | null;
}

// ─── Supabase admin singleton ────────────────────────────────────────────────
let _admin: SupabaseClient | null = null;
export function getAdmin(): SupabaseClient {
  if (_admin) return _admin;
  _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return _admin;
}

// ─── Cloudflare Hyperdrive (production only) ─────────────────────────────────
const globalForDb = globalThis as unknown as { pool: Pool | null };
function getHyperdrive(): Pool | null {
  if (globalForDb.pool) return globalForDb.pool;
  try {
    // eslint-disable-next-line
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext() as any;
    if (ctx?.env?.HYPERDRIVE?.connectionString) {
      globalForDb.pool = new Pool({ connectionString: ctx.env.HYPERDRIVE.connectionString, max: 1, maxUses: 1 });
      return globalForDb.pool;
    }
  } catch { /* local dev */ }
  return null;
}

// ─── Param inlining for pg_query RPC ────────────────────────────────────────
function inlineParams(sql: string, params: any[]): string {
  return sql.replace(/\$(\d+)/g, (_, idx) => {
    const val = params[parseInt(idx, 10) - 1];
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'number') return isFinite(val) ? String(val) : 'NULL';
    return `'${String(val).replace(/'/g, "''")}'`;
  });
}

// ─── SELECT via pg_query RPC ─────────────────────────────────────────────────
async function selectViaRpc(sql: string, params: any[] = []): Promise<QueryResult> {
  let inlined = inlineParams(sql, params);

  // The pg_query RPC requires queries to return rows (RETURN QUERY EXECUTE).
  // For mutations without a RETURNING clause, we automatically append it so it doesn't crash.
  if (/^\s*(INSERT|UPDATE|DELETE)\b/i.test(inlined) && !/\bRETURNING\b/i.test(inlined)) {
    inlined = inlined.replace(/;+\s*$/, '') + ' RETURNING *';
  }

  const { data, error } = await getAdmin().rpc('pg_query', { sql: inlined });
  if (error) {
    console.error('[db] pg_query error:', error.message, '\nSQL:', inlined);
    throw new Error(error.message);
  }
  const rows: any[] = Array.isArray(data) ? data : [];
  return { rows, rowCount: rows.length };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * query() — use for SELECT statements only in local dev.
 * In Cloudflare Workers with Hyperdrive, also handles INSERT/UPDATE/DELETE.
 */
export async function query(sql: string, params?: any[]): Promise<QueryResult> {
  const hyper = getHyperdrive();
  if (hyper) return hyper.query(sql, params);   // production: full raw SQL
  return selectViaRpc(sql, params ?? []);         // local dev: SELECT only via RPC
}

export function getDbPool(): Pool {
  const h = getHyperdrive();
  if (h) return h;
  throw new Error('getDbPool() only available in Cloudflare Workers. Use query() or getAdmin() in local dev.');
}
