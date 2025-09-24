import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

/**
 * Assignment Detail Page Component
 * View individual assignment details and content
 */

interface AssignmentPageProps {
  params: Promise<{
    locale: string;
    slug: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: AssignmentPageProps): Promise<Metadata> {
  const t = await getTranslations('AssignmentPage');
  const { locale, slug, id } = await params;
  
  return {
    title: t('metadata_title', { id, slug }),
    description: t('metadata_description', { id }),
    keywords: t('metadata_keywords').split(','),
    openGraph: {
      title: t('og_title', { id, slug }),
      description: t('og_description'),
      type: 'website',
    },
  };
}

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const { locale, slug, id } = await params;
  
  // For now, redirect to the main assignment page
  // This can be enhanced later to show individual assignment details
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Assignment {id}</h1>
        <p className="text-muted-foreground">Individual assignment view - Coming soon</p>
      </div>
    </div>
  );
}
