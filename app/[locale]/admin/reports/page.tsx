import AdminReportsList from '@/components/admin/reports/admin-reports-list';
import AdminReportsStats from '@/components/admin/reports/admin-reports-stats';

export default function AdminReportsPage() {
  return (
      <div className="space-y-6">
        <AdminReportsStats />
        <AdminReportsList />
      </div>
  );
}
