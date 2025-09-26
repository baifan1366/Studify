// Temporary translation file for search components
// These should be added to messages/en.json under the respective sections

export const searchTranslations = {
  Dashboard: {
    search_title: "Quick Search",
    search_description: "Search across courses, lessons, posts, users, and more",
    search_placeholder: "Search courses, lessons, posts, users..."
  },
  UniversalSearch: {
    placeholder: "Search courses, lessons, posts, users...",
    searching: "Searching...",
    search_error: "Search failed. Please try again.",
    recent_searches: "Recent Searches",
    clear: "Clear",
    no_results: "No results found",
    results_count: "{count} results",
    types: "types",
    relevance: "relevance",
    view_all: "View {count} more results",
    filters: "Filters",
    context: "Context",
    content_types: "Content Types",
    clear_filters: "Clear Filters"
  }
};

// Helper function to get translation with fallback
export function getSearchTranslation(key: string, fallback: string): string {
  const keys = key.split('.');
  let value: any = searchTranslations;
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || fallback;
}
