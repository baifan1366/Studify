# OneSignal Notification System Integration

This document provides a comprehensive guide for using the OneSignal notification system in your Studify application.

## 🚀 Quick Start

### 1. Environment Variables
Add the following to your `.env.local`:
```env
ONESIGNAL_REST_API_KEY=your_rest_api_key_here
```

### 2. Install Dependencies
```bash
npm install date-fns
```

### 3. Basic Usage
```typescript
import { notificationService } from '@/lib/notifications/notification-service';

// Send a simple notification
await notificationService.createNotification({
  user_id: 123,
  kind: 'course_notification',
  payload: { course_id: 'course-123' },
  title: '📚 New Lesson Available',
  message: 'Check out the latest lesson in React Fundamentals',
  send_push: true,
});
```

## 📁 File Structure

```
lib/notifications/
├── onesignal-service.ts          # OneSignal API integration
├── notification-service.ts       # Database + push notification service
├── integration-examples.ts       # Usage examples for different modules
└── notification-helpers.ts       # React hooks and utilities

components/notifications/
├── notification-bell.tsx         # Header notification dropdown
├── notification-list.tsx         # Notification feed component
├── notification-settings.tsx     # User preference settings
└── notifications-page.tsx        # Full notifications page

hooks/notifications/
├── use-notifications.ts          # Notification CRUD hooks
├── use-notification-settings.ts  # Settings management hooks
└── use-onesignal.ts              # OneSignal client hooks

app/api/notifications/
├── route.ts                      # Main notifications API
├── [id]/route.ts                 # Individual notification operations
├── count/route.ts                # Unread count endpoint
├── mark-all-read/route.ts        # Bulk mark as read
└── settings/route.ts             # User preferences API
```

## 🔔 Components Usage

### Notification Bell (Header)
```typescript
import { NotificationBell } from '@/components/notifications/notification-bell';

// Already integrated in components/header.tsx
<NotificationBell />
```

### Full Notifications Page
```typescript
// Available at /notifications route
import { NotificationsPage } from '@/components/notifications/notifications-page';
```

### Notification Settings
```typescript
import { NotificationSettings } from '@/components/notifications/notification-settings';

// Provides comprehensive user preference management
<NotificationSettings />
```

## 🎯 Integration Examples

### Classroom Notifications
```typescript
import { ClassroomNotifications } from '@/lib/notifications/integration-examples';

// Live session starting
await ClassroomNotifications.notifyLiveSessionStarting(
  'math-101',
  'Advanced Mathematics',
  'Calculus Review Session',
  [1, 2, 3, 4, 5] // member IDs
);

// New assignment
await ClassroomNotifications.notifyNewAssignment(
  'math-101',
  'Advanced Mathematics',
  'Homework #5',
  'Tomorrow at 11:59 PM',
  [1, 2, 3, 4, 5]
);
```

### Course Notifications
```typescript
import { CourseNotifications } from '@/lib/notifications/integration-examples';

// New lesson published
await CourseNotifications.notifyNewLesson(
  'course-123',
  'React Fundamentals',
  'Understanding Hooks',
  [10, 20, 30] // enrolled user IDs
);

// Assignment due reminder
await CourseNotifications.notifyAssignmentDue(
  'course-123',
  'React Fundamentals',
  'Final Project',
  24, // hours until due
  [10, 20, 30]
);
```

### Community Notifications
```typescript
import { CommunityNotifications } from '@/lib/notifications/integration-examples';

// New post in group
await CommunityNotifications.notifyNewPost(
  'react-developers',
  'React Developers',
  'John Doe',
  'Best practices for React hooks',
  [5, 15, 25] // group member IDs
);

// Comment on post
await CommunityNotifications.notifyPostComment(
  'react-developers',
  'React Developers',
  'Jane Smith',
  'Best practices for React hooks',
  10 // post author ID
);
```

## 🔧 React Hooks

