"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAICommunitySummary, useSummaryFormatter } from "@/hooks/ai/use-ai-community-summary";
import { cn } from "@/utils/styles";
import { FileText, RefreshCw, Copy, List, Link as LinkIcon, ChevronDown, ChevronUp } from "lucide-react";

// Animation variants for smooth transitions
const detailsVariants = {
  hidden: {
    opacity: 0,
    height: 0,
    overflow: 'hidden' as const,
    transition: {
      duration: 0.3,
      ease: [0.4, 0.0, 0.2, 1] as const
    }
  },
  visible: {
    opacity: 1,
    height: 'auto' as const,
    overflow: 'visible' as const,
    transition: {
      duration: 0.3,
      ease: [0.4, 0.0, 0.2, 1] as const
    }
  }
};

const buttonVariants = {
  hidden: { 
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 }
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, delay: 0.1 }
  }
};

interface AISummaryCardProps {
  query: string;
  resultIds: Array<string | number>;
  locale?: "en" | "zh";
  className?: string;
}

export default function AISummaryCard({ query, resultIds, locale = "en", className }: AISummaryCardProps) {
  const t = useTranslations('AISummaryCard');
  const { 
    summarizeSearch,
    isSearching,
    searchResult,
    searchError,
    state
  } = useAICommunitySummary();

  const { formatFullSummary } = useSummaryFormatter();

  const summaryKey = useMemo(() => state.generateSummaryKey("search", query || ""), [state, query]);
  // Only use saved result for gating; allow hook result as a display fallback
  const savedResultForKey = state.getSummaryResult(summaryKey);
  const cachedResult = savedResultForKey || searchResult;

  // Local state for showing/hiding detailed content
  const [showDetails, setShowDetails] = useState(false);
  // Auto summarize toggle (non-persistent)
  const [autoEnabled, setAutoEnabled] = useState(true);

  const hasQuery = query.trim().length > 0;
  const hasResults = resultIds && resultIds.length > 0;
  const disabled = !hasQuery || !hasResults || isSearching;

  // Auto-generate when enabled and there is no cached result
  useEffect(() => {
    if (!autoEnabled) return;
    if (!hasQuery || !hasResults) return;
    if (isSearching) return;
    if (savedResultForKey) return;

    summarizeSearch(
      {
        query,
        resultIds,
        maxItems: Math.min(10, resultIds.length || 10),
        locale
      },
      {
        onSuccess: (data) => {
          state.saveSummaryResult(summaryKey, data);
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEnabled, hasQuery, hasResults, isSearching, summaryKey, savedResultForKey, query, resultIds, locale]);

  const handleGenerate = () => {
    if (disabled) return;
    summarizeSearch(
      {
        query,
        resultIds,
        maxItems: Math.min(10, resultIds.length || 10),
        locale
      },
      {
        onSuccess: (data) => {
          state.saveSummaryResult(summaryKey, data);
        }
      }
    );
  };

  const handleCopy = async () => {
    if (!cachedResult) return;
    const ok = await state.copyToClipboard(formatFullSummary(cachedResult));
    // We rely on global toasts inside hooks; no local toast needed
    return ok;
  };

  const handleCopyTldr = async () => {
    if (!cachedResult?.tldr) return;
    const ok = await state.copyToClipboard(cachedResult.tldr);
    return ok;
  };

  const themesSectionKey = `${summaryKey}-themes`;
  const citationsSectionKey = `${summaryKey}-citations`;

  const toggleThemes = () => state.toggleSection(themesSectionKey);
  const toggleCitations = () => state.toggleSection(citationsSectionKey);

  const showThemes = state.isSectionExpanded(themesSectionKey);
  const showCitations = state.isSectionExpanded(citationsSectionKey);

  return (
    <Card className={cn("mb-6 border-white/10 bg-white/5", className)}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-lg sm:text-xl text-white">AI Summary</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-300">
              <span>Auto summarize</span>
              <Switch
                checked={autoEnabled}
                onCheckedChange={(v) => setAutoEnabled(!!v)}
                className="scale-90"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white"
              onClick={handleGenerate}
              disabled={disabled}
            >
              {cachedResult ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Regenerate
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-1.5" />
                  Generate
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white"
              onClick={handleCopy}
              disabled={!cachedResult}
              title={t('copy_summary')}
            >
              <Copy className="w-4 h-4 mr-1.5" /> {t('copy')}
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          {hasQuery ? (
            hasResults ? (
              <span>Generate a concise summary based on your top search results.</span>
            ) : (
              <span>No results yet. Try adjusting your search to enable summarization.</span>
            )
          ) : (
            <span>Type a query to enable AI summary.</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {/* Loading state */}
        {isSearching && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4 bg-white/10" />
            <Skeleton className="h-4 w-2/3 bg-white/10" />
            <Skeleton className="h-4 w-1/2 bg-white/10" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <Skeleton className="h-16 bg-white/10" />
              <Skeleton className="h-16 bg-white/10" />
            </div>
          </div>
        )}

        {/* Error state */}
        {!isSearching && searchError && (
          <div className="text-sm text-red-400">
            Failed to generate summary. Please try again.
          </div>
        )}

        {/* Empty state */}
        {!isSearching && !searchError && !cachedResult && (
          <div className="text-sm text-gray-400">
            No summary yet. Click Generate to create an AI summary for your search.
          </div>
        )}

        {/* Result state */}
        {!isSearching && !searchError && cachedResult && (
          <div className="space-y-4">
            {/* Summary at a Glance - shown by default */}
            {cachedResult.tldr && !showDetails && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📌</span>
                    <h4 className="text-yellow-200 font-medium text-base">Summary at a Glance</h4>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/10"
                    onClick={handleCopyTldr}
                    title={t('copy_summary_glance')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-yellow-200 text-lg font-medium leading-relaxed mb-4">
                  {cachedResult.tldr}
                </p>
                {/* Show Details Button - positioned at bottom right with animation */}
                <motion.div 
                  className="flex justify-end"
                  variants={buttonVariants}
                  initial="visible"
                  animate="visible"
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-105"
                    onClick={() => setShowDetails(true)}
                  >
                    <motion.div
                      animate={{ rotate: showDetails ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 mr-1.5" />
                    </motion.div>
                    Show Details
                  </Button>
                </motion.div>
              </div>
            )}

            {/* Detailed Content - shown when showDetails is true OR when no TLDR exists */}
            <AnimatePresence>
              {(showDetails || !cachedResult.tldr) && (
                <motion.div 
                  className="space-y-4"
                  variants={detailsVariants}
                  initial={cachedResult.tldr ? "hidden" : "visible"}
                  animate="visible"
                  exit="hidden"
                  layout
                >
                  {/* Summary paragraph */}
                  <p className="text-sm text-gray-200 leading-6 whitespace-pre-wrap">{cachedResult.summary}</p>

                {/* Bullets */}
                {cachedResult.bullets && cachedResult.bullets.length > 0 && (
                  <div>
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <List className="w-4 h-4" /> Key Points
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-200">
                      {cachedResult.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Themes (toggle) */}
                {cachedResult.themes && cachedResult.themes.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold">Themes</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleThemes}
                        className="text-gray-300 hover:text-white"
                      >
                        {showThemes ? t('hide') : t('show')}
                      </Button>
                    </div>
                    {showThemes && (
                      <div className="space-y-3">
                        {cachedResult.themes.map((th, idx) => (
                          <div key={idx} className="bg-white/5 rounded-md p-3 border border-white/10">
                            <div className="text-white font-medium mb-1">{th.title}</div>
                            <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
                              {th.points.map((p, pi) => (
                                <li key={pi}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Citations (toggle) */}
                {cachedResult.citations && cachedResult.citations.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" /> Sources
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleCitations}
                        className="text-gray-300 hover:text-white"
                      >
                        {showCitations ? t('hide') : t('show')}
                      </Button>
                    </div>
                    {showCitations && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {cachedResult.citations.map((c, i) => (
                          <Link key={i} href={`/community/${c.slug}`} className="block">
                            <div className="bg-white/5 rounded-md p-3 border border-white/10 hover:bg-white/10 transition">
                              <div className="text-sm text-white line-clamp-1">{c.title}</div>
                              <div className="text-xs text-gray-400 line-clamp-2 mt-1">{c.snippet}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                  {/* Hide Details Button - positioned at bottom right when TLDR exists and details are shown */}
                  {cachedResult.tldr && showDetails && (
                    <motion.div 
                      className="flex justify-end pt-2"
                      variants={buttonVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-105"
                        onClick={() => setShowDetails(false)}
                      >
                        <motion.div
                          animate={{ rotate: showDetails ? 0 : 180 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronUp className="w-4 h-4 mr-1.5" />
                        </motion.div>
                        Hide Details
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
