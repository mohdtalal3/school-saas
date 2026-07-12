import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role client — bypasses RLS. SERVER ONLY.
let _serviceClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseService() {
  if (_serviceClient) return _serviceClient;

  _serviceClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return _serviceClient;
}