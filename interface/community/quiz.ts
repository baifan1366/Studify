import { Profile } from "../user/profile-interface";
import { Hashtag } from "./post-interface";

/**
 * Interface for a community quiz.
 */
export interface CommunityQuiz {
  id: string;
  title: string;
  author: Partial<Profile>;
  description: string;
  tags: (string | Hashtag)[];
  likes: number;
  comments: number;
  attempts: number;
  difficulty: "Easy" | "Medium" | "Hard";
}
