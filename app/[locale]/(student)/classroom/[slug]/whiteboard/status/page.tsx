import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations('WhiteboardStatusPage');
  
  return {
    title: `${t('metadata_title')} - ${slug}`,
    description: t('metadata_description'),
  };
}

export default async function WhiteboardStatusPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations('WhiteboardStatusPage');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center mb-2">{t('page_title')}</h1>
          <p className="text-gray-600 text-center">{t('page_description')} {slug}</p>
        </div>
      </div>
    </div>
  );
}
