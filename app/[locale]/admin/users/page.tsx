// app/[locale]/admin/users/page.tsx

import { AdminLayout } from '@/components/admin/layout/admin-layout';
import { AdminUsersList } from '@/components/admin/users/admin-users-list';

export default function AdminUsersPage() {
  return (
    <AdminLayout>
      <AdminUsersList />
    </AdminLayout>
  );
}
