'use client';

import CreatePostForm from '@/components/community/create-post-form';
import { Suspense, use } from 'react';
import { useTranslations } from 'next-intl';
import { useGroupAccess } from '@/hooks/community/use-community';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface CreatePostPageProps {
  params: Promise<{
    groupSlug: string;
  }>;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2 bg-white/10" />
          <Skeleton className="h-4 w-96 bg-white/10" />
        </div>
        <Skeleton className="h-96 w-full bg-white/10" />
      </div>
    </div>
  );
}

function AccessDenied({ groupName }: { groupName?: string }) {
  const t = useTranslations('CreatePostPage');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-red-400/10 border border-red-400 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h1 className="text-xl font-bold text-red-400">{t('access_denied')}</h1>
          </div>
          <p className="text-gray-300">
            {groupName ? t('access_denied_description_with_name', { groupName }) : t('access_denied_description')}
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  const t = useTranslations('CreatePostPage');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-red-400/10 border border-red-400 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h1 className="text-xl font-bold text-red-400">{t('error')}</h1>
          </div>
          <p className="text-gray-300">
            {error.message || t('error_default')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CreatePostPage({ params }: CreatePostPageProps) {
  const { groupSlug } = use(params);
  const { group, canPost, isLoading, isError, error } = useGroupAccess(groupSlug);
  const t = useTranslations('CreatePostPage');

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !group) {
    return <ErrorState error={error || new Error('Group not found')} />;
  }

  if (!canPost) {
    return <AccessDenied groupName={group.name} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t('create_new_post')}</h1>
          <p className="text-gray-300">
            {t('share_thoughts', { groupName: group.name })}
          </p>
        </div>
        
        <Suspense fallback={<Skeleton className="h-96 w-full bg-white/10" />}>
          <CreatePostForm 
            groupSlug={groupSlug}
            groupName={group.name}
          />
        </Suspense>
      </div>
    </div>
  );
}
