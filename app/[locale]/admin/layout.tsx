import LayoutWrapper from "@/components/admin/layout/layout-wrapper";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutWrapper>
      <div className="p-4">
        {children}
      </div>
    </LayoutWrapper>
  );
}
