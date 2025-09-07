export interface Classroom {
  id: number;
  public_id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: string;
  class_code: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
  user_role: string;
  joined_at: string;
  member_count: number;
  color?: string; // Classroom color from our color palette
}

export interface ClassroomWithMembers extends Classroom {
  members: ClassroomMember[];
}

export interface ClassroomMember {
  id: number;
  user_id: number;
  classroom_id: number;
  role: 'owner' | 'tutor' | 'student';
  joined_at: string;
  user: {
    id: number;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface CreateClassroomRequest {
  name: string;
  description?: string;
  visibility: 'public' | 'private';
}

export interface JoinClassroomRequest {
  class_code: string;
}
