import type { OSRSMonster, OSRSDrop } from './osrs-api';

export interface MonsterCacheEntry {
  title: string;
  url: string;
  extract?: string;
  image?: string;
  drops: OSRSDrop[];
  combatLevel?: number;
  hitpoints?: number;
  lastUpdated: Date;
  expiresAt: Date;
  searchKeywords: string[];
}

export interface MonsterCacheStats {
  totalMonsters: number;
  lastRefresh: Date;
  cacheHitRate: number;
  averageSearchTime: number;
}

class MonsterCacheService {
  private cache = new Map<string, MonsterCacheEntry>();
  private searchIndex = new Map<string, Set<string>>(); // keyword -> monster titles
  private stats: MonsterCacheStats = {
    totalMonsters: 0,
    lastRefresh: new Date(0),
    cacheHitRate: 0,
    averageSearchTime: 0
  };
  private searchMetrics = { hits: 0, misses: 0, totalTime: 0, searches: 0 };
  
  // Cache configuration
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 1000; // Prevent unbounded growth

  constructor() {
    this.loadCacheFromStorage();
    // No need for async initialization with pre-built cache
    // Cache will be populated on-demand
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: MonsterCacheEntry): boolean {
    return Date.now() > entry.expiresAt.getTime();
  }

  /**
   * Remove expired entries from cache
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt.getTime()) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.removeFromSearchIndex(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`Cleaned ${expiredKeys.length} expired cache entries`);
      this.updateStats();
      this.saveCacheToStorage();
    }
  }

  /**
   * Remove a monster from the search index
   */
  private removeFromSearchIndex(title: string): void {
    for (const [keyword, titleSet] of this.searchIndex.entries()) {
      titleSet.delete(title);
      if (titleSet.size === 0) {
        this.searchIndex.delete(keyword);
      }
    }
  }

  /**
   * Enforce cache size limits by removing oldest entries
   */
  private enforceCacheSize(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) {
      return;
    }

    // Convert to array and sort by lastUpdated (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastUpdated.getTime() - b.lastUpdated.getTime());

