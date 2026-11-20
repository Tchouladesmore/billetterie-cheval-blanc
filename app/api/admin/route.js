import { NextResponse } from "next/server";
import { allowed, isAdmin } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!allowed(req)) return NextResponse.json({ error: "code" }, { status: 401 });
  return NextResponse.json({ ok: isAdmin(req) });
}
