/**
 * Supabase Server Client
 * Centralized utility for creating Supabase server clients in API routes
 */

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Creates a Supabase server client for use in API routes
 * Automatically handles cookie management and authentication
 * @returns Supabase client instance configured for server-side use
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${cookieStore.get("sb-access-token")?.value || ""}`,
        },
      },
    }
  );
}

// Also export as createSupabaseClient for backward compatibility
export const createSupabaseClient = createServerClient;
