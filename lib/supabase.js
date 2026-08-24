import { createClient } from "@supabase/supabase-js";

let client;

export function getSupabase() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing");
  }

  client = createClient(url, key);

  return client;
}
