import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ChatIntegrationTest } from '@/components/classroom/live-session/chat-integration-test';

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
  searchParams: Promise<{
    session?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations('LiveChatTestPage');
  
  return {
    title: `${t('metadata_title')} - ${slug}`,
    description: t('metadata_description'),
  };
}

export default async function LiveChatTestPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { session } = await searchParams;

  return (
    <ChatIntegrationTest 
      classroomSlug={slug} 
      sessionId={session}
    />
  );
}
