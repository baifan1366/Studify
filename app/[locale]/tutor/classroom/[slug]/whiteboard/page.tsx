import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import WhiteboardPage from '@/components/classroom/whiteboard/whiteboard-page';

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  
  return {
    title: `Whiteboard - ${slug} | Studify`,
    description: 'Collaborative whiteboard for classroom sessions',
  };
}

export default async function ClassroomWhiteboardPage({ params }: Props) {
  const { locale, slug } = await params;

  if (!slug) {
    notFound();
  }

  return <WhiteboardPage classroomSlug={slug} />;
}
