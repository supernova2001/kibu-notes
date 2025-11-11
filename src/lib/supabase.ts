import { createClient } from "@supabase/supabase-js";

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[supabase.ts] Missing required environment variables:", {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
  });
}

// Client for client-side operations (uses anon key)
export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || ""
);

// Server-side client (uses service role key if available, falls back to anon key)
// Service role key bypasses RLS policies and should be used for server-side operations
export const supabaseServer = supabaseServiceKey
  ? createClient(
      supabaseUrl || "",
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : (() => {
      console.warn("[supabase.ts] SUPABASE_SERVICE_ROLE_KEY not set, using anon key for server operations. This may cause RLS issues.");
      return supabase;
    })();