import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw Error("Supabase client configuration is missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireAdmin(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(Error("Unauthorized"), { status: 401 });
  const db = client();
  const { data: authData, error } = await db.auth.getUser(token);
  if (error || !authData?.user) throw Object.assign(Error("Unauthorized"), { status: 401 });
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.role !== "admin") throw Object.assign(Error("Forbidden"), { status: 403 });
  return db;
}

export async function GET(req) {
  try {
    const db = await requireAdmin(req);
    const { data, error } = await db.rpc("admin_list_users");
    if (error) throw error;
    return Response.json({ users: data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e?.message || "Admin request failed" }, { status: e?.status || 500 });
  }
}

export async function POST(req) {
  try {
    const db = await requireAdmin(req);
    const body = await req.json();
    const userId = body?.user_id;
    const delta = Number(body?.credits);
    if (!userId || !Number.isInteger(delta) || delta === 0) {
      return Response.json({ error: "user_id and a non-zero integer credits value are required" }, { status: 400 });
    }
    const { data, error } = await db.rpc("admin_adjust_credits", { p_user_id: userId, p_delta: delta });
    if (error) throw error;
    return Response.json({ ok: true, article_credits: Number(data) });
  } catch (e) {
    return Response.json({ error: e?.message || "Admin request failed" }, { status: e?.status || 500 });
  }
}
