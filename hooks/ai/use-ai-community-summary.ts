import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Types for AI Summary
export interface Citation {
  postId: string | number;
  title: string;
  slug: string;
  snippet: string;
  relevanceScore?: number;
}

export interface Theme {
  title: string;
  points: string[];
}

export interface SummaryResult {
  success: boolean;
  summary: string;
  bullets: string[];
  themes?: Theme[];
  citations: Citation[];
  tldr?: string; // Summary at a Glance - concise one-liner
  meta: {
    mode: 'search' | 'post';
    itemCount: number;
    processingTimeMs: number;
    model: string;
    tokens?: number;
    locale: 'en' | 'zh';
  };
}

export interface SearchSummaryParams {
  query: string;
  resultIds?: Array<string | number>;
  maxItems?: number;
  locale?: 'en' | 'zh';
  includeCitations?: boolean;
}

export interface PostSummaryParams {
  postId?: number;
  postSlug?: string;
  includeComments?: boolean;
  includeRelatedContext?: boolean;
  locale?: 'en' | 'zh';
  includeCitations?: boolean;
}

// Helper function to save AI interaction to history (reused from use-ai-quick-actions.ts)
async function saveToHistory({
  featureType,
  inputData,
  result,
  executionTimeMs = 0,
  metadata = {}
}: {
  featureType: string;
  inputData: any;
  result: any;
  executionTimeMs?: number;
  metadata?: any;
}) {
  try {
    await fetch('/api/ai/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featureType,
        inputData,
        result,
        executionTimeMs,
        metadata
      })
    });
  } catch (error) {
    console.warn('Failed to save AI interaction to history:', error);
    // Don't throw error here to avoid breaking the main flow
  }
}

// AI Search Results Summary Hook
export function useAISummarizeSearch() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: SearchSummaryParams): Promise<SummaryResult> => {
      const startTime = Date.now();
      
      const requestData = {
        mode: 'search' as const,
        query: params.query,
        resultIds: params.resultIds,
        maxItems: params.maxItems || 10,
        locale: params.locale || 'en',
        includeCitations: params.includeCitations !== false // default true
      };

      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'AI search summary request failed');
      }

      const result = await response.json();
      const executionTime = Date.now() - startTime;

      // Save to history
      await saveToHistory({
        featureType: 'community_summary_search',
        inputData: {
          query: params.query,
          resultCount: params.resultIds?.length || 0,
          maxItems: params.maxItems || 10,
          locale: params.locale || 'en',
          hasResultIds: !!params.resultIds
        },
        result,
        executionTimeMs: executionTime,
        metadata: { 
          locale: params.locale || 'en',
          mode: 'search'
        }
      });

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ AI Summary Complete",
        description: `Generated summary from ${data.meta.itemCount} posts with ${data.citations.length} citations`,
      });
    },
    onError: (error) => {
      console.error('Search summary error:', error);
      toast({
        title: "❌ Summary Failed",
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: "destructive"
      });
    }
  });
}

// AI Post Summary Hook
export function useAISummarizePost() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: PostSummaryParams): Promise<SummaryResult> => {
      const startTime = Date.now();
      
      if (!params.postId && !params.postSlug) {
        throw new Error('Either postId or postSlug is required');
      }

      const requestData = {
        mode: 'post' as const,
        postId: params.postId,
        postSlug: params.postSlug,
        includeComments: params.includeComments || false,
        includeRelatedContext: params.includeRelatedContext !== false, // default true
        locale: params.locale || 'en',
        includeCitations: params.includeCitations !== false // default true
      };

      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'AI post summary request failed');
      }

      const result = await response.json();
      const executionTime = Date.now() - startTime;

      // Save to history
      await saveToHistory({
        featureType: 'community_summary_post',
        inputData: {
          postId: params.postId,
          postSlug: params.postSlug,
          includeComments: params.includeComments || false,
          includeRelatedContext: params.includeRelatedContext !== false,
          locale: params.locale || 'en'
        },
        result,
        executionTimeMs: executionTime,
        metadata: { 
          locale: params.locale || 'en',
          mode: 'post'
        }
      });

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Post Summary Complete",
        description: `Generated summary with ${data.bullets.length} key points`,
      });
    },
    onError: (error) => {
      console.error('Post summary error:', error);
      toast({
        title: "❌ Summary Failed",
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: "destructive"
      });
    }
  });
}

