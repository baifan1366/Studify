import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My - Studify",
  description:
    "Access your personal dashboard with enrolled courses, progress tracking, and account settings",
  keywords: [
    "personal dashboard",
    "enrolled courses",
    "progress tracking",
    "account settings",
    "education",
  ],
  openGraph: {
    title: "My - Studify",
    description: "Course management and personal dashboard",
    type: "website",
  },
};

export default function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
    </div>
  );
}