    const toRemove = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE);
    
    for (const [title] of toRemove) {
      this.cache.delete(title);
      this.removeFromSearchIndex(title);
    }

    console.log(`Removed ${toRemove.length} oldest cache entries to maintain size limit`);
    this.updateStats();
  }

  /**
   * Load cache data from localStorage (browser) or file system (Node.js)
   */
  private loadCacheFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem('osrs-monster-cache');
        if (cached) {
          const data = JSON.parse(cached);
          this.deserializeCache(data);
        }
      }
    } catch (error) {
      console.warn('Failed to load monster cache from storage:', error);
    }
  }

  /**
   * Save cache data to localStorage (browser)
   */
  private saveCacheToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = this.serializeCache();
        localStorage.setItem('osrs-monster-cache', JSON.stringify(data));
      }
    } catch (error) {
      console.warn('Failed to save monster cache to storage:', error);
    }
  }

  /**
   * Serialize cache data for storage
   */
  private serializeCache() {
    return {
      monsters: Array.from(this.cache.entries()),
      searchIndex: Array.from(this.searchIndex.entries()).map(([key, set]) => [key, Array.from(set)]),
      stats: this.stats,
      version: '1.0'
    };
  }

  /**
   * Deserialize cache data from storage
   */
  private deserializeCache(data: { version?: string; monsters?: [string, MonsterCacheEntry][]; searchIndex?: [string, string[]][]; stats?: Partial<MonsterCacheStats> }): void {
    if (data.version !== '1.0') {
      console.warn('Cache version mismatch, skipping load');
      return;
    }

    // Load monsters
    if (data.monsters && Array.isArray(data.monsters)) {
      for (const [title, entry] of data.monsters) {
        const now = new Date();
        this.cache.set(title, {
          ...entry,
          lastUpdated: new Date(entry.lastUpdated || now),
          expiresAt: new Date(entry.expiresAt || now.getTime() + this.TTL_MS),
          searchKeywords: entry.searchKeywords || this.generateSearchKeywords(entry.title || title)
        });
      }
    }

    // Load search index
    if (data.searchIndex && Array.isArray(data.searchIndex)) {
      for (const [keyword, titles] of data.searchIndex) {
        this.searchIndex.set(keyword, new Set(titles));
      }
    }

    // Load stats
    if (data.stats) {
      this.stats = {
        ...data.stats,
        lastRefresh: new Date(data.stats.lastRefresh)
      };
    }

    console.log(`Loaded ${this.cache.size} monsters from cache`);
  }

  /**
   * Add or update a monster in the cache with TTL
   */
  public setMonster(monster: OSRSMonster): void {
    const now = new Date();
    const entry: MonsterCacheEntry = {
      ...monster,
      lastUpdated: now,
      expiresAt: new Date(now.getTime() + this.TTL_MS),
      searchKeywords: this.generateSearchKeywords(monster.title)
    };

    this.cache.set(monster.title, entry);
    this.updateSearchIndex(entry);
    this.updateStats();
    this.enforceCacheSize();
    this.saveCacheToStorage();
  }

  /**
   * Bulk add monsters to cache
   */
  public setMonsters(monsters: OSRSMonster[]): void {
    const startTime = Date.now();
    
    for (const monster of monsters) {
      this.setMonster(monster);
    }

    console.log(`Cached ${monsters.length} monsters in ${Date.now() - startTime}ms`);
    this.saveCacheToStorage();
  }

  /**
   * Generate search keywords for a monster name
   */
  private generateSearchKeywords(title: string): string[] {
    const keywords = new Set<string>();
    const normalized = title.toLowerCase();
    
    // Add full title
    keywords.add(normalized);
    
    // Add individual words
    const words = normalized.split(/[\s\-_()]+/).filter(word => word.length > 0);
    words.forEach(word => keywords.add(word));
    
    // Add partial matches (prefixes of 3+ chars)
    for (const word of words) {
      if (word.length >= 3) {
        for (let i = 3; i <= word.length; i++) {
          keywords.add(word.substring(0, i));
        }
      }
    }
    
    return Array.from(keywords);
  }

  /**
   * Update search index for a monster
   */
  private updateSearchIndex(entry: MonsterCacheEntry): void {
    // Remove old entries for this monster
    for (const [keyword, titleSet] of this.searchIndex.entries()) {
      titleSet.delete(entry.title);
      if (titleSet.size === 0) {
        this.searchIndex.delete(keyword);
      }
    }

    // Add new keyword mappings
    for (const keyword of entry.searchKeywords) {
      if (!this.searchIndex.has(keyword)) {
        this.searchIndex.set(keyword, new Set());
      }
      this.searchIndex.get(keyword)!.add(entry.title);
    }
  }

  /**
   * Search monsters by query string with cache-miss handling
   */
  public async searchMonsters(query: string, limit: number = 10): Promise<{ results: MonsterCacheEntry[], fromCache: boolean }> {
    const startTime = Date.now();
    
    if (!query.trim()) {
      return { results: [], fromCache: true };
    }

    // Clean expired entries first
    this.cleanExpiredEntries();

    const queryLower = query.toLowerCase();
    const matchScores = new Map<string, number>();
    const potentialMatches = new Set<string>();
    
    // Search through cached, non-expired entries
    for (const [keyword, titleSet] of this.searchIndex.entries()) {
      // Exact matches
      if (keyword === queryLower) {
        for (const title of titleSet) {
          const entry = this.cache.get(title);
          if (entry && !this.isExpired(entry)) {
            potentialMatches.add(title);
            matchScores.set(title, (matchScores.get(title) || 0) + 100);
          }
        }
      }
      
      // Prefix matches
      else if (keyword.startsWith(queryLower)) {
        for (const title of titleSet) {
          const entry = this.cache.get(title);
          if (entry && !this.isExpired(entry)) {
            potentialMatches.add(title);
            const score = matchScores.get(title) || 0;
            matchScores.set(title, score + (keyword.length === queryLower.length ? 50 : 25));
          }
        }
      }
      
      // Contains matches (if we need more results)
      else if (potentialMatches.size < limit * 2 && keyword.includes(queryLower)) {
        for (const title of titleSet) {
          const entry = this.cache.get(title);
          if (entry && !this.isExpired(entry)) {
            potentialMatches.add(title);
            const score = matchScores.get(title) || 0;
            matchScores.set(title, score + 10);
          }
        }
      }
    }

    // Sort and limit results
    const cachedResults = Array.from(potentialMatches)
      .map(title => ({
        title,
        monster: this.cache.get(title)!,
        score: matchScores.get(title) || 0
      }))
      .filter(item => item.monster && !this.isExpired(item.monster))
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        if (a.title.length !== b.title.length) return a.title.length - b.title.length;
        return a.title.localeCompare(b.title);
      })
      .slice(0, limit)
      .map(item => item.monster);

    // Update metrics
    const searchTime = Date.now() - startTime;
    this.searchMetrics.searches++;
    this.searchMetrics.totalTime += searchTime;
    
    if (cachedResults.length > 0) {
      this.searchMetrics.hits++;
      this.stats.cacheHitRate = this.searchMetrics.hits / this.searchMetrics.searches;
      this.stats.averageSearchTime = this.searchMetrics.totalTime / this.searchMetrics.searches;
      
      return { results: cachedResults, fromCache: true };
    }

    // Cache miss - return empty results, caller should handle API fallback
    this.searchMetrics.misses++;
    this.stats.cacheHitRate = this.searchMetrics.hits / this.searchMetrics.searches;
    this.stats.averageSearchTime = this.searchMetrics.totalTime / this.searchMetrics.searches;

    return { results: [], fromCache: false };
  }

  /**
   * Get a specific monster from cache (if not expired)
   */
  public getMonster(title: string): MonsterCacheEntry | null {
    const entry = this.cache.get(title);
    if (!entry) return null;
    
    if (this.isExpired(entry)) {
      this.cache.delete(title);
      this.removeFromSearchIndex(title);
      this.updateStats();
      return null;
    }
    
    return entry;
  }

  /**
   * Check if monster exists in cache and is not expired
   */
  public hasMonster(title: string): boolean {
    const entry = this.cache.get(title);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(title);
      this.removeFromSearchIndex(title);
      this.updateStats();
      return false;
    }
    
    return true;
  }

  /**
   * Get all monster titles in cache
   */
  public getAllTitles(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  public getStats(): MonsterCacheStats {
    return { ...this.stats };
  }

  /**
   * Clear the entire cache
   */
  public clear(): void {
    this.cache.clear();
    this.searchIndex.clear();
    this.stats = {
      totalMonsters: 0,
      lastRefresh: new Date(0),
      cacheHitRate: 0,
      averageSearchTime: 0
    };
    this.searchMetrics = { hits: 0, misses: 0, totalTime: 0, searches: 0 };
    
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('osrs-monster-cache');
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.totalMonsters = this.cache.size;
    this.stats.lastRefresh = new Date();
  }

  /**
   * Get monsters that need refresh (older than specified age)
   */
  public getStaleMonsters(maxAgeMs: number = 24 * 60 * 60 * 1000): string[] {
    const now = Date.now();
    return Array.from(this.cache.entries())
      .filter(([, entry]) => now - entry.lastUpdated.getTime() > maxAgeMs)
      .map(([title]) => title);
  }

  /**
   * Export cache data as JSON
   */
  public exportCache(): string {
    return JSON.stringify(this.serializeCache(), null, 2);
  }

  /**
   * Import cache data from JSON
   */
  public importCache(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      this.deserializeCache(data);
      this.saveCacheToStorage();
    } catch (error) {
      throw new Error(`Failed to import cache data: ${error}`);
    }
  }
}

// Singleton instance
export const monsterCache = new MonsterCacheService();

// Export for use in build scripts
export { MonsterCacheService };