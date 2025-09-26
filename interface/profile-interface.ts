/**
 * Profile interfaces based on the profiles database table
 */

export interface ProfileData {
  id: number;
  public_id: string;
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  role: 'admin' | 'student' | 'tutor';
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  status: 'active' | 'banned';
  banned_reason?: string | null;
  banned_at?: string | null;
  points: number;
  last_login: string | null; // ISO timestamp
  email: string | null; // Only included if privacy_settings.show_email is true
  preferences?: Record<string, any>;
  notification_settings?: {
    course_updates?: boolean;
    marketing_emails?: boolean;
    community_updates?: boolean;
    push_notifications?: boolean;
    email_notifications?: boolean;
    [key: string]: any;
  };
  privacy_settings: {
    show_email?: boolean;
    show_progress?: boolean;
    data_collection?: boolean;
    profile_visibility?: 'public' | 'private';
    [key: string]: any;
  };
  created_at: string;
}

export interface ProfileModalProps {
  profile: ProfileData | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSendMessage?: (profileId: number) => void;
  className?: string;
}

// Simplified profile data for lists and cards
export interface ProfileSummary {
  id: number;
  public_id: string;
  display_name: string | null;
  full_name: string | null;
  role: 'admin' | 'student' | 'tutor';
  avatar_url: string | null;
  status: 'active' | 'banned';
  points: number;
}

// Profile data for API responses
export interface ProfileResponse {
  profile: ProfileData;
  success: boolean;
  error?: string;
}

export interface ProfileListResponse {
  profiles: ProfileSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  success: boolean;
  error?: string;
}
