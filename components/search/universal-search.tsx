'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
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
  ChevronDown,
  Loader2,
  History,
  ExternalLink,
  Eye,
  Star
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
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

interface UniversalSearchProps {
  className?: string;
  placeholder?: string;
  onResultClick?: (result: SearchResult) => void;
}

const contentTypeIcons: Record<string, React.ReactNode> = {
  course: <BookOpen className="w-4 h-4" />,
  lesson: <GraduationCap className="w-4 h-4" />,
  post: <MessageCircle className="w-4 h-4" />,
  comment: <MessageCircle className="w-4 h-4" />,
  user: <Users className="w-4 h-4" />,
  classroom: <GraduationCap className="w-4 h-4" />,
  group: <Users className="w-4 h-4" />,
  note: <FileText className="w-4 h-4" />,
  quiz: <Award className="w-4 h-4" />,
  tutor: <Users className="w-4 h-4" />,
  announcement: <Megaphone className="w-4 h-4" />,
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

export default function UniversalSearch({ 
  className, 
  placeholder, 
  onResultClick 
}: UniversalSearchProps) {
  const t = useTranslations('UniversalSearch');
  const router = useRouter();
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredResult, setHoveredResult] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    query,
    selectedTables,
    context,
    searchHistory,
    setQuery,
    setSelectedTables,
    setContext,
    handleSearch,
    clearHistory,
    searchResults,
    suggestions,
    contentTypes,
    isLoading,
    error,
  } = useAdvancedSearch();

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(value.trim().length > 0);
  };

  const handleInputFocus = () => {
    if (query.trim().length > 0 || searchHistory.length > 0) {
      setShowResults(true);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    
    // 调用自定义回调（如果提供）
    if (onResultClick) {
      onResultClick(result);
      return;
    }
    
    // 使用内置导航逻辑
    handleSearchResultClick(result, router);
  };

  const handleResultHover = (result: SearchResult) => {
    const resultKey = `${result.table_name}-${result.record_id}`;
    setHoveredResult(resultKey);
    
    // 预加载页面
    preloadSearchResult(result, router);
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    handleSearch(historyQuery);
    setShowResults(true);
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

  return (
    <div ref={searchRef} className={cn("relative w-full", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder || getSearchTranslation('UniversalSearch.placeholder', 'Search courses, lessons, posts, users...')}
          className="pl-10 pr-12 bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400/20"
        />
        
        {/* Filter Button */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {hasActiveFilters && (
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 text-xs px-1 py-0">
              {selectedTables.length + (context !== 'general' ? 1 : 0)}
            </Badge>
          )}
          <DropdownMenu open={showFilters} onOpenChange={setShowFilters}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
              >
                <Filter className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-gray-900/95 backdrop-blur-sm border-white/20 z-[110]">
              <DropdownMenuLabel className="text-white">{getSearchTranslation('UniversalSearch.filters', 'Filters')}</DropdownMenuLabel>
              
              {/* Context Filter */}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-white/70 text-xs">{getSearchTranslation('UniversalSearch.context', 'Context')}</DropdownMenuLabel>
              {[
                { id: 'general', label: 'General' },
                { id: 'learning', label: 'Learning' },
                { id: 'teaching', label: 'Teaching' },
              ].map((ctx) => (
                <DropdownMenuItem
                  key={ctx.id}
                  onClick={() => setContext(ctx.id as any)}
                  className={cn(
                    "text-white hover:bg-white/10",
                    context === ctx.id && "bg-blue-500/20"
                  )}
                >
                  {ctx.label}
                </DropdownMenuItem>
              ))}

              {/* Content Type Filters */}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-white/70 text-xs">{getSearchTranslation('UniversalSearch.content_types', 'Content Types')}</DropdownMenuLabel>
              {contentTypes.map((type) => (
                <DropdownMenuItem
                  key={type.id}
                  onClick={() => toggleContentType(type.id)}
                  className={cn(
                    "text-white hover:bg-white/10 flex items-center gap-2",
                    selectedTables.some(table => table.includes(type.id)) && "bg-blue-500/20"
                  )}
                >
                  <span>{type.icon}</span>
                  {type.label}
                </DropdownMenuItem>
              ))}

              {hasActiveFilters && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={clearFilters}
                    className="text-red-400 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {getSearchTranslation('UniversalSearch.clear_filters', 'Clear Filters')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 z-[100] bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-2xl max-h-96 overflow-hidden"
          >
            {/* Loading State */}
            {isLoading && (
              <div className="p-4 flex items-center justify-center text-white/70">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {getSearchTranslation('UniversalSearch.searching', 'Searching...')}
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 text-red-400 text-sm">
                {getSearchTranslation('UniversalSearch.search_error', 'Search failed. Please try again.')}
              </div>
            )}

            {/* Search History (when no query) */}
            {!query.trim() && searchHistory.length > 0 && (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1 text-white/70 text-xs">
                  <span className="flex items-center gap-1">
                    <History className="w-3 h-3" />
                    {getSearchTranslation('UniversalSearch.recent_searches', 'Recent Searches')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="h-5 px-1 text-white/50 hover:text-white/70"
                  >
                    {getSearchTranslation('UniversalSearch.clear', 'Clear')}
                  </Button>
                </div>
                <div className="space-y-1">
                  {searchHistory.slice(0, 5).map((historyQuery, index) => (
                    <button
                      key={index}
                      onClick={() => handleHistoryClick(historyQuery)}
                      className="w-full text-left px-3 py-2 text-white/80 hover:bg-white/10 rounded-lg text-sm transition-colors"
                    >
                      <Clock className="w-3 h-3 inline mr-2 text-white/50" />
                      {historyQuery}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.data && query.trim() && (
              <div className="max-h-80 overflow-y-auto">
                {searchResults.data.results.length === 0 ? (
                  <div className="p-4 text-white/70 text-center">
                    {getSearchTranslation('UniversalSearch.no_results', 'No results found')}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {/* Results Summary */}
                    <div className="px-2 py-1 text-white/50 text-xs flex items-center justify-between">
                      <span>
                        {getSearchTranslation('UniversalSearch.results_count', `${searchResults.data.stats.total_results} results`).replace('{count}', searchResults.data.stats.total_results.toString())}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {searchResults.data.stats.content_types} {getSearchTranslation('UniversalSearch.types', 'types')}
                      </span>
                    </div>

                    {/* Results List */}
                    {searchResults.data.results.slice(0, 8).map((result, index) => {
                      const resultKey = `${result.table_name}-${result.record_id}`;
                      const isHovered = hoveredResult === resultKey;
                      const previewInfo = getResultPreviewInfo(result);
                      const contentInfo = getContentTypeInfo(result.content_type);
                      const smartSnippet = createSmartExcerpt(result.snippet, query, 120);

                      return (
                        <motion.button
                          key={resultKey}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleResultClick(result)}
                          onMouseEnter={() => handleResultHover(result)}
                          onMouseLeave={() => setHoveredResult(null)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg transition-all duration-200 group relative",
                            isHovered 
                              ? "bg-blue-500/10 border border-blue-400/30" 
                              : "hover:bg-white/10 border border-transparent"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Content Type Icon */}
                            <div className="flex-shrink-0 mt-0.5">
                              <div className={cn(
                                "p-1.5 rounded-md transition-colors",
                                isHovered 
                                  ? contentTypeColors[result.content_type]?.replace('/20', '/30') || 'bg-gray-500/30'
                                  : contentTypeColors[result.content_type] || 'bg-gray-500/20'
                              )}>
                                {contentTypeIcons[result.content_type] || <FileText className="w-4 h-4" />}
                              </div>
                            </div>

                            {/* Content Details */}
                            <div className="flex-1 min-w-0">
                              {/* Title and Badge */}
                              <div className="flex items-center gap-2 mb-1">
                                <SearchTitle
                                  text={result.title}
                                  searchQuery={query}
                                  className={cn(
                                    "truncate transition-colors",
                                    isHovered ? "text-blue-300" : "text-white"
                                  )}
                                />
                                <Badge 
                                  className={cn(
                                    "text-xs whitespace-nowrap",
                                    contentTypeColors[result.content_type] || 'bg-gray-500/20 text-gray-300'
                                  )}
                                >
                                  {contentInfo.label}
                                </Badge>
                              </div>

                              {/* Primary Info (Author, Instructor, etc.) */}
                              {previewInfo.primaryInfo && (
                                <div className="text-white/60 text-xs mb-1 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>{previewInfo.primaryInfo}</span>
                                  {previewInfo.secondaryInfo && (
                                    <>
                                      <span>•</span>
                                      <span>{previewInfo.secondaryInfo}</span>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Snippet with Highlighting */}
                              <SearchSnippet
                                text={smartSnippet}
                                searchQuery={query}
                                className="mb-2 line-clamp-2"
                              />

                              {/* Metadata and Stats */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-white/50 text-xs">
                                  <span className="flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    {(result.rank * 100).toFixed(0)}%
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(result.created_at).toLocaleDateString()}
                                  </span>
                                  {previewInfo.metadata.rating && (
                                    <span className="flex items-center gap-1">
                                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                      {previewInfo.metadata.rating.toFixed(1)}
                                    </span>
                                  )}
                                </div>

                                {/* Quick Preview Indicator */}
                                {isHovered && (
                                  <div className="flex items-center gap-1 text-blue-400 text-xs">
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Open</span>
                                  </div>
                                )}
                              </div>

                              {/* Additional Metadata on Hover */}
                              {isHovered && previewInfo.tertiaryInfo && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="mt-2 pt-2 border-t border-white/10"
                                >
                                  <div className="flex items-center gap-2 text-white/60 text-xs">
                                    <Eye className="w-3 h-3" />
                                    <span>{previewInfo.tertiaryInfo}</span>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </div>

                          {/* Hover Effect Border */}
                          {isHovered && (
                            <motion.div
                              layoutId="search-result-border"
                              className="absolute inset-0 border-2 border-blue-400/50 rounded-lg pointer-events-none"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                            />
                          )}
                        </motion.button>
                      );
                    })}

                    {/* View All Results */}
                    {searchResults.data.results.length > 8 && (
                      <div className="pt-2 border-t border-white/10">
                        <Button 
                          variant="ghost" 
                          className="w-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          onClick={() => {
                            setShowResults(false);
                            // Navigate to full search results page
                            const params = new URLSearchParams({
                              q: query,
                              context: context || 'general'
                            });
                            
                            if (selectedTables.length > 0) {
                              // Convert table names back to content types
                              const reverseTableMap: Record<string, string> = {
                                'course': 'course',
                                'course_lesson': 'lesson',
                                'community_post': 'post',
                                'community_comment': 'comment',
                                'profiles': 'user',
                                'classroom': 'classroom',
                                'community_group': 'group',
                                'course_notes': 'note',
                                'community_quiz': 'quiz',
                                'tutoring_tutors': 'tutor',
                                'announcements': 'announcement',
                              };
                              
                              const contentTypes = selectedTables
                                .map(table => reverseTableMap[table])
                                .filter(Boolean);
                              
                              if (contentTypes.length > 0) {
                                params.set('types', contentTypes.join(','));
                              }
                            }
                            
                            router.push(`/search?${params.toString()}`);
                          }}
                        >
                          {getSearchTranslation('UniversalSearch.view_all', `View ${searchResults.data.results.length - 8} more results`).replace('{count}', (searchResults.data.results.length - 8).toString())}
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