### Basic Notifications
```typescript
import { useNotifications, useNotificationCount } from '@/hooks/notifications/use-notifications';

function MyComponent() {
  const { data: notifications, isLoading } = useNotifications(1, 20);
  const { data: countData } = useNotificationCount();
  
  return (
    <div>
      <p>Unread: {countData?.count || 0}</p>
      {notifications?.notifications.map(notification => (
        <div key={notification.id}>{notification.payload.message}</div>
      ))}
    </div>
  );
}
```

### Notification Settings
```typescript
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/notifications/use-notification-settings';

function SettingsComponent() {
  const { data: settingsData } = useNotificationSettings();
  const updateMutation = useUpdateNotificationSettings();
  
  const handleToggle = (key: string, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };
  
  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={settingsData?.settings.push_notifications || false}
          onChange={(e) => handleToggle('push_notifications', e.target.checked)}
        />
        Push Notifications
      </label>
    </div>
  );
}
```

### OneSignal Integration
```typescript
import { useOneSignal } from '@/hooks/notifications/use-onesignal';

function NotificationPermission() {
  const { user, requestPermission, isInitialized } = useOneSignal();
  
  const handleEnable = async () => {
    if (!user.isSubscribed) {
      await requestPermission();
    }
  };
  
  return (
    <div>
      <p>Status: {user.isSubscribed ? 'Enabled' : 'Disabled'}</p>
      <button onClick={handleEnable}>Enable Notifications</button>
    </div>
  );
}
```

## 🎨 Notification Types

### Supported Notification Kinds
- `course_notification` - Course-related updates
- `classroom_notification` - Classroom activities
- `community_notification` - Community posts/comments
- `achievement` - User achievements
- `welcome` - Welcome messages
- `system_maintenance` - System updates

### Notification Payload Structure
```typescript
interface NotificationPayload {
  type: string;                    // Notification subtype
  course_id?: string;             // For course notifications
  classroom_slug?: string;        // For classroom notifications
  group_slug?: string;            // For community notifications
  [key: string]: any;             // Additional custom data
}
```

## 🔒 Security & Permissions

### API Route Protection
All notification API routes are protected with role-based authorization:
- Students can read their own notifications
- Tutors can create notifications for their classes
- Admins can create system-wide notifications

### User Preferences
Users can control:
- Email notifications on/off
- Push notifications on/off
- Course update notifications
- Community update notifications
- Classroom update notifications
- Assignment reminders
- Live session alerts
- Marketing emails

## 📊 Database Schema

### Notifications Table
```sql
notifications (
  id bigserial primary key,
  public_id uuid not null default uuid_generate_v4(),
  user_id bigint not null references profiles(id),
  kind text not null,
  payload jsonb not null default '{}',
  is_read boolean default false,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
)
```

### User Notification Settings
Stored in `profiles.notification_settings` as JSONB:
```json
{
  "email_notifications": true,
  "push_notifications": true,
  "course_updates": true,
  "community_updates": false,
  "classroom_updates": true,
  "assignment_reminders": true,
  "live_session_alerts": true,
  "marketing_emails": false
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Push notifications not working**
   - Check ONESIGNAL_REST_API_KEY is set
   - Verify OneSignal app configuration
   - Ensure user has granted browser permission

2. **TypeScript errors**
   - Install `date-fns`: `npm install date-fns`
   - Check all imports are correct

3. **API authorization errors**
   - Verify user is logged in
   - Check user role permissions
   - Ensure proper error handling in API routes

### Debug Mode
Enable OneSignal debug logging:
```typescript
// In utils/notification/web-onesignal.ts
OneSignal.Debug.setLogLevel(6); // Add this line for verbose logging
```

## 📈 Performance Considerations

- Notification queries use pagination (default 20 per page)
- Unread count is cached and refreshed every minute
- Push notifications are sent asynchronously
- Database indexes on user_id and created_at for fast queries

## 🔄 Future Enhancements

- Notification scheduling system
- Rich media notifications (images, actions)
- Email notification templates
- Notification analytics and tracking
- Bulk notification management for admins
- Notification categories and filtering
