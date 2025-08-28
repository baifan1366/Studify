import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community - Studify",
  description:
    "Access community forums, discussion boards, and peer support to enhance your learning experience",
  keywords: [
    "community",
    "forums",
    "discussion boards",
    "peer support",
    "education",
  ],
  openGraph: {
    title: "Community - Studify",
    description: "Community forums and peer support",
    type: "website",
  },
};

export default function CommunityPage() {
  return (
    <div>
      <h1>Community</h1>
    </div>
  );
}
