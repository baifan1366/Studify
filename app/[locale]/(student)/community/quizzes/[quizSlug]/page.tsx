import SingleQuizContent from "@/components/community/quiz/single/single-quiz-content";

import { CommunityQuiz } from "@/interface/community/quiz-interface";

const mockQuiz: Omit<CommunityQuiz, "likes" | "comments" | "attempts"> = {
  id: "1",
  title: "Advanced Calculus Challenge",
  author: {
    display_name: "John Doe",
    avatar_url: "https://github.com/shadcn.png",
  },
  description: "This quiz is designed to push your calculus skills...",
  tags: ["Calculus", "Mathematics", "Advanced", "STEM"],
  difficulty: 3,
};

const mockLeaderboard = [
  {
    rank: 1,
    name: "Alice",
    score: 98,
    avatarUrl: "https://i.pravatar.cc/150?u=a",
  },
  {
    rank: 2,
    name: "Bob",
    score: 95,
    avatarUrl: "https://i.pravatar.cc/150?u=b",
  },
];

const mockComments = [
  {
    id: "1",
    author: { name: "Frank", avatarUrl: "https://i.pravatar.cc/150?u=c" },
    text: "Great quiz!",
    likes: 15,
  },
  {
    id: "2",
    author: { name: "Grace", avatarUrl: "https://i.pravatar.cc/150?u=d" },
    text: "Question 3 was tricky!",
    likes: 8,
  },
];

export default function Page() {
  return (
    <SingleQuizContent
      quiz={mockQuiz}
      leaderboard={mockLeaderboard}
      comments={mockComments}
    />
  );
}
