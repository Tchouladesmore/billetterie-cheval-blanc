import { createClient } from "@libsql/client";

let client;
let ready;

function getClient() {
  // Créé seulement au premier usage (pas pendant le build de Vercel).
  client ||= createClient({
    url: process.env.TURSO_DATABASE_URL || "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
  return client;
}

export function getDb() {
  if (!ready) {
    const c = getClient();
    ready = c
      .execute(
        `CREATE TABLE IF NOT EXISTS tickets (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL,
          event TEXT NOT NULL, seller TEXT, created_at INTEGER NOT NULL, used_at INTEGER)`
      )
      .then(() => c)
      .catch((e) => { ready = undefined; throw e; });
  }
  return ready;
}

export function toTicket(r) {
  return {
    id: r.id, name: r.name, price: Number(r.price), event: r.event, seller: r.seller,
    createdAt: Number(r.created_at), usedAt: r.used_at == null ? null : Number(r.used_at),
  };
}
