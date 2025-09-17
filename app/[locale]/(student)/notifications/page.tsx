import { Metadata } from 'next';
import NotificationsPage from '@/components/notifications/notifications-page';

export const metadata: Metadata = {
  title: 'Notifications | Studify',
  description: 'View and manage your notifications',
};

export default function Page() {
  return <NotificationsPage />;
}
