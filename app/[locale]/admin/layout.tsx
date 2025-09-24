import LayoutWrapper from "@/components/admin/layout/layout-wrapper";
import { RoleCheck } from "@/components/admin/layout/role-check";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutWrapper>
      <RoleCheck>
        <div className="p-4">
          {children}
        </div>
      </RoleCheck>
    </LayoutWrapper>
  );
}
