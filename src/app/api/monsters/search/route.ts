import { NextRequest, NextResponse } from 'next/server';
import { monsterCache } from '@/lib/monster-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 10; // Cap at 50 results

    if (!query.trim()) {
      return NextResponse.json(
        { 
          error: 'Query parameter is required',
          searchTerm: query,
          results: [],
          cached: true 
        },
        { status: 400 }
      );
    }

    // Search in cache
    const results = await monsterCache.searchMonsters(query, limit);
    const stats = monsterCache.getStats();

    return NextResponse.json({
      searchTerm: query,
      results: results,
      cached: true,
      stats: {
        totalMonsters: stats.totalMonsters,
        cacheHitRate: stats.cacheHitRate,
        averageSearchTime: stats.averageSearchTime
      },
      meta: {
        resultsCount: results.length,
        searchTime: Date.now(), // Will be calculated by client
        source: 'cache'
      }
    });

  } catch (error) {
    console.error('Cache search error:', error);
    
    // Fallback to original API search
    try {
      const { searchMonsters } = await import('@/lib/osrs-api');
      const { searchParams } = new URL(request.url);
      const query = searchParams.get('q') || searchParams.get('query') || '';
      const limitParam = searchParams.get('limit');
      const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 10;

      const apiResults = await searchMonsters(query, limit);
      
      return NextResponse.json({
        ...apiResults,
        cached: false,
        meta: {
          resultsCount: apiResults.results.length,
          searchTime: Date.now(),
          source: 'api',
          fallbackReason: 'Cache unavailable'
        }
      });
      
    } catch (apiError) {
      console.error('API fallback error:', apiError);
      
      return NextResponse.json(
        { 
          error: 'Search failed',
          searchTerm: request.url.includes('q=') ? new URL(request.url).searchParams.get('q') : '',
          results: [],
          cached: false 
        },
        { status: 500 }
      );
    }
  }
}