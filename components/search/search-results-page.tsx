'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Search, 
  Filter, 
  X, 
  Clock, 
  TrendingUp,
  BookOpen,
  Users,
  MessageCircle,
  GraduationCap,
  FileText,
  Award,
  Megaphone,
  ArrowLeft,
  SlidersHorizontal,
  Star,
  Calendar,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdvancedSearch, SearchResult } from '@/hooks/search/use-universal-search';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { getSearchTranslation } from './search-translations';
import { 
  handleSearchResultClick, 
  preloadSearchResult, 
  getResultPreviewInfo,
  getContentTypeInfo
} from './search-navigation';
import { SearchTitle, SearchSnippet, createSmartExcerpt } from './search-highlight';

const contentTypeIcons: Record<string, React.ReactNode> = {
  course: <BookOpen className="w-5 h-5" />,
  lesson: <GraduationCap className="w-5 h-5" />,
  post: <MessageCircle className="w-5 h-5" />,
  comment: <MessageCircle className="w-4 h-4" />,
  user: <Users className="w-5 h-5" />,
  classroom: <GraduationCap className="w-5 h-5" />,
  group: <Users className="w-5 h-5" />,
  note: <FileText className="w-5 h-5" />,
  quiz: <Award className="w-5 h-5" />,
  tutor: <Users className="w-5 h-5" />,
  announcement: <Megaphone className="w-5 h-5" />,
};

const contentTypeColors: Record<string, string> = {
  course: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  lesson: 'bg-green-500/20 text-green-300 border-green-400/30',
  post: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  comment: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
  user: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
  classroom: 'bg-red-500/20 text-red-300 border-red-400/30',
  group: 'bg-pink-500/20 text-pink-300 border-pink-400/30',
  note: 'bg-gray-500/20 text-gray-300 border-gray-400/30',
  quiz: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
  tutor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
  announcement: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
};

interface SearchResultsPageProps {
  initialQuery?: string;
  initialFilters?: {
    contentTypes?: string[];
    context?: string;
  };
}

