'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiGet } from '@/lib/api-config';

interface UseKnowledgeGraphProps {
  courseSlug: string;
}

export function useKnowledgeGraph({ courseSlug }: UseKnowledgeGraphProps) {
  const t = useTranslations('KnowledgeGraph');
  
  const { data: conceptsData, isLoading, error } = useQuery({
    queryKey: ['concepts', courseSlug],
    queryFn: () => apiGet(`/api/course/concept?courseSlug=${courseSlug}`),
  });

  const concepts = (conceptsData as any)?.data?.concepts || [];
  const links = (conceptsData as any)?.data?.links || [];

  const handleConceptClick = (concept: any) => {
    // Handle concept click if needed
    console.log('Concept clicked:', concept);
  };

  return {
    concepts,
    links,
    isLoading,
    error,
    handleConceptClick,
  };
}