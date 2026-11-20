import { NextResponse } from "next/server";
import { getDb, toTicket } from "../../../lib/db";
import { allowed, isAdmin } from "../../../lib/auth";
import { EVENTS, TIERS } from "../../../lib/config";

export const dynamic = "force-dynamic";

function newId() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const r = new Uint8Array(10);
  crypto.getRandomValues(r);
  return Array.from(r, (x) => a[x % a.length]).join("");
}

export async function GET(req) {
  if (!allowed(req)) return NextResponse.json({ error: "code" }, { status: 401 });
  const db = await getDb();
  const res = await db.execute("SELECT * FROM tickets ORDER BY created_at DESC");
  return NextResponse.json(res.rows.map(toTicket));
}

export async function POST(req) {
  if (!allowed(req)) return NextResponse.json({ error: "code" }, { status: 401 });
  const { name, price, event, seller } = await req.json();
  const n = String(name || "").trim().slice(0, 80);
  if (!n || !TIERS[price] || !EVENTS.includes(event)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const db = await getDb();
  const id = newId();
  const createdAt = Date.now();
  const s = String(seller || "").trim().slice(0, 40);
  await db.execute({
    sql: "INSERT INTO tickets (id, name, price, event, seller, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, n, Number(price), event, s, createdAt],
  });
  return NextResponse.json({ id, name: n, price: Number(price), event, seller: s, createdAt, usedAt: null });
}

export async function DELETE(req) {
  if (!allowed(req)) return NextResponse.json({ error: "code" }, { status: 401 });
  if (!isAdmin(req)) return NextResponse.json({ error: "admin" }, { status: 403 });
  const { id } = await req.json();
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM tickets WHERE id = ?", args: [String(id || "")] });
  return NextResponse.json({ ok: true });
}
