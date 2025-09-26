import { Metadata } from 'next';
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
  
  return {
    title: `Live Chat Test - ${slug} | Studify`,
    description: 'Test Liveblocks chat integration in live classroom',
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
