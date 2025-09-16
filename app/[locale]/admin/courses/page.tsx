import { AdminLayout } from '@/components/admin/layout/admin-layout';
import AdminCoursesList from '@/components/admin/courses/admin-courses-list';
import AdminCoursesStats from '@/components/admin/courses/admin-courses-stats';

export default function AdminCoursesPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminCoursesStats />
        <AdminCoursesList />
      </div>
    </AdminLayout>
  );
}
