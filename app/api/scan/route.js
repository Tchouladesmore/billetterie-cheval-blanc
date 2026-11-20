import { NextResponse } from "next/server";
import { getDb, toTicket, allowed } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!allowed(req)) return NextResponse.json({ error: "code" }, { status: 401 });
  const { id } = await req.json();
  const code = String(id || "").trim().toUpperCase();
  const db = await getDb();
  const found = await db.execute({ sql: "SELECT * FROM tickets WHERE id = ?", args: [code] });
  if (!found.rows.length) return NextResponse.json({ status: "invalid" });
  // Mise à jour atomique : ne réussit que si le billet n'a jamais été scanné.
  const upd = await db.execute({
    sql: "UPDATE tickets SET used_at = ? WHERE id = ? AND used_at IS NULL",
    args: [Date.now(), code],
  });
  const row = await db.execute({ sql: "SELECT * FROM tickets WHERE id = ?", args: [code] });
  return NextResponse.json({ status: upd.rowsAffected === 1 ? "valid" : "used", ticket: toTicket(row.rows[0]) });
}
