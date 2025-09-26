import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

// Search result interfaces
export interface SearchResult {
  table_name: string;
  record_id: number;
  title: string;
  snippet: string;
  rank: number;
  content_type: string;
  created_at: string;
  additional_data: Record<string, any>;
  relevance_score?: number;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  grouped_results: Record<string, SearchResult[]>;
  stats: {
    total_results: number;
    content_types: number;
    max_rank: number;
    search_time: number;
  };
  context: string;
  user_role: string;
}

export interface SearchOptions {
  tables?: string[];
  maxResults?: number;
  minRank?: number;
  context?: 'general' | 'learning' | 'teaching' | 'admin';
  userRole?: 'student' | 'tutor' | 'admin';
  enabled?: boolean;
}

// Main search hook
export function useUniversalSearch(query: string, options: SearchOptions = {}) {
  const {
    tables = [],
    maxResults = 20,
    minRank = 0.1,
    context = 'general',
    userRole = 'student',
    enabled = true
  } = options;

  const debouncedQuery = useDebouncedValue(query, 500);
  const shouldSearch = enabled && debouncedQuery.trim().length >= 2;

  return useQuery({
    queryKey: ['universal-search', debouncedQuery, tables, context, userRole, maxResults],
    queryFn: async (): Promise<SearchResponse> => {
      const params = new URLSearchParams({
        q: debouncedQuery,
        limit: maxResults.toString(),
        min_rank: minRank.toString(),
        context,
        user_role: userRole
      });

      if (tables.length > 0) {
        params.set('tables', tables.join(','));
      }

      const response = await fetch(`/api/search/universal?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Search failed');
      }

      return response.json();
    },
    enabled: shouldSearch,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Search suggestions hook
export function useSearchSuggestions(query: string) {
  const debouncedQuery = useDebouncedValue(query, 300);

  return useQuery({
    queryKey: ['search-suggestions', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.trim().length < 2) return [];

      const response = await fetch(`/api/search/universal?q=${encodeURIComponent(debouncedQuery)}&limit=5`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data: SearchResponse = await response.json();
      
      // Extract unique suggestions from titles
      const suggestions = Array.from(
        new Set(
          data.results
            .map(result => result.title)
            .filter(title => title.toLowerCase().includes(debouncedQuery.toLowerCase()))
            .slice(0, 5)
        )
      );

      return suggestions;
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Search analytics/logging hook
export function useSearchAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      query: string;
      search_type?: string;
      results_count?: number;
      user_id?: number;
    }) => {
      const response = await fetch('/api/search/universal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to log search');
      }

      return response.json();
    },
  });
}

// Advanced search state management hook
export function useAdvancedSearch() {
  const [query, setQuery] = useState('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [context, setContext] = useState<SearchOptions['context']>('general');
  const [maxResults, setMaxResults] = useState(20);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const searchOptions: SearchOptions = {
    tables: selectedTables,
    maxResults,
    context,
    enabled: query.trim().length >= 2,
  };

  const searchResults = useUniversalSearch(query, searchOptions);
  const suggestions = useSearchSuggestions(query);
  const logSearch = useSearchAnalytics();

  const addToHistory = useCallback((searchQuery: string) => {
    if (searchQuery.trim().length === 0) return;
    
    setSearchHistory(prev => {
      const newHistory = [searchQuery, ...prev.filter(q => q !== searchQuery)];
      return newHistory.slice(0, 10); // Keep only last 10 searches
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    addToHistory(searchQuery);
    
    // Log search after results are available
    if (searchResults.data) {
      logSearch.mutate({
        query: searchQuery,
        search_type: 'universal',
        results_count: searchResults.data.results.length,
      });
    }
  }, [addToHistory, logSearch, searchResults.data]);

  // Available content types for filtering
  const contentTypes = useMemo(() => [
    { id: 'course', label: 'Courses', icon: '📚' },
    { id: 'lesson', label: 'Lessons', icon: '🎯' },
    { id: 'post', label: 'Posts', icon: '💬' },
    { id: 'user', label: 'Users', icon: '👤' },
    { id: 'classroom', label: 'Classrooms', icon: '🏫' },
    { id: 'group', label: 'Groups', icon: '👥' },
    { id: 'note', label: 'Notes', icon: '📝' },
    { id: 'quiz', label: 'Quizzes', icon: '❓' },
    { id: 'tutor', label: 'Tutors', icon: '👨‍🏫' },
    { id: 'announcement', label: 'Announcements', icon: '📢' },
  ], []);

  return {
    // State
    query,
    selectedTables,
    context,
    maxResults,
    searchHistory,
    
    // Actions
    setQuery,
    setSelectedTables,
    setContext,
    setMaxResults,
    handleSearch,
    addToHistory,
    clearHistory,
    
    // Data
    searchResults,
    suggestions,
    contentTypes,
    
    // Status
    isLoading: searchResults.isLoading,
    error: searchResults.error,
    isSuccess: searchResults.isSuccess,
  };
}
