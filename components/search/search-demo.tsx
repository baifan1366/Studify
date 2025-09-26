'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  BookOpen, 
  Users, 
  MessageCircle, 
  GraduationCap,
  FileText,
  Award
} from 'lucide-react';
import UniversalSearch from './universal-search';
import { SearchResult } from '@/hooks/search/use-universal-search';

export default function SearchDemo() {
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);

  const handleResultClick = (result: SearchResult) => {
    setSelectedResult(result);
    setSearchHistory(prev => {
      const newHistory = [result, ...prev.filter(r => r.record_id !== result.record_id)];
      return newHistory.slice(0, 5); // Keep only last 5 results
    });
  };

  const contentTypeIcons: Record<string, React.ReactNode> = {
    course: <BookOpen className="w-4 h-4" />,
    lesson: <GraduationCap className="w-4 h-4" />,
    post: <MessageCircle className="w-4 h-4" />,
    user: <Users className="w-4 h-4" />,
    note: <FileText className="w-4 h-4" />,
    quiz: <Award className="w-4 h-4" />,
  };

  const contentTypeColors: Record<string, string> = {
    course: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    lesson: 'bg-green-500/20 text-green-300 border-green-400/30',
    post: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    user: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
    note: 'bg-gray-500/20 text-gray-300 border-gray-400/30',
    quiz: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            🔍 Universal Search Demo
          </h1>
          <p className="text-white/70 text-lg">
            Test the comprehensive search functionality across all content types
          </p>
        </motion.div>

        {/* Search Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Search className="w-5 h-5" />
                Universal Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UniversalSearch
                placeholder="Search courses, lessons, posts, users, and more..."
                onResultClick={handleResultClick}
              />
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Selected Result */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Selected Result</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedResult ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {contentTypeIcons[selectedResult.content_type] || <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-semibold">
                            {selectedResult.title}
                          </h3>
                          <Badge 
                            className={
                              contentTypeColors[selectedResult.content_type] || 
                              'bg-gray-500/20 text-gray-300'
                            }
                          >
                            {selectedResult.content_type}
                          </Badge>
                        </div>
                        <p className="text-white/70 text-sm mb-3">
                          {selectedResult.snippet}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-white/50">Relevance:</span>
                            <span className="text-white ml-1">
                              {(selectedResult.rank * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-white/50">Table:</span>
                            <span className="text-white ml-1">
                              {selectedResult.table_name}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/50">ID:</span>
                            <span className="text-white ml-1">
                              {selectedResult.record_id}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/50">Created:</span>
                            <span className="text-white ml-1">
                              {new Date(selectedResult.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Additional Data */}
                        {selectedResult.additional_data && Object.keys(selectedResult.additional_data).length > 0 && (
                          <div className="mt-3 p-3 bg-white/5 rounded-lg">
                            <h4 className="text-white/70 text-xs font-medium mb-2">Additional Data:</h4>
                            <pre className="text-white/60 text-xs overflow-x-auto">
                              {JSON.stringify(selectedResult.additional_data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/50">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Click on a search result to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Search History */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Recent Results</CardTitle>
              </CardHeader>
              <CardContent>
                {searchHistory.length > 0 ? (
                  <div className="space-y-3">
                    {searchHistory.map((result, index) => (
                      <motion.button
                        key={`${result.table_name}-${result.record_id}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setSelectedResult(result)}
                        className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-shrink-0">
                            {contentTypeIcons[result.content_type] || <FileText className="w-3 h-3" />}
                          </div>
                          <span className="text-white text-sm font-medium truncate">
                            {result.title}
                          </span>
                          <Badge 
                            className={`text-xs ${contentTypeColors[result.content_type] || 'bg-gray-500/20 text-gray-300'}`}
                          >
                            {result.content_type}
                          </Badge>
                        </div>
                        <p className="text-white/60 text-xs line-clamp-2">
                          {result.snippet}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/50">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Your search history will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">How to Test</CardTitle>
            </CardHeader>
            <CardContent className="text-white/70">
              <div className="space-y-3">
                <div>
                  <h4 className="text-white font-medium mb-1">1. Basic Search</h4>
                  <p className="text-sm">Type any keywords to search across all content types</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">2. Use Filters</h4>
                  <p className="text-sm">Click the filter icon to narrow down by content type or context</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">3. View Results</h4>
                  <p className="text-sm">Click on any search result to view detailed information</p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">4. Search History</h4>
                  <p className="text-sm">Your recent searches are saved and can be accessed from the history</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
