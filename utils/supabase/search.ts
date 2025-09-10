import { createServerClient } from "./server";

export async function searchPostsServer(query: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("search_posts", { q: query });
  if (error) throw error;
  return data;
}