// AI Summary Capabilities Hook (for discovering available features)
export function useAISummaryCapabilities() {
  return useQuery({
    queryKey: ['ai-summary-capabilities'],
    queryFn: async () => {
      const response = await fetch('/api/ai/summary');
      if (!response.ok) {
        throw new Error('Failed to fetch AI summary capabilities');
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  });
}

// AI Summary State Management Hook
export function useAISummaryState() {
  const [activeMode, setActiveMode] = useState<'search' | 'post' | null>(null);
  const [summaryResults, setSummaryResults] = useState<Record<string, SummaryResult>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const saveSummaryResult = (key: string, result: SummaryResult) => {
    setSummaryResults(prev => ({
      ...prev,
      [key]: result
    }));
  };

  const clearSummaryResult = (key: string) => {
    setSummaryResults(prev => {
      const newResults = { ...prev };
      delete newResults[key];
      return newResults;
    });
  };

  const clearAllSummaryResults = () => {
    setSummaryResults({});
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const isSectionExpanded = (sectionKey: string) => {
    return expandedSections[sectionKey] || false;
  };

  return {
    activeMode,
    setActiveMode,
    summaryResults,
    saveSummaryResult,
    clearSummaryResult,
    clearAllSummaryResults,
    getSummaryResult: (key: string) => summaryResults[key],
    // UI state management
    expandedSections,
    toggleSection,
    isSectionExpanded,
    // Utility functions
    generateSummaryKey: (mode: 'search' | 'post', identifier: string) => `${mode}-${identifier}`,
    copyToClipboard: async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.warn('Failed to copy to clipboard:', error);
        return false;
      }
    }
  };
}

// Combined hook for easier usage
export function useAICommunitySummary() {
  const searchSummary = useAISummarizeSearch();
  const postSummary = useAISummarizePost();
  const capabilities = useAISummaryCapabilities();
  const state = useAISummaryState();

  return {
    // Mutation hooks
    searchSummary,
    postSummary,
    // Query hooks
    capabilities,
    // State management
    state,
    // Convenience methods
    summarizeSearch: searchSummary.mutate,
    summarizePost: postSummary.mutate,
    // Loading states
    isLoading: searchSummary.isPending || postSummary.isPending,
    isSearching: searchSummary.isPending,
    isSummarizingPost: postSummary.isPending,
    // Error states
    searchError: searchSummary.error,
    postError: postSummary.error,
    // Success states
    searchResult: searchSummary.data,
    postResult: postSummary.data,
    // Reset functions
    resetSearch: searchSummary.reset,
    resetPost: postSummary.reset,
    resetAll: () => {
      searchSummary.reset();
      postSummary.reset();
      state.clearAllSummaryResults();
    }
  };
}

// Utility hook for formatting summary content
export function useSummaryFormatter() {
  const formatBullets = (bullets: string[]): string => {
    return bullets.map(bullet => `• ${bullet}`).join('\n');
  };

  const formatThemes = (themes: Theme[]): string => {
    return themes.map(theme => 
      `**${theme.title}**\n${theme.points.map(point => `  • ${point}`).join('\n')}`
    ).join('\n\n');
  };

  const formatCitations = (citations: Citation[]): string => {
    return citations.map((citation, index) => 
      `[${index + 1}] ${citation.title}\n   ${citation.snippet}`
    ).join('\n\n');
  };

  const formatFullSummary = (result: SummaryResult): string => {
    let formatted = `# AI Summary\n\n${result.summary}\n\n`;
    
    if (result.bullets.length > 0) {
      formatted += `## Key Points\n${formatBullets(result.bullets)}\n\n`;
    }
    
    if (result.themes && result.themes.length > 0) {
      formatted += `## Themes\n${formatThemes(result.themes)}\n\n`;
    }
    
    if (result.citations.length > 0) {
      formatted += `## Sources\n${formatCitations(result.citations)}`;
    }
    
    return formatted;
  };

  return {
    formatBullets,
    formatThemes,
    formatCitations,
    formatFullSummary
  };
}
