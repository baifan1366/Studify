import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import WhiteboardPage from '@/components/classroom/whiteboard/whiteboard-page';

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations('WhiteboardPage');
  
  return {
    title: `${t('metadata_title')} - ${slug}`,
    description: t('metadata_description'),
    keywords: t('metadata_keywords'),
    openGraph: {
      title: t('og_title'),
      description: t('og_description'),
      type: 'website',
    },
  };
}

export default async function ClassroomWhiteboardPage({ params }: Props) {
  const { locale, slug } = await params;

  if (!slug) {
    notFound();
  }

  return <WhiteboardPage classroomSlug={slug} />;
}
