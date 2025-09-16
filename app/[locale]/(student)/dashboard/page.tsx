import { Metadata } from 'next';
import DashboardContent from '@/components/student/dashboard-content';

export const metadata: Metadata = {
  title: 'Dashboard - Studify',
  description: 'Your learning dashboard with progress tracking, recent courses, and achievements.',
};

export default function DashboardPage() {
  return <DashboardContent />;
}
