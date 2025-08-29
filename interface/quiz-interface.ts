export interface Quiz {
  id: string;
  course_id?: string;
  title: string;
  settings: {
    shuffle?: boolean;
    time_limit?: number;
  };
}