import { SupportedLocale, isSupportedLocale, getDefaultLocale } from './translation-utils';

/**
 * Search query parameters for quiz search
 */
export interface QuizSearchParams {
  query?: string;
  locale?: string;
  subject_id?: number;
  grade_id?: number;
  difficulty?: number;
  visibility?: 'public' | 'private';
  author_id?: string;
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'created_at' | 'popularity';
  order?: 'asc' | 'desc';
}

/**
 * Sanitize search query to prevent SQL injection in full-text search
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Remove special characters that could interfere with tsquery
  // Keep only alphanumeric, spaces, and common punctuation
  return query
    .replace(/[^\w\s\u4e00-\u9fff\u0100-\u017f\u1e00-\u1eff]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build PostgreSQL tsquery string for full-text search
 */
export function buildTsQuery(query: string, locale: SupportedLocale = 'en'): string {
  const sanitized = sanitizeSearchQuery(query);
  if (!sanitized) {
    return '';
  }

  // Split into words and join with & (AND operator)
  const words = sanitized.split(/\s+/).filter(word => word.length > 0);
  
  if (words.length === 0) {
    return '';
  }

  // For Chinese, use simple search without stemming
  if (locale === 'zh') {
    return words.map(word => `'${word}'`).join(' & ');
  }

  // For English and other languages, use plainto_tsquery format
  return words.join(' & ');
}

/**
 * Get the appropriate search vector column name for a locale
 */
export function getSearchVectorColumn(locale: string): string {
  const supportedLocale = isSupportedLocale(locale) ? locale : getDefaultLocale();
  return `search_vector_${supportedLocale}`;
}

/**
 * Get the appropriate PostgreSQL text search configuration for a locale
 */
export function getTextSearchConfig(locale: string): string {
  switch (locale) {
    case 'en':
      return 'english';
    case 'zh':
    case 'ms':
    default:
      return 'simple';
  }
}

/**
 * Build search query parameters for API calls
 */
export function buildSearchQueryParams(params: QuizSearchParams): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  return searchParams;
}

/**
 * Parse search query parameters from URL
 */
export function parseSearchQueryParams(searchParams: URLSearchParams): QuizSearchParams {
  const params: QuizSearchParams = {};

  const query = searchParams.get('query');
  if (query) params.query = query;

  const locale = searchParams.get('locale');
  if (locale) params.locale = locale;

  const subjectId = searchParams.get('subject_id');
  if (subjectId) params.subject_id = parseInt(subjectId, 10);

  const gradeId = searchParams.get('grade_id');
  if (gradeId) params.grade_id = parseInt(gradeId, 10);

  const difficulty = searchParams.get('difficulty');
  if (difficulty) params.difficulty = parseInt(difficulty, 10);

  const visibility = searchParams.get('visibility');
  if (visibility === 'public' || visibility === 'private') {
    params.visibility = visibility;
  }

  const authorId = searchParams.get('author_id');
  if (authorId) params.author_id = authorId;

  const limit = searchParams.get('limit');
  if (limit) params.limit = parseInt(limit, 10);

  const offset = searchParams.get('offset');
  if (offset) params.offset = parseInt(offset, 10);

  const sort = searchParams.get('sort');
  if (sort === 'relevance' || sort === 'created_at' || sort === 'popularity') {
    params.sort = sort;
  }

  const order = searchParams.get('order');
  if (order === 'asc' || order === 'desc') {
    params.order = order;
  }

  return params;
}

/**
 * Validate search parameters
 */
export function validateSearchParams(params: QuizSearchParams): string[] {
  const errors: string[] = [];

  if (params.limit !== undefined && (params.limit < 1 || params.limit > 100)) {
    errors.push('Limit must be between 1 and 100');
  }

  if (params.offset !== undefined && params.offset < 0) {
    errors.push('Offset must be non-negative');
  }

  if (params.difficulty !== undefined && (params.difficulty < 1 || params.difficulty > 5)) {
    errors.push('Difficulty must be between 1 and 5');
  }

  if (params.subject_id !== undefined && params.subject_id < 1) {
    errors.push('Subject ID must be positive');
  }

  if (params.grade_id !== undefined && params.grade_id < 1) {
    errors.push('Grade ID must be positive');
  }

  return errors;
}

/**
 * Default search parameters
 */
export const DEFAULT_SEARCH_PARAMS: Required<Pick<QuizSearchParams, 'limit' | 'offset' | 'sort' | 'order'>> = {
  limit: 20,
  offset: 0,
  sort: 'relevance',
  order: 'desc'
};

/**
 * Highlight search terms in text (for frontend display)
 */
export function highlightSearchTerms(text: string, query: string, className: string = 'highlight'): string {
  if (!query || !text) {
    return text;
  }

  const sanitized = sanitizeSearchQuery(query);
  const words = sanitized.split(/\s+/).filter(word => word.length > 0);

  if (words.length === 0) {
    return text;
  }

  // Create regex pattern for highlighting
  const pattern = new RegExp(`(${words.map(word => 
    word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|')})`, 'gi');

  return text.replace(pattern, `<span class="${className}">$1</span>`);
}
