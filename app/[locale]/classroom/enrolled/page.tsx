import EnrolledContent from '@/components/classroom/enrolled-content';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Enrolled Courses',
  description: 'Browse and manage your enrolled courses.',
};

export default function EnrolledPage() {
  return <EnrolledContent />;
}