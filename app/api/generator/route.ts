import { createUpdateClient } from "@/utils/update/server";

export async function POST() {
  const client = await createUpdateClient();
  const { data, error } = await client.entitlements.check("premium");

  if (error || !data.hasAccess) {
    return new Response("Error fetching subscriptions", { status: 500 });
  }

  if (!data.hasAccess) {
    return new Response("Subscription not active", { status: 403 });
  }

  const response = await fetch("https://api.thecatapi.com/v1/images/search");
  const json = await response.json();
  return new Response(JSON.stringify(json));
}
