import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Pool } from "pg";

const globalForDb = globalThis as unknown as {
  pool: Pool | null;
};

let pool: Pool | null = globalForDb.pool;

export function getDbPool(): Pool {
  if (pool) return pool;

  let connectionString = process.env.DATABASE_URL;

  try {
    // Attempt to retrieve Cloudflare Edge environment context
    const cloudflareContext = getCloudflareContext() as any;
    if (cloudflareContext?.env?.HYPERDRIVE?.connectionString) {
      connectionString = cloudflareContext.env.HYPERDRIVE.connectionString;
      console.log("⚡ Connected via Cloudflare Hyperdrive pool");
    }
  } catch (e) {
    // Will error silently when running locally outside of the Cloudflare worker environment (e.g. standard next dev)
  }

  if (!connectionString) {
    throw new Error(
      "Database connection string not found. Please specify DATABASE_URL in your .env.local or bind HYPERDRIVE."
    );
  }

  if (!pool) {
    const isHyperdrive = !!connectionString.includes('hyperdrive');
    
    pool = new Pool({
      connectionString,
      // If we are on Hyperdrive, Cloudflare recommends maxUses: 1 to prevent dangling connections.
      // But for local Next.js development, we MUST omit it so the pool keeps connections alive,
      // otherwise it forces a slow 1-second TLS handshake on every single query!
      ...(isHyperdrive ? { maxUses: 1 } : { max: 10 }),
    });

    if (process.env.NODE_ENV !== 'production') {
      globalForDb.pool = pool;
    }
  }

  return pool;
}

/**
 * Execute a query against the direct PostgreSQL database using the Hyperdrive connection pool.
 */
export async function query(text: string, params?: any[]) {
  const dbPool = getDbPool();
  return dbPool.query(text, params);
}
