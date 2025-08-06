import { NotificationHistory } from '@/components/notification/NotificationHistory';

export function NotificationHistoryPage() {
  // In a real application, you would get the user ID from authentication context
  // For now, we're using a hardcoded user ID consistent with the rest of the app
  const userId = 1;

  return (
    <NotificationHistory userId={userId} />
  );
}

export default NotificationHistoryPage;
