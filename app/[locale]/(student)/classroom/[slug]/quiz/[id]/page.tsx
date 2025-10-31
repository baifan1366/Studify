import { QuizTakingPage } from '@/components/classroom/quiz/quiz-taking-page';
import { Metadata } from 'next';

interface PageProps {
  params: Promise<{
    locale: string;
    slug: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  // TODO: Fetch quiz title from API
  return {
    title: `Quiz ${id} | Classroom`,
  };
}

export default async function StudentQuizTakingPage({ params }: PageProps) {
  const { slug, id } = await params;
  
  return <QuizTakingPage classroomSlug={slug} quizId={parseInt(id)} />;
}
