import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import { QuizTable } from '@/components/tutor/quiz-content/quiz-table';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TutorQuizContentPage');

  return {
    title: t('metadata_title'),
    description: t('metadata_description'),
    keywords: t('metadata_keywords').split(','),
    openGraph: {
      title: t('og_title'),
      description: t('og_description'),
      type: 'website',
    },
  };
}

export default async function TutorQuizContentPage() {
  const t = await getTranslations('TutorQuizContentPage');

  return (
    <div>
      <QuizTable />
    </div>
  );
}