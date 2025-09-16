// app/[locale]/admin/page.tsx

import { AdminLayout } from '@/components/admin/layout/admin-layout';
import { AdminDashboard } from '@/components/admin/dashboard/admin-dashboard';

export default function AdminPage() {
  return (
    <AdminLayout>
      <AdminDashboard />
    </AdminLayout>
  );
}
