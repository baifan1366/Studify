import { createClient } from "@updatedev/js";
import { supabase } from '@/utils/supabase/client';

export function createUpdateClient() {
  const client = createClient(process.env.NEXT_PUBLIC_UPDATE_PUBLISHABLE_KEY!, {
    getSessionToken: async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session == null) return;
      return data.session.access_token;
    },
    // NOTE: For Vercel templates, we need to hardcode the environment as "test" even
    // in production. This is uncommon - typically it would be set based on NODE_ENV:
    // environment: process.env.NODE_ENV === "production" ? "live" : "test"
    environment: "test",
  });
  return client;
}
