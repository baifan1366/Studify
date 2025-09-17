// Background tasks are now handled entirely through sonner toast notifications
// This component is no longer needed as we use toast.loading() with progress updates
// and toast.success()/toast.error() for completion states directly in the hooks

export function BackgroundTasksIndicator() {
  // All background task notifications are now handled through sonner toast
  // No additional UI component needed
  return null
}
