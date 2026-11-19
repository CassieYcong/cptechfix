import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema";
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
});
// Managed Postgres providers (e.g. Neon) drop idle connections. Without an
// error listener pg-pool re-emits that as an unhandled 'error' event and the
// whole process crashes, so log it and let the pool open a fresh client.
pool.on("error", (err) => {
    console.error("[db] idle client error:", err.message);
});
export const db = drizzle(pool, { schema });
export { pool };
//# sourceMappingURL=index.js.map