import { NextResponse } from 'next/server';
import { monsterCache } from '@/lib/monster-cache';

export async function GET() {
  try {
    const stats = monsterCache.getStats();
    const allTitles = monsterCache.getAllTitles();
    
    // Calculate cache health metrics
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    
    const cacheAge = now - stats.lastRefresh.getTime();
    const isStale = cacheAge > dayMs;
    const isVeryStale = cacheAge > weekMs;
    
    let healthStatus = 'healthy';
    if (stats.totalMonsters === 0) {
      healthStatus = 'empty';
    } else if (isVeryStale) {
      healthStatus = 'very_stale';
    } else if (isStale) {
      healthStatus = 'stale';
    }

    return NextResponse.json({
      health: {
        status: healthStatus,
        cacheAge: cacheAge,
        isStale: isStale,
        isVeryStale: isVeryStale
      },
      stats: {
        totalMonsters: stats.totalMonsters,
        lastRefresh: stats.lastRefresh,
        cacheHitRate: stats.cacheHitRate,
        averageSearchTime: stats.averageSearchTime
      },
      performance: {
        searchesPerformed: Math.floor(stats.cacheHitRate * 100) || 0,
        averageResponseTime: `${stats.averageSearchTime.toFixed(2)}ms`
      },
      samples: {
        monsterTitles: allTitles.slice(0, 10), // First 10 monsters as sample
        totalAvailable: allTitles.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    });

  } catch (error) {
    console.error('Cache status error:', error);
    
    return NextResponse.json({
      health: {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      stats: {
        totalMonsters: 0,
        lastRefresh: new Date(0),
        cacheHitRate: 0,
        averageSearchTime: 0
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    }, { status: 500 });
  }
}