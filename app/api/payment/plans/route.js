import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return Response.json({ error: "Supabase client configuration is missing" }, { status: 500 });

    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.rpc("get_active_article_plans");
    if (error) throw error;

    return Response.json({ plans: (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      article_credits: Number(p.credits),
      price_usd: Number(p.price_cents) / 100,
      currency: p.currency || "USD",
    })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e?.message || "تعذر تحميل الباقات" }, { status: 500 });
  }
}
