"use client";

import { UserReportsList } from "./user-reports-list";

/**
 * Main User Reports component for admin dashboard
 * 
 * This component provides comprehensive user reporting and management functionality:
 * 
 * Features:
 * - View all users with filtering, search, and sorting
 * - Detailed user information including profile, community activity, courses, and purchases
 * - Admin actions like banning users with configurable duration
 * - Responsive design with dark/light mode support
 * - Complete internationalization (i18n) support
 * 
 * Data Sources:
 * - Profile: profiles table (name, role, created_at, status)
 * - Community: community_post, community_comment, community_reaction tables
 * - Chat: classroom_chat_message table
 * - Courses: course_enrollment, course_progress tables  
 * - Purchases: course_order table
 * 
 * Components:
 * - UserReportsList: Main list with filters and search
 * - UserDetailsDialog: Detailed user information across all platforms
 * - BanUserDialog: Admin action to ban users with reason and duration
 * 
 * All components follow the established patterns:
 * - useTranslations for i18n
 * - Responsive design for all screen sizes
 * - Dark/light mode support
 * - @/components/ui for consistent styling
 * - React Query hooks for data fetching
 * - Proper error handling and loading states
 */
export function UserReports() {
  return <UserReportsList />;
}