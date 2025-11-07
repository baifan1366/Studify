import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  console.log('🔍 [Universal Search API] Request received:', request.url);
  
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const tables = searchParams.get('tables')?.split(',') || [];
    const maxResults = parseInt(searchParams.get('limit') || '20');
    const minRank = parseFloat(searchParams.get('min_rank') || '0.01'); // Changed from 0.1 to 0.01
    const context = searchParams.get('context') || 'general';
    const userRole = searchParams.get('user_role') || 'student';

    console.log('📝 [Universal Search API] Search params:', {
      query,
      tables,
      maxResults,
      minRank,
      context,
      userRole
    });

    if (!query || query.trim().length === 0) {
      console.log('⚠️ [Universal Search API] Query is empty or missing');
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Use universal_search_enhanced function
    const searchFunction = 'universal_search_enhanced';
    console.log('🔎 [Universal Search API] Calling RPC function:', searchFunction);
    console.log('🔎 [Universal Search API] RPC params:', {
      search_query: query,
      search_tables: tables.length > 0 ? tables : undefined,
      max_results: maxResults,
      min_rank: minRank
    });

    // IMPORTANT: Pass NULL instead of undefined for default tables
    // PostgreSQL functions handle NULL differently than undefined
    const { data, error } = await supabase.rpc(searchFunction, {
      search_query: query,
      search_tables: tables.length > 0 ? tables : null,
      max_results: maxResults,
      min_rank: minRank
    });

    console.log('📊 [Universal Search API] RPC response:', {
      dataLength: data?.length || 0,
      hasError: !!error,
      error: error ? error.message : null
    });

    if (error) {
      console.error('❌ [Universal Search API] Search error:', error);
      console.error('❌ [Universal Search API] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: 'Search failed', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [Universal Search API] Search successful, results:', data?.length || 0);

    // Group results by content type
    const groupedResults = (data || []).reduce((groups: any, result: any) => {
      const type = result.content_type || result.table_name;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(result);
      return groups;
    }, {});

    console.log('📊 [Universal Search API] Grouped results:', {
      contentTypes: Object.keys(groupedResults),
      counts: Object.entries(groupedResults).map(([type, results]: [string, any]) => ({
        type,
        count: results.length
      }))
    });

    // Calculate search statistics
    const stats = {
      total_results: data?.length || 0,
      content_types: Object.keys(groupedResults).length,
      max_rank: data?.length > 0 ? Math.max(...data.map((r: any) => r.rank || r.relevance_score || 0)) : 0,
      search_time: Date.now()
    };

    console.log('📊 [Universal Search API] Stats:', stats);

    const response = {
      success: true,
      query,
      results: data || [],
      grouped_results: groupedResults,
      stats,
      context,
      user_role: userRole
    };

    console.log('✅ [Universal Search API] Returning response with', response.results.length, 'results');

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Universal Search API] Unexpected error:', error);
    console.error('❌ [Universal Search API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint for logging search queries
export async function POST(request: NextRequest) {
  console.log('📝 [Universal Search API] POST request for logging');
  
  try {
    const body = await request.json();
    const { query, search_type, results_count, user_id } = body;

    console.log('📝 [Universal Search API] Logging params:', {
      query,
      search_type,
      results_count,
      user_id
    });

    if (!query) {
      console.log('⚠️ [Universal Search API] Query missing for logging');
      return NextResponse.json(
        { error: 'Query is required for logging' },
        { status: 400 }
      );
    }

    // Log search query for analytics
    console.log('📝 [Universal Search API] Calling log_search_query RPC');
    const { error } = await supabase.rpc('log_search_query', {
      user_id_param: user_id || null,
      query_text: query,
      search_type: search_type || 'universal',
      results_count: results_count || 0
    });

    if (error) {
      console.error('❌ [Universal Search API] Search logging error:', error);
      // Don't fail the request if logging fails
    } else {
      console.log('✅ [Universal Search API] Search logged successfully');
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ [Universal Search API] Search logging error:', error);
    console.error('❌ [Universal Search API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Logging failed' },
      { status: 500 }
    );
  }
}
