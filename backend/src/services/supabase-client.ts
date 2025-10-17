import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { config } from "../config";

let cachedClient: SupabaseClient | null = null;

function ensureClient(): SupabaseClient {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error("Supabase 未配置，请先在环境变量中设置 SUPABASE_PROJECT_URL 和 SUPABASE_SERVICE_ROLE_KEY。");
  }

  if (!cachedClient) {
    cachedClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return cachedClient;
}

export function getSupabaseAdmin(): SupabaseClient {
  return ensureClient();
}

export async function getUserFromAccessToken(token: string): Promise<User> {
  const client = ensureClient();
  const { data, error } = await client.auth.getUser(token);

  if (error || !data?.user) {
    throw new Error(error?.message ?? "无法验证用户身份");
  }

  return data.user;
}
