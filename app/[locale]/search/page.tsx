import { Metadata } from 'next';
import SearchResultsPage from '@/components/search/search-results-page';

export const metadata: Metadata = {
  title: 'Search Results | Studify',
  description: 'Search results across courses, lessons, posts, and more on Studify',
  keywords: 'search,results,courses,lessons,posts,users,community,education',
};

interface SearchPageProps {
  searchParams: {
    q?: string;
    types?: string;
    context?: string;
  };
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '', types = '', context = 'general' } = searchParams;
  
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
