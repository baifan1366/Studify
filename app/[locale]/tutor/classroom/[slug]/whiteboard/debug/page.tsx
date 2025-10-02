import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import DebugPanel from '@/components/classroom/whiteboard/debug-panel';

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations('WhiteboardDebugPage');
  
  return {
    title: `${t('metadata_title')} - ${slug}`,
    description: t('metadata_description'),
  };
}

export default async function WhiteboardDebugPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations('WhiteboardDebugPage');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">{t('page_title')}</h1>
        <DebugPanel classroomSlug={slug} sessionId="1" />
      </div>
    </div>
  );
}
