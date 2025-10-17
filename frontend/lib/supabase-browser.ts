import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
  }

  return cachedClient;
}

export type { Session, SupabaseClient };
