import { Metadata } from "next";
import { createUpdateClient } from "@/utils/update/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PaidContentCard from "@/components/paid-content-card";

export const metadata: Metadata = {
  title: "Paid Content - Studify",
  description:
    "manage and access premium paid content and subscriptions",
  keywords: ["paid content", "subscriptions", "premium", "education"],
  openGraph: {
    title: "Paid Content - Studify",
    description:
      "Manage and access premium paid content and subscriptions",
    type: "website",
  },
};

export default async function PaidContent() {
  const client = await createUpdateClient();
  const { data, error } = await client.entitlements.check("premium");

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-red-600">Error</h2>
          <p className="mt-2 text-muted-foreground">
            There was an error fetching your subscriptions.
          </p>
        </Card>
      </div>
    );
  }

  if (!data.hasAccess) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="p-6">
          <h2 className="text-xl font-semibold">No Access</h2>
          <p className="mt-2 text-muted-foreground">
            You don&apos;t have access to any paid content.
          </p>
          <Button className="mt-4" variant="outline">
            Upgrade Now
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-medium">Cat Photo Generator</h1>
        <p className="text-muted-foreground mt-2">Generate cat photos</p>
      </div>
      <PaidContentCard className="mt-4" />
    </div>
  );
}
