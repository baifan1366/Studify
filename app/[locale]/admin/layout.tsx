import LayoutWrapper from "@/components/admin/layout/layout-wrapper";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutWrapper>
      {children}
    </LayoutWrapper>
  );
}
