import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { searchSimilarContent, CONTENT_TYPES } from '@/lib/langChain/vectorstore';

// POST /api/embeddings/search - Semantic search across content
export async function POST(request: NextRequest) {
  try {
    // Authorize user (any authenticated user can search)
    const user = await authorize('student');

    const body = await request.json();
    const { 
      query, 
      contentTypes, 
      maxResults = 10, 
      similarityThreshold = 0.7 
    } = body;

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (maxResults && (typeof maxResults !== 'number' || maxResults < 1 || maxResults > 100)) {
      return NextResponse.json(
        { error: 'maxResults must be a number between 1 and 100' },
        { status: 400 }
      );
    }

    if (similarityThreshold && (typeof similarityThreshold !== 'number' || similarityThreshold < 0 || similarityThreshold > 1)) {
      return NextResponse.json(
        { error: 'similarityThreshold must be a number between 0 and 1' },
        { status: 400 }
      );
    }

    // Validate content types
    const validContentTypes = Object.values(CONTENT_TYPES);
    if (contentTypes && Array.isArray(contentTypes)) {
      const invalidTypes = contentTypes.filter(type => !validContentTypes.includes(type));
      if (invalidTypes.length > 0) {
        return NextResponse.json(
          { error: `Invalid content types: ${invalidTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Perform search
    const results = await searchSimilarContent(
      query.trim(),
      contentTypes,
      maxResults
    );

    // Return results
    return NextResponse.json({
      query: query.trim(),
      results,
      count: results.length,
      contentTypes: contentTypes || 'all',
      maxResults,
      similarityThreshold
    });

  } catch (error) {
    console.error('Error in embedding search:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
