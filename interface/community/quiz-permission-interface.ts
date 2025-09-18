export interface CommunityQuizPermission {
  id: number;
  quiz_id: number;
  user_id: string;
  permission_type: 'view' | 'attempt' | 'edit';
  granted_by: string;
  expires_at?: string;
  created_at: string;
}

export interface QuizInviteToken {
  token: string;
  quiz_id: number;
  permission_type: 'view' | 'attempt' | 'edit';
  expires_at?: string;
  created_by: string;
  created_at: string;
}

export interface ShareQuizRequest {
  quiz_slug: string;
  permission_type: 'view' | 'attempt' | 'edit';
  expires_in_days?: number; // 可选的过期天数
}

export interface ShareQuizResponse {
  invite_link: string;
  token: string;
  expires_at?: string;
}
