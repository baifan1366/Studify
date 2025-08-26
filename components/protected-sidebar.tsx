import InPageSidebar from "@/components/in-page-sidebar";
import { createUpdateClient } from "@/utils/update/server";

export default async function ProtectedSidebar() {
  const client = await createUpdateClient();
  const { data } = await client.entitlements.check("premium");

  return (
    <InPageSidebar
      basePath="/protected"
      items={[
        {
          label: "Account",
          href: "/",
        },
        {
          label: "Pricing",
          href: "/pricing",
        },
        {
          label: "Subscription",
          href: "/subscription",
        },
        {
          label: "Paid Content",
          href: "/paid-content",
          disabled: data != null && !data.hasAccess,
        },
      ]}
    />
  );
}
