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

  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    this.loadCacheFromStorage();
    await this.initializeCacheFromJSON();
    this.isInitialized = true;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized && this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Initialize cache from pre-built JSON file (for production builds)
   */
  private async initializeCacheFromJSON(): Promise<void> {
    // Only load from JSON if cache is empty
    if (this.cache.size > 0) {
      return;
    }

    try {
      // Try to import the pre-built cache file
      const cacheModule = await import('../data/monster-cache.json');
      const data = cacheModule.default || cacheModule;
      
      if (data.version === '1.0' && data.monsters && Array.isArray(data.monsters)) {
        console.log('Loading monster cache from pre-built JSON...');
        
        // Load monsters from JSON
        for (const [title, monster] of data.monsters) {
          const entry: MonsterCacheEntry = {
            ...monster,
            lastUpdated: new Date(monster.lastUpdated || data.buildDate),
            searchKeywords: this.generateSearchKeywords(monster.title)
          };
          
          this.cache.set(title, entry);
          this.updateSearchIndex(entry);
        }
        
        this.updateStats();
        console.log(`Loaded ${this.cache.size} monsters from pre-built cache`);
      }
    } catch {
      console.log('No pre-built cache found, cache will be populated dynamically');
    }
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
        this.cache.set(title, {
          ...entry,
          lastUpdated: new Date(entry.lastUpdated)
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
   * Add or update a monster in the cache
   */
  public setMonster(monster: OSRSMonster): void {
    const entry: MonsterCacheEntry = {
      ...monster,
      lastUpdated: new Date(),
      searchKeywords: this.generateSearchKeywords(monster.title)
    };

    this.cache.set(monster.title, entry);
    this.updateSearchIndex(entry);
    this.updateStats();
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
   * Search monsters by query string
   */
  public async searchMonsters(query: string, limit: number = 10): Promise<MonsterCacheEntry[]> {
    await this.ensureInitialized();
    const startTime = Date.now();
    
    if (!query.trim()) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const matchScores = new Map<string, number>();

    // Find all potential matches through search index
    const potentialMatches = new Set<string>();
    
    // Exact keyword matches
    if (this.searchIndex.has(queryLower)) {
      for (const title of this.searchIndex.get(queryLower)!) {
        potentialMatches.add(title);
        matchScores.set(title, (matchScores.get(title) || 0) + 100);
      }
    }

    // Prefix matches
    for (const [keyword, titleSet] of this.searchIndex.entries()) {
      if (keyword.startsWith(queryLower)) {
        for (const title of titleSet) {
          potentialMatches.add(title);
          const score = matchScores.get(title) || 0;
          // Higher score for longer matches
          matchScores.set(title, score + (keyword.length === queryLower.length ? 50 : 25));
        }
      }
    }

    // Contains matches (for partial searches)
    if (potentialMatches.size < limit * 2) {
      for (const [keyword, titleSet] of this.searchIndex.entries()) {
        if (keyword.includes(queryLower) && !keyword.startsWith(queryLower)) {
          for (const title of titleSet) {
            potentialMatches.add(title);
            const score = matchScores.get(title) || 0;
            matchScores.set(title, score + 10);
          }
        }
      }
    }

    // Convert to array and sort by score
    const results = Array.from(potentialMatches)
      .map(title => ({
        title,
        monster: this.cache.get(title)!,
        score: matchScores.get(title) || 0
      }))
      .filter(item => item.monster) // Ensure monster exists
      .sort((a, b) => {
        // Sort by score first
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        
        // Then by title length (shorter = more specific)
        if (a.title.length !== b.title.length) {
          return a.title.length - b.title.length;
        }
        
        // Finally alphabetical
        return a.title.localeCompare(b.title);
      })
      .slice(0, limit)
      .map(item => item.monster);

    // Update metrics
    const searchTime = Date.now() - startTime;
    this.searchMetrics.searches++;
    this.searchMetrics.totalTime += searchTime;
    this.searchMetrics.hits += results.length > 0 ? 1 : 0;
    this.searchMetrics.misses += results.length === 0 ? 1 : 0;
    
    // Update cache hit rate
    this.stats.cacheHitRate = this.searchMetrics.hits / this.searchMetrics.searches;
    this.stats.averageSearchTime = this.searchMetrics.totalTime / this.searchMetrics.searches;

    return results;
  }

  /**
   * Get a specific monster from cache
   */
  public getMonster(title: string): MonsterCacheEntry | null {
    return this.cache.get(title) || null;
  }

  /**
   * Check if monster exists in cache
   */
  public hasMonster(title: string): boolean {
    return this.cache.has(title);
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