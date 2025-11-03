import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const tables = searchParams.get('tables')?.split(',') || [];
    const maxResults = parseInt(searchParams.get('limit') || '20');
    const minRank = parseFloat(searchParams.get('min_rank') || '0.1');
    const context = searchParams.get('context') || 'general';
    const userRole = searchParams.get('user_role') || 'student';

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Use universal_search function
    const searchFunction = 'universal_search';

    const { data, error } = await supabase.rpc(searchFunction, {
      search_query: query,
      search_tables: tables.length > 0 ? tables : undefined,
      max_results: maxResults,
      min_rank: minRank
    });

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json(
        { error: 'Search failed', details: error.message },
        { status: 500 }
      );
    }

    // Group results by content type
    const groupedResults = (data || []).reduce((groups: any, result: any) => {
      const type = result.content_type || result.table_name;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(result);
      return groups;
    }, {});

    // Calculate search statistics
    const stats = {
      total_results: data?.length || 0,
      content_types: Object.keys(groupedResults).length,
      max_rank: data?.length > 0 ? Math.max(...data.map((r: any) => r.rank || r.relevance_score || 0)) : 0,
      search_time: Date.now()
    };

    return NextResponse.json({
      success: true,
      query,
      results: data || [],
      grouped_results: groupedResults,
      stats,
      context,
      user_role: userRole
    });

  } catch (error) {
    console.error('Unexpected search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint for logging search queries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, search_type, results_count, user_id } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required for logging' },
        { status: 400 }
      );
    }

    // Log search query for analytics
    const { error } = await supabase.rpc('log_search_query', {
      user_id_param: user_id || null,
      query_text: query,
      search_type: search_type || 'universal',
      results_count: results_count || 0
    });

    if (error) {
      console.error('Search logging error:', error);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Search logging error:', error);
    return NextResponse.json(
      { error: 'Logging failed' },
      { status: 500 }
    );
  }
}
