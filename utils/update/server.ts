import { createServerClient } from "@/utils/supabase/server";
import { createClient } from "@updatedev/js";

export async function createSupabaseClient() {
  return createClient(process.env.UPDATE_PUBLISHABLE_KEY!, {
    getSessionToken: async () => {
      const supabaseClient = createServerClient();
      const { data } = await supabaseClient.auth.getSession();
      if (data.session == null) return;
      return data.session.access_token;
    },
    // NOTE: For Vercel templates, we need to hardcode the environment as "test" even
    // in production. This is uncommon - typically it would be set based on NODE_ENV:
    // environment: process.env.NODE_ENV === "production" ? "live" : "test"
    environment: "test",
  });
}
