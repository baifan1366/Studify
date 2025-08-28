import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tutoring - Studify",
  description: "match with expert tutors for personalized learning sessions",
  keywords: ["tutoring", "personalized learning", "expert tutors", "education"],
  openGraph: {
    title: "Tutoring - Studify",
    description: "tutor matching and personalized learning",
    type: "website",
  },
};

export default function TutoringPage() {
  return (
    <div>
      <h1>Tutoring</h1>
    </div>
  );
}
