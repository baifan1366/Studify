import { Metadata } from "next";
import { createUpdateClient } from "@/utils/update/server";
import PricingContent from "@/components/pricing-content";

export const metadata: Metadata = {
  title: "Pricing - Studify",
  description: "Manage and access premium paid content and subscriptions",
  keywords: ["pricing", "subscriptions", "premium", "education"],
  openGraph: {
    title: "Pricing - Studify",
    description: "Manage and access premium paid content and subscriptions",
    type: "website",
  },
};

export default async function PricingPage() {
  const client = await createUpdateClient();
  const { data, error } = await client.billing.getProducts();
  const { data: subscriptionData } = await client.billing.getSubscriptions();

  if (error) {
    return <div>There was an error loading products. Please try again.</div>;
  }

  const currentProductId =
    subscriptionData.subscriptions == null ||
    subscriptionData.subscriptions.length === 0
      ? null
      : subscriptionData.subscriptions[0].product.id;

  return (
    <>
      <div>
        <h1 className="text-2xl font-medium">Pricing Plans</h1>
        <p className="text-muted-foreground mt-2">
          Choose the perfect plan for your needs
        </p>
      </div>

      <PricingContent
        products={data.products}
        currentProductId={currentProductId}
      />
    </>
  );
}
