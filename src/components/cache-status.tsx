"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface CacheStatus {
  health: {
    status: string;
    cacheAge: number;
    isStale: boolean;
  };
  stats: {
    totalMonsters: number;
    lastRefresh: string;
    cacheHitRate: number;
    averageSearchTime: number;
  };
}

export function CacheStatus() {
  const [status, setStatus] = useState<CacheStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/monsters/status');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setStatus(data);
      } catch (err) {
        console.warn('Cache status unavailable:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  if (error || !status) {
    return null; // Hide if cache status is unavailable
  }

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Loading cache status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'stale': return 'bg-yellow-500';
      case 'very_stale': return 'bg-red-500';
      case 'empty': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'Cache Active';
      case 'stale': return 'Cache Stale';
      case 'very_stale': return 'Cache Very Stale';
      case 'empty': return 'Cache Empty';
      default: return 'Cache Unknown';
    }
  };

  const formatCacheAge = (ageMs: number) => {
    const hours = Math.floor(ageMs / (1000 * 60 * 60));
    if (hours < 1) return 'Less than 1 hour';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  return (
    <Card className="mb-4 border-muted">
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${getStatusColor(status.health.status)}`}></div>
            <span className="text-sm font-medium">
              {getStatusText(status.health.status)}
            </span>
            <span className="text-xs text-muted-foreground">
              • {status.stats.totalMonsters} monsters cached
            </span>
          </div>
          
          {status.stats.cacheHitRate > 0 && (
            <div className="text-xs text-muted-foreground">
              Hit rate: {(status.stats.cacheHitRate * 100).toFixed(1)}%
              {status.stats.averageSearchTime > 0 && (
                <span className="ml-2">
                  • Avg: {status.stats.averageSearchTime.toFixed(1)}ms
                </span>
              )}
            </div>
          )}
        </div>
        
        {status.health.isStale && (
          <div className="mt-2 text-xs text-muted-foreground">
            Cache age: {formatCacheAge(status.health.cacheAge)} • Consider refreshing
          </div>
        )}
      </CardContent>
    </Card>
  );
}