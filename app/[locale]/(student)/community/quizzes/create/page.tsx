import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import QuizForm from "@/components/community/quiz/create/quiz-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('CreateQuizPage');

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

export default async function CreateQuizPage() {
  const t = await getTranslations('CreateQuizPage');
  
  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-foreground">{t('page_title')}</h1>
      <QuizForm />
    </div>
  );
}
