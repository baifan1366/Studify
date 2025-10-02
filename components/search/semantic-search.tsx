'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Loader2, Filter } from 'lucide-react';
import { useEmbeddingSearch, EmbeddingSearchResult } from '@/hooks/embedding/use-embedding-search';

interface SemanticSearchProps {
  placeholder?: string;
  contentTypes?: string[];
  maxResults?: number;
  onResultClick?: (result: EmbeddingSearchResult) => void;
}

const getContentTypeLabels = (t: any) => ({
  'profile': t('content_types.profile') || 'User Profile',
  'course': t('content_types.course') || 'Course',
  'post': t('content_types.post') || 'Community Post',
  'comment': t('content_types.comment') || 'Comment',
  'lesson': t('content_types.lesson') || 'Lesson Content'
});

export default function SemanticSearch({ 
  placeholder, 
  contentTypes,
  maxResults = 10,
  onResultClick 
}: SemanticSearchProps) {
  const t = useTranslations('SemanticSearch');
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(contentTypes || []);
  const [showFilters, setShowFilters] = useState(false);
  
  const embeddingSearch = useEmbeddingSearch();
  const CONTENT_TYPE_LABELS = getContentTypeLabels(t);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    embeddingSearch.mutate({
      query: query.trim(),
      contentTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
      maxResults,
      similarityThreshold: 0.7
    });
  };

  const toggleContentType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getContentTypeColor = (type: string) => {
    const colors = {
      'profile': 'bg-blue-100 text-blue-800',
      'course': 'bg-green-100 text-green-800',
      'post': 'bg-purple-100 text-purple-800',
      'comment': 'bg-orange-100 text-orange-800',
      'lesson': 'bg-indigo-100 text-indigo-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="relative mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder || t('placeholder') || 'Search related content...'}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            {t('filter') || 'Filter'}
          </button>
          <button
            type="submit"
            disabled={!query.trim() || embeddingSearch.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {embeddingSearch.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {t('search') || 'Search'}
          </button>
        </div>
      </form>

      {/* Content Type Filters */}
      {showFilters && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t('filter_by_type') || 'Filter by content type:'}</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CONTENT_TYPE_LABELS).map(([type, label]) => (
              <button
                key={type}
                onClick={() => toggleContentType(type)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  selectedTypes.includes(type)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label as string}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {embeddingSearch.isError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">
            {t('search_failed') || 'Search failed'}: {embeddingSearch.error?.message}
          </p>
        </div>
      )}

      {/* Search Results */}
      {embeddingSearch.data && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('search_results') || 'Search Results'} ({embeddingSearch.data.count})
            </h3>
            <p className="text-sm text-gray-500">
              {t('query') || 'Query'}: "{embeddingSearch.data.query}"
            </p>
          </div>

          {embeddingSearch.data.results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{t('no_results') || 'No relevant content found'}</p>
              <p className="text-sm">{t('try_different_keywords') || 'Try using different keywords or adjust filter conditions'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {embeddingSearch.data.results.map((result, index) => (
                <div
                  key={result.id}
                  onClick={() => onResultClick?.(result)}
                  className={`p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow ${
                    onResultClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 line-clamp-2">
                      {result.title || t('no_title') || 'Untitled'}
                    </h4>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getContentTypeColor(result.content_type)}`}>
                        {CONTENT_TYPE_LABELS[result.content_type as keyof typeof CONTENT_TYPE_LABELS] || result.content_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(result.similarity_score * 100)}% {t('match') || 'match'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                    {result.content}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>ID: {result.content_id}</span>
                    <span>{new Date(result.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
