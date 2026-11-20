import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

let ready;
export function getDb() {
  ready ||= client.execute(
    `CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL,
      event TEXT NOT NULL, seller TEXT, created_at INTEGER NOT NULL, used_at INTEGER)`
  );
  return ready.then(() => client);
}

export function toTicket(r) {
  return {
    id: r.id, name: r.name, price: Number(r.price), event: r.event, seller: r.seller,
    createdAt: Number(r.created_at), usedAt: r.used_at == null ? null : Number(r.used_at),
  };
}

export function allowed(req) {
  const code = process.env.ACCESS_CODE;
  return Boolean(code) && req.headers.get("x-code") === code;
}

export function isAdmin(req) {
  const a = process.env.ADMIN_CODE;
  return Boolean(a) && req.headers.get("x-admin") === a;
}
