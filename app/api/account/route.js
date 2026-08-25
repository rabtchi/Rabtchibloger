import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function server(token) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) throw Error("Supabase client configuration is missing");

  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req) {
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = server(token);
    const { data: authData, error: authError } = await db.auth.getUser(token);
    if (authError || !authData?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = authData.user;
    const [{ data: profile, error: profileError }, { data: wallet, error: walletError }, { count, error: articleError }] = await Promise.all([
      db.from("profiles").select("full_name,role").eq("id", user.id).maybeSingle(),
      db.from("wallets").select("article_credits").eq("user_id", user.id).maybeSingle(),
      db.from("articles").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    if (profileError) throw profileError;
    if (walletError) throw walletError;
    if (articleError) throw articleError;

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || "",
        role: profile?.role === "admin" ? "admin" : "user",
        article_credits: Number(wallet?.article_credits || 0),
        article_count: count || 0,
      },
    });
  } catch (error) {
    return Response.json({ error: error?.message || "Account request failed" }, { status: 500 });
  }
}
