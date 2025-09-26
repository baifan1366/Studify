import { Metadata } from 'next';
import SearchResultsPage from '@/components/search/search-results-page';

export const metadata: Metadata = {
  title: 'Search Results | Studify',
  description: 'Search results across courses, lessons, posts, and more on Studify',
  keywords: 'search,results,courses,lessons,posts,users,community,education',
};

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
