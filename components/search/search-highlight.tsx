'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface HighlightTextProps {
  text: string;
  searchQuery: string;
  className?: string;
  highlightClassName?: string;
  caseSensitive?: boolean;
  wholeWordsOnly?: boolean;
  maxLength?: number;
}

/**
 * 高亮搜索关键词组件
 */
export function HighlightText({
  text,
  searchQuery,
  className,
  highlightClassName = "bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 px-0.5 rounded",
  caseSensitive = false,
  wholeWordsOnly = false,
  maxLength
}: HighlightTextProps) {
  if (!searchQuery.trim() || !text) {
    const displayText = maxLength && text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;
    return <span className={className}>{displayText}</span>;
  }

  // 预处理文本长度
  let processedText = text;
  let wasTruncated = false;
  
  if (maxLength && text.length > maxLength) {
    // 尝试在高亮词附近截取文本
    const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();
    const searchText = caseSensitive ? text : text.toLowerCase();
    const matchIndex = searchText.indexOf(query);
    
    if (matchIndex !== -1) {
      // 在匹配词周围保留上下文
      const contextLength = Math.floor((maxLength - searchQuery.length) / 2);
      const start = Math.max(0, matchIndex - contextLength);
      const end = Math.min(text.length, matchIndex + searchQuery.length + contextLength);
      
      processedText = (start > 0 ? '...' : '') + 
                     text.substring(start, end) + 
                     (end < text.length ? '...' : '');
      wasTruncated = true;
    } else {
      processedText = text.substring(0, maxLength) + '...';
      wasTruncated = true;
    }
  }

  // 创建正则表达式进行高亮
  const searchTerms = searchQuery
    .trim()
    .split(/\s+/)
    .filter(term => term.length > 0)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // 转义特殊字符

  if (searchTerms.length === 0) {
    return <span className={className}>{processedText}</span>;
  }

  // 构建正则表达式
  const pattern = wholeWordsOnly 
    ? `\\b(${searchTerms.join('|')})\\b`
    : `(${searchTerms.join('|')})`;
  
  const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
  
  // 分割文本并高亮匹配部分
  const parts = processedText.split(regex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = searchTerms.some(term => 
          caseSensitive 
            ? part === term 
            : part.toLowerCase() === term.toLowerCase()
        );
        
        return isMatch ? (
          <mark 
            key={index} 
            className={cn(highlightClassName, "font-medium")}
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </span>
  );
}

/**
 * 搜索结果片段高亮组件
 */
export function SearchSnippet({
  text,
  searchQuery,
  maxLength = 150,
  className
}: {
  text: string;
  searchQuery: string;
  maxLength?: number;
  className?: string;
}) {
  return (
    <HighlightText
      text={text}
      searchQuery={searchQuery}
      maxLength={maxLength}
      className={cn("text-sm text-gray-600 dark:text-gray-400", className)}
      highlightClassName="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded font-medium"
    />
  );
}

/**
 * 搜索结果标题高亮组件
 */
export function SearchTitle({
  text,
  searchQuery,
  className
}: {
  text: string;
  searchQuery: string;
  className?: string;
}) {
  return (
    <HighlightText
      text={text}
      searchQuery={searchQuery}
      className={cn("font-semibold text-gray-900 dark:text-gray-100", className)}
      highlightClassName="bg-yellow-200 dark:bg-yellow-800/50 text-yellow-900 dark:text-yellow-100 px-1 py-0.5 rounded font-bold"
      wholeWordsOnly={false}
    />
  );
}

/**
 * 高级搜索结果高亮工具函数
 */
export function getHighlightedMatches(text: string, searchQuery: string): {
  matchCount: number;
  matchPositions: Array<{ start: number; end: number; term: string }>;
  score: number;
} {
  if (!searchQuery.trim() || !text) {
    return { matchCount: 0, matchPositions: [], score: 0 };
  }

  const searchTerms = searchQuery
    .trim()
    .split(/\s+/)
    .filter(term => term.length > 0);

  const matchPositions: Array<{ start: number; end: number; term: string }> = [];
  let totalMatches = 0;

  const lowerText = text.toLowerCase();

  searchTerms.forEach(term => {
    const lowerTerm = term.toLowerCase();
    let index = 0;
    
    while ((index = lowerText.indexOf(lowerTerm, index)) !== -1) {
      matchPositions.push({
        start: index,
        end: index + term.length,
        term: text.substring(index, index + term.length)
      });
      totalMatches++;
      index += term.length;
    }
  });

  // 计算匹配分数 (考虑匹配数量、位置、完整性等)
  const score = calculateMatchScore(text, searchQuery, matchPositions);

  // 按位置排序
  matchPositions.sort((a, b) => a.start - b.start);

  return {
    matchCount: totalMatches,
    matchPositions,
    score
  };
}

/**
 * 计算搜索匹配分数
 */
function calculateMatchScore(
  text: string, 
  searchQuery: string, 
  matches: Array<{ start: number; end: number; term: string }>
): number {
  if (matches.length === 0) return 0;

  const queryLength = searchQuery.length;
  const textLength = text.length;
  
  let score = 0;

  // 基础匹配分数
  score += matches.length * 10;

  // 位置分数 (越靠前分数越高)
  matches.forEach((match, index) => {
    const positionFactor = 1 - (match.start / textLength);
    score += positionFactor * 5;
  });

  // 完整词匹配加分
  matches.forEach(match => {
    const isCompleteWord = (
      (match.start === 0 || !/\w/.test(text[match.start - 1])) &&
      (match.end === textLength || !/\w/.test(text[match.end]))
    );
    
    if (isCompleteWord) {
      score += 5;
    }
  });

  // 查询覆盖率加分
  const totalMatchLength = matches.reduce((sum, match) => sum + (match.end - match.start), 0);
  const coverageRatio = totalMatchLength / queryLength;
  score += coverageRatio * 10;

  return Math.round(score * 100) / 100;
}

/**
 * 智能文本截取，保留搜索关键词上下文
 */
export function createSmartExcerpt(
  text: string,
  searchQuery: string,
  maxLength: number = 200,
  contextLength: number = 50
): string {
  if (!searchQuery.trim() || text.length <= maxLength) {
    return text;
  }

  const { matchPositions } = getHighlightedMatches(text, searchQuery);
  
  if (matchPositions.length === 0) {
    return text.substring(0, maxLength) + '...';
  }

  // 找到最重要的匹配位置 (通常是第一个)
  const primaryMatch = matchPositions[0];
  
  // 计算截取范围
  const matchCenter = Math.floor((primaryMatch.start + primaryMatch.end) / 2);
  const excerptStart = Math.max(0, matchCenter - Math.floor(maxLength / 2));
  const excerptEnd = Math.min(text.length, excerptStart + maxLength);
  
  // 调整开始位置以避免在单词中间截断
  let adjustedStart = excerptStart;
  if (adjustedStart > 0 && /\w/.test(text[adjustedStart]) && /\w/.test(text[adjustedStart - 1])) {
    while (adjustedStart > 0 && /\w/.test(text[adjustedStart - 1])) {
      adjustedStart--;
    }
  }
  
  // 调整结束位置
  let adjustedEnd = excerptEnd;
  if (adjustedEnd < text.length && /\w/.test(text[adjustedEnd]) && /\w/.test(text[adjustedEnd - 1])) {
    while (adjustedEnd < text.length && /\w/.test(text[adjustedEnd])) {
      adjustedEnd++;
    }
  }
  
  let excerpt = text.substring(adjustedStart, adjustedEnd);
  
  // 添加省略号
  if (adjustedStart > 0) {
    excerpt = '...' + excerpt;
  }
  if (adjustedEnd < text.length) {
    excerpt = excerpt + '...';
  }
  
  return excerpt;
}
