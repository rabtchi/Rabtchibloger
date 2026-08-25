import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return { url, key };
}

export async function GET() {
  try {
    const { url, key } = getSupabaseConfig();

    if (!url || !key) {
      return Response.json(
        { error: "Supabase client configuration is missing" },
        { status: 500 }
      );
    }

    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await db
      .from("article_plans")
      .select("id,name,credits,price_cents,currency,active")
      .eq("active", true)
      .order("price_cents", { ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(
      { plans: data || [] },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return Response.json(
      { error: error?.message || "Failed to load plans" },
      { status: 500 }
    );
  }
}