export default function SearchResultsPage({ 
  initialQuery = '', 
  initialFilters = {} 
}: SearchResultsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('UniversalSearch');
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'popularity'>('relevance');
  const [showFilters, setShowFilters] = useState(false);

  const {
    query,
    selectedTables,
    context,
    setQuery,
    setSelectedTables,
    setContext,
    searchResults,
    contentTypes,
    isLoading,
    error,
  } = useAdvancedSearch();

  // Initialize from URL params or props
  useEffect(() => {
    const urlQuery = searchParams.get('q') || initialQuery;
    const urlContentTypes = searchParams.get('types')?.split(',') || initialFilters.contentTypes || [];
    const urlContext = searchParams.get('context') || initialFilters.context || 'general';

    if (urlQuery) setQuery(urlQuery);
    if (urlContentTypes.length > 0) {
      const tableMap: Record<string, string> = {
        course: 'course',
        lesson: 'course_lesson',
        post: 'community_post',
        comment: 'community_comment',
        user: 'profiles',
        classroom: 'classroom',
        group: 'community_group',
        note: 'course_notes',
        quiz: 'community_quiz',
        tutor: 'tutoring_tutors',
        announcement: 'announcements',
      };
      const tables = urlContentTypes.map(type => tableMap[type]).filter(Boolean);
      setSelectedTables(tables);
    }
    setContext(urlContext as any);
  }, [searchParams, initialQuery, initialFilters, setQuery, setSelectedTables, setContext]);

  const handleResultClick = (result: SearchResult) => {
    handleSearchResultClick(result, router);
  };

  const handleResultHover = (result: SearchResult) => {
    preloadSearchResult(result, router);
  };

  const toggleContentType = (contentType: string) => {
    const tableMap: Record<string, string> = {
      course: 'course',
      lesson: 'course_lesson',
      post: 'community_post',
      comment: 'community_comment',
      user: 'profiles',
      classroom: 'classroom',
      group: 'community_group',
      note: 'course_notes',
      quiz: 'community_quiz',
      tutor: 'tutoring_tutors',
      announcement: 'announcements',
    };

    const table = tableMap[contentType];
    if (table) {
      setSelectedTables(prev => 
        prev.includes(table) 
          ? prev.filter(t => t !== table)
          : [...prev, table]
      );
    }
  };

  const clearFilters = () => {
    setSelectedTables([]);
    setContext('general');
  };

  const hasActiveFilters = selectedTables.length > 0 || context !== 'general';

  // Sort results
  const sortedResults = searchResults.data?.results ? [...searchResults.data.results].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'popularity':
        return (b.additional_data?.view_count || 0) - (a.additional_data?.view_count || 0);
      case 'relevance':
      default:
        return b.rank - a.rank;
    }
  }) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Search Results</h1>
            {query && (
              <p className="text-white/70">
                Results for "{query}"
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 sticky top-8">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search Input */}
                <div>
                  <label className="text-white/70 text-sm font-medium mb-2 block">
                    Search Query
                  </label>
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter search terms..."
                    className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  />
                </div>

                {/* Context Filter */}
                <div>
                  <label className="text-white/70 text-sm font-medium mb-2 block">
                    Context
                  </label>
                  <Select value={context} onValueChange={(value) => setContext(value as any)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20">
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="learning">Learning</SelectItem>
                      <SelectItem value="teaching">Teaching</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Content Types */}
                <div>
                  <label className="text-white/70 text-sm font-medium mb-3 block">
                    Content Types
                  </label>
                  <div className="space-y-2">
                    {contentTypes.map((type) => {
                      const isSelected = selectedTables.some(table => 
                        table.includes(type.id.replace('lesson', 'course_lesson'))
                      );
                      
                      return (
                        <button
                          key={type.id}
                          onClick={() => toggleContentType(type.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors",
                            isSelected 
                              ? "bg-blue-500/20 text-blue-300" 
                              : "text-white/70 hover:bg-white/5"
                          )}
                        >
                          <span>{type.icon}</span>
                          <span className="flex-1 text-left">{type.label}</span>
                          {isSelected && (
                            <Badge className="bg-blue-500/30 text-blue-200 text-xs">
                              Active
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="w-full border-red-400/30 text-red-400 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-3">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {searchResults.data && (
                  <p className="text-white/70">
                    {searchResults.data.stats.total_results} results found
                    {searchResults.data.stats.search_time && (
                      <span className="ml-2 text-white/50">
                        ({(searchResults.data.stats.search_time).toFixed(2)}s)
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Sort Options */}
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="popularity">Popularity</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex rounded-lg bg-white/10 p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "px-3 py-1 rounded text-sm transition-colors",
                      viewMode === 'list' 
                        ? "bg-white/20 text-white" 
                        : "text-white/70 hover:text-white"
                    )}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "px-3 py-1 rounded text-sm transition-colors",
                      viewMode === 'grid' 
                        ? "bg-white/20 text-white" 
                        : "text-white/70 hover:text-white"
                    )}
                  >
                    Grid
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-white/70" />
                <span className="ml-3 text-white/70">Searching...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card className="bg-red-500/10 border-red-400/30">
                <CardContent className="p-6 text-center">
                  <p className="text-red-400">
                    {getSearchTranslation('UniversalSearch.search_error', 'Search failed. Please try again.')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* No Results */}
            {searchResults.data && sortedResults.length === 0 && !isLoading && (
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardContent className="p-8 text-center">
                  <Search className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No results found
                  </h3>
                  <p className="text-white/70 mb-4">
                    Try adjusting your search terms or filters
                  </p>
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="border-white/20 text-white"
                  >
                    Clear all filters
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Results Grid/List */}
            {sortedResults.length > 0 && (
              <div className={cn(
                "space-y-4",
                viewMode === 'grid' && "grid grid-cols-1 md:grid-cols-2 gap-6 space-y-0"
              )}>
                <AnimatePresence>
                  {sortedResults.map((result, index) => {
                    const previewInfo = getResultPreviewInfo(result);
                    const contentInfo = getContentTypeInfo(result.content_type);
                    const smartSnippet = createSmartExcerpt(result.snippet, query, 200);

                    return (
                      <motion.div
                        key={`${result.table_name}-${result.record_id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card 
                          className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
                          onClick={() => handleResultClick(result)}
                          onMouseEnter={() => handleResultHover(result)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              {/* Content Type Icon */}
                              <div className={cn(
                                "p-3 rounded-lg",
                                contentTypeColors[result.content_type] || 'bg-gray-500/20'
                              )}>
                                {contentTypeIcons[result.content_type] || <FileText className="w-5 h-5" />}
                              </div>

                              {/* Content Details */}
                              <div className="flex-1 min-w-0">
                                {/* Title and Badge */}
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <SearchTitle
                                    text={result.title}
                                    searchQuery={query}
                                    className="text-lg group-hover:text-blue-300 transition-colors"
                                  />
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Badge 
                                      className={cn(
                                        "text-xs",
                                        contentTypeColors[result.content_type] || 'bg-gray-500/20 text-gray-300'
                                      )}
                                    >
                                      {contentInfo.label}
                                    </Badge>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <ExternalLink className="w-4 h-4 text-blue-400" />
                                    </div>
                                  </div>
                                </div>

                                {/* Author/Creator Info */}
                                {previewInfo.primaryInfo && (
                                  <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
                                    <Users className="w-4 h-4" />
                                    <span>{previewInfo.primaryInfo}</span>
                                    {previewInfo.secondaryInfo && (
                                      <>
                                        <span>•</span>
                                        <span>{previewInfo.secondaryInfo}</span>
                                      </>
                                    )}
                                  </div>
                                )}

                                {/* Snippet */}
                                <SearchSnippet
                                  text={smartSnippet}
                                  searchQuery={query}
                                  className="mb-4"
                                  maxLength={viewMode === 'grid' ? 150 : 250}
                                />

                                {/* Metadata */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4 text-white/50 text-sm">
                                    <span className="flex items-center gap-1">
                                      <TrendingUp className="w-4 h-4" />
                                      {(result.rank * 100).toFixed(0)}% match
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      {new Date(result.created_at).toLocaleDateString()}
                                    </span>
                                    {previewInfo.metadata.rating && (
                                      <span className="flex items-center gap-1">
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        {previewInfo.metadata.rating.toFixed(1)}
                                      </span>
                                    )}
                                  </div>

                                  {previewInfo.tertiaryInfo && (
                                    <span className="text-white/60 text-sm">
                                      {previewInfo.tertiaryInfo}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
