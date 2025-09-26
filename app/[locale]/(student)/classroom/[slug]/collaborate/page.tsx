import { Metadata } from 'next';
import { ClassroomCollaboration } from '@/components/classroom/liveblocks/classroom-collaboration';
import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

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
    title: `实时协作 - ${slug} | Studify`,
    description: '与同学和老师一起进行实时协作学习',
    keywords: '在线教育,实时协作,白板,聊天,Liveblocks',
  };
}

function LoadingFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Spinner />
            <p className="mt-4 text-gray-600">正在连接实时协作服务...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ClassroomCollaboratePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { session } = await searchParams;

  return (
    <div className="h-screen bg-gray-50">
      <div className="p-4 h-full">
        <Suspense fallback={<LoadingFallback />}>
          <ClassroomCollaboration 
            classroomSlug={slug}
            sessionId={session}
            className="h-full"
          />
        </Suspense>
      </div>
    </div>
  );
}
