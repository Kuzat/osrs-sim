import { NextRequest, NextResponse } from 'next/server';
import { monsterCache } from '@/lib/monster-cache';
import { searchMonsters } from '@/lib/osrs-api';

export async function POST(request: NextRequest) {
  try {
    // This is a potentially expensive operation, so we might want to add authentication
    // For now, we'll allow it but add some basic protection
    
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const sample = searchParams.get('sample') === 'true'; // Refresh only a sample for testing
    
    // Get current cache status
    const stats = monsterCache.getStats();
    const dayMs = 24 * 60 * 60 * 1000;
    const cacheAge = Date.now() - stats.lastRefresh.getTime();
    
    if (!force && cacheAge < dayMs) {
      return NextResponse.json({
        message: 'Cache is still fresh, refresh not needed',
        cacheAge: cacheAge,
        cacheAgeHours: Math.round(cacheAge / (60 * 60 * 1000)),
        refreshed: false,
        stats: stats
      });
    }

    // If sample mode, just refresh a few popular monsters for testing
    if (sample) {
      const sampleMonsters = ['Cow', 'Goblin', 'Hill Giant', 'Dragon', 'Zombie'];
      const refreshPromises = sampleMonsters.map(async (name) => {
        try {
          const result = await searchMonsters(name, 1);
          if (result.results.length > 0) {
            monsterCache.setMonster(result.results[0]);
            return { name, success: true };
          }
          return { name, success: false, reason: 'No results' };
        } catch (error) {
          return { name, success: false, reason: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      const results = await Promise.all(refreshPromises);
      const successful = results.filter(r => r.success).length;

      return NextResponse.json({
        message: `Sample refresh completed: ${successful}/${sampleMonsters.length} monsters updated`,
        sample: true,
        results: results,
        refreshed: successful > 0,
        stats: monsterCache.getStats()
      });
    }

    // Full refresh is complex and should ideally be done via the build script
    // For now, return a message directing to use the build script
    return NextResponse.json({
      message: 'Full cache refresh should be performed using the build script',
      recommendation: 'Run: npm run build-cache',
      currentStats: stats,
      refreshed: false
    }, { status: 501 }); // Not implemented

  } catch (error) {
    console.error('Cache refresh error:', error);
    
    return NextResponse.json({
      error: 'Failed to refresh cache',
      details: error instanceof Error ? error.message : 'Unknown error',
      refreshed: false
    }, { status: 500 });
  }
}

// GET method to check if refresh is needed
export async function GET() {
  try {
    const stats = monsterCache.getStats();
    const dayMs = 24 * 60 * 60 * 1000;
    const cacheAge = Date.now() - stats.lastRefresh.getTime();
    
    return NextResponse.json({
      refreshNeeded: cacheAge > dayMs,
      cacheAge: cacheAge,
      cacheAgeHours: Math.round(cacheAge / (60 * 60 * 1000)),
      lastRefresh: stats.lastRefresh,
      stats: stats,
      recommendations: {
        action: cacheAge > dayMs ? 'refresh' : 'none',
        method: 'POST /api/monsters/refresh?sample=true for testing, or npm run build-cache for full refresh'
      }
    });

  } catch (error) {
    console.error('Cache refresh status error:', error);
    
    return NextResponse.json({
      error: 'Failed to check refresh status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}