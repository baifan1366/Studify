import AdminCoursesList from '@/components/admin/courses/admin-courses-list';
import AdminCoursesStats from '@/components/admin/courses/admin-courses-stats';

export default function AdminCoursesPage() {
  return (
      <div className="space-y-6">
        <AdminCoursesStats />
        <AdminCoursesList />
      </div>
  );
}
