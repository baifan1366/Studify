import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import SearchResultsPage from '@/components/search/search-results-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('SearchPage');
  
  return {
    title: t('metadata_title'),
    description: t('metadata_description'),
    keywords: t('metadata_keywords'),
    openGraph: {
      title: t('og_title'),
      description: t('og_description'),
      type: 'website',
    },
  };
}

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    types?: string;
    context?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const { q = '', types = '', context = 'general' } = resolvedSearchParams;
  
  const initialFilters = {
    contentTypes: types ? types.split(',') : [],
    context: context,
  };

  return (
    <SearchResultsPage 
      initialQuery={q}
      initialFilters={initialFilters}
    />
  );
}
