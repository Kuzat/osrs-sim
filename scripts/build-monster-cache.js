#!/usr/bin/env node

/**
 * OSRS Monster Cache Builder
 * 
 * This script fetches all monsters from the OSRS Wiki and builds a comprehensive cache
 * with their drop tables, stats, and search metadata.
 */

const fs = require('fs').promises;
const path = require('path');

// Import our API functions (we'll need to adapt for Node.js)
const OSRS_WIKI_API_BASE = 'https://oldschool.runescape.wiki/api.php';

class MonsterCacheBuilder {
  constructor() {
    this.monsters = new Map();
    this.totalFetched = 0;
    this.totalSkipped = 0;
    this.errors = [];
    this.rateLimitDelay = 100; // ms between requests
  }

  /**
   * Fetch with rate limiting and error handling
   */
  async fetchWithRateLimit(url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.delay(this.rateLimitDelay);
        const response = await fetch(url);
        
        if (response.status === 429) {
          // Rate limited, wait longer
          console.warn(`Rate limited on attempt ${attempt}, waiting 5s...`);
          await this.delay(5000);
          continue;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.warn(`Attempt ${attempt}/${retries} failed for ${url}: ${error.message}`);
        if (attempt === retries) {
          throw error;
        }
        await this.delay(1000 * attempt); // Exponential backoff
      }
    }
  }

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all monster names from the Monsters category
   */
  async fetchAllMonsterNames() {
    console.log('Fetching all monster names from Category:Monsters...');
    
    const monsters = new Set();
    let cmcontinue = null;
    
    do {
      const searchUrl = new URL(OSRS_WIKI_API_BASE);
      searchUrl.searchParams.set('action', 'query');
      searchUrl.searchParams.set('list', 'categorymembers');
      searchUrl.searchParams.set('cmtitle', 'Category:Monsters');
      searchUrl.searchParams.set('cmlimit', '500');
      searchUrl.searchParams.set('cmtype', 'page');
      searchUrl.searchParams.set('format', 'json');
      searchUrl.searchParams.set('origin', '*');
      
      if (cmcontinue) {
        searchUrl.searchParams.set('cmcontinue', cmcontinue);
      }

      try {
        const data = await this.fetchWithRateLimit(searchUrl.toString());
        
        if (data.query?.categorymembers) {
          for (const member of data.query.categorymembers) {
            monsters.add(member.title);
          }
        }
        
        cmcontinue = data.continue?.cmcontinue;
        console.log(`Found ${monsters.size} monsters so far...`);
        
      } catch (error) {
        console.error('Error fetching monster names:', error);
        break;
      }
    } while (cmcontinue);

    console.log(`Total monsters found: ${monsters.size}`);
    return Array.from(monsters);
  }

  /**
   * Parse drops from wikitext (adapted from osrs-api.ts)
   */
  parseDropsFromWikitext(wikitext) {
    const drops = [];
    
    const dropsLineRegex = /\{\{DropsLine\|([^}]+)\}\}/g;
    const dropsClueRegex = /\{\{DropsLineClue\|([^}]+)\}\}/g;
    const herbDropLinesRegex = /\{\{HerbDropLines\|([^}]+)\}\}/g;
    const rareSeedDropLinesRegex = /\{\{RareSeedDropLines\|([^}]+)\}\}/g;
    
    let currentCategory = 'Unknown';
    
    const lines = wikitext.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.match(/^===(.+)===$/)) {
        currentCategory = line.replace(/===/g, '').trim();
        continue;
      }
      
      // Parse DropsLine entries
      const dropsLineMatches = [...line.matchAll(dropsLineRegex)];
      dropsLineMatches.forEach(match => {
        const params = this.parseTemplateParams(match[1]);
        if (params.name) {
          drops.push({
            name: params.name,
            quantity: params.quantity || '1',
            rarity: params.rarity || 'Unknown',
            category: currentCategory
          });
        }
      });
      
      // Parse DropsLineClue entries
      const clueMatches = [...line.matchAll(dropsClueRegex)];
      clueMatches.forEach(match => {
        const params = this.parseTemplateParams(match[1]);
        drops.push({
          name: `${params.type || 'Unknown'} clue scroll`,
          quantity: '1',
          rarity: params.rarity || 'Unknown',
          category: 'Tertiary'
        });
      });
      
      // Parse HerbDropLines entries
      const herbMatches = [...line.matchAll(herbDropLinesRegex)];
      herbMatches.forEach(match => {
        const params = this.parseTemplateParams(match[1]);
        const baseRate = params['0'] || params['1'] || 'Unknown';
        const herbDrops = this.parseHerbDropTable(baseRate, currentCategory);
        drops.push(...herbDrops);
      });
      
      // Parse RareSeedDropLines entries
      const seedMatches = [...line.matchAll(rareSeedDropLinesRegex)];
      seedMatches.forEach(match => {
        const params = this.parseTemplateParams(match[1]);
        const baseRate = params['0'] || params['1'] || 'Unknown';
        const seedDrops = this.parseRareSeedDropTable(baseRate, currentCategory);
        drops.push(...seedDrops);
      });
    }
    
    return drops;
  }

  parseTemplateParams(paramString) {
    const params = {};
    const pairs = paramString.split('|');
    
    pairs.forEach((pair, index) => {
      const [key, ...valueParts] = pair.split('=');
      if (key && valueParts.length > 0) {
        params[key.trim()] = valueParts.join('=').trim();
      } else if (index === 0) {
        params['0'] = pair.trim();
      } else {
        params[index.toString()] = pair.trim();
      }
    });
    
    return params;
  }

  parseHerbDropTable(baseRate, category) {
    const herbs = [
      { name: 'Grimy guam leaf', weight: 19 },
      { name: 'Grimy marrentill', weight: 15 },
      { name: 'Grimy tarromin', weight: 12 },
      { name: 'Grimy harralander', weight: 9 },
      { name: 'Grimy ranarr weed', weight: 6 },
      { name: 'Grimy toadflax', weight: 4 },
      { name: 'Grimy irit leaf', weight: 4 },
      { name: 'Grimy avantoe', weight: 3 },
      { name: 'Grimy kwuarm', weight: 2 },
      { name: 'Grimy snapdragon', weight: 2 },
      { name: 'Grimy cadantine', weight: 1 },
      { name: 'Grimy lantadyme', weight: 1 },
      { name: 'Grimy dwarf weed', weight: 1 }
    ];
    
    const totalWeight = herbs.reduce((sum, herb) => sum + herb.weight, 0);
    
    return herbs.map(herb => ({
      name: herb.name,
      quantity: '1-3',
      rarity: `${baseRate} (${herb.weight}/${totalWeight})`,
      category: category
    }));
  }

  parseRareSeedDropTable(baseRate, category) {
    const seeds = [
      { name: 'Toadflax seed', rarity: '1/33.8' },
      { name: 'Irit seed', rarity: '1/49.7' },
      { name: 'Belladonna seed', rarity: '1/51.3' },
      { name: 'Poison ivy seed', rarity: '1/72.3' },
      { name: 'Avantoe seed', rarity: '1/72.3' },
      { name: 'Cactus seed', rarity: '1/75.7' },
      { name: 'Potato cactus seed', rarity: '1/106' },
      { name: 'Kwuarm seed', rarity: '1/106' },
      { name: 'Snapdragon seed', rarity: '1/159' },
      { name: 'Cadantine seed', rarity: '1/227.1' },
      { name: 'Lantadyme seed', rarity: '1/318' },
      { name: 'Snape grass seed', rarity: '1/397.5', quantity: '3' },
      { name: 'Dwarf weed seed', rarity: '1/530' },
      { name: 'Torstol seed', rarity: '1/794.9' }
    ];
    
    return seeds.map(seed => ({
      name: seed.name,
      quantity: seed.quantity || '1',
      rarity: `${baseRate} then ${seed.rarity}`,
      category: category
    }));
  }

  /**
   * Fetch monster details including drops
   */
  async fetchMonsterDetails(title) {
    const detailsUrl = new URL(OSRS_WIKI_API_BASE);
    detailsUrl.searchParams.set('action', 'query');
    detailsUrl.searchParams.set('titles', title);
    detailsUrl.searchParams.set('prop', 'revisions|extracts|pageimages');
    detailsUrl.searchParams.set('rvprop', 'content');
    detailsUrl.searchParams.set('exintro', '1');
    detailsUrl.searchParams.set('explaintext', '1');
    detailsUrl.searchParams.set('piprop', 'original');
    detailsUrl.searchParams.set('format', 'json');
    detailsUrl.searchParams.set('origin', '*');

    try {
      const data = await this.fetchWithRateLimit(detailsUrl.toString());
      const pages = data.query?.pages;
      
      if (!pages) {
        return null;
      }

      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];
      
      if (pageId === '-1' || !page) {
        return null;
      }

      const wikitext = page.revisions?.[0]?.['*'] || '';
      const drops = this.parseDropsFromWikitext(wikitext);
      
      // Only return if we found drops (indicating this is likely a monster)
      if (drops.length === 0) {
        return null;
      }

      // Extract combat level and hitpoints from wikitext
      const combatLevelMatch = wikitext.match(/\|combat\s*=\s*(\d+)/i);
      const hitpointsMatch = wikitext.match(/\|hitpoints\s*=\s*(\d+)/i);

      return {
        title: page.title,
        url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
        extract: page.extract || '',
        image: page.original?.source || '',
        drops: drops,
        combatLevel: combatLevelMatch ? parseInt(combatLevelMatch[1]) : undefined,
        hitpoints: hitpointsMatch ? parseInt(hitpointsMatch[1]) : undefined
      };
    } catch (error) {
      this.errors.push({ title, error: error.message });
      return null;
    }
  }

  /**
   * Build the complete monster cache
   */
  async buildCache() {
    console.log('🏗️  Building OSRS Monster Cache...\n');
    
    // Step 1: Get all monster names
    const monsterNames = await this.fetchAllMonsterNames();
    console.log(`📋 Found ${monsterNames.length} potential monsters\n`);

    // Step 2: Process monsters in batches
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < monsterNames.length; i += batchSize) {
      batches.push(monsterNames.slice(i, i + batchSize));
    }

    console.log(`🔄 Processing ${batches.length} batches of ${batchSize} monsters...\n`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Batch ${batchIndex + 1}/${batches.length}: Processing ${batch.join(', ')}`);

      // Process batch monsters in parallel
      const promises = batch.map(async (name) => {
        const monster = await this.fetchMonsterDetails(name);
        if (monster) {
          this.monsters.set(name, monster);
          this.totalFetched++;
          console.log(`  ✅ ${name} (${monster.drops.length} drops)`);
        } else {
          this.totalSkipped++;
          console.log(`  ⏭️  ${name} (no drops found)`);
        }
      });

      await Promise.all(promises);
      
      // Progress update
      const progress = ((batchIndex + 1) / batches.length * 100).toFixed(1);
      console.log(`📊 Progress: ${progress}% (${this.totalFetched} monsters cached, ${this.totalSkipped} skipped)\n`);
    }

    console.log('✨ Cache building complete!');
    console.log(`📈 Final Stats:`);
    console.log(`   - Total monsters processed: ${monsterNames.length}`);
    console.log(`   - Successfully cached: ${this.totalFetched}`);
    console.log(`   - Skipped (no drops): ${this.totalSkipped}`);
    console.log(`   - Errors: ${this.errors.length}\n`);

    if (this.errors.length > 0) {
      console.log('❌ Errors encountered:');
      this.errors.slice(0, 10).forEach(({ title, error }) => {
        console.log(`   - ${title}: ${error}`);
      });
      if (this.errors.length > 10) {
        console.log(`   ... and ${this.errors.length - 10} more errors`);
      }
      console.log();
    }
  }

  /**
   * Save cache to file
   */
  async saveCache() {
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'monster-cache.json');
    const outputDir = path.dirname(outputPath);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Prepare cache data
    const cacheData = {
      version: '1.0',
      buildDate: new Date().toISOString(),
      totalMonsters: this.monsters.size,
      monsters: Array.from(this.monsters.entries()),
      stats: {
        totalProcessed: this.totalFetched + this.totalSkipped,
        successfullyFetched: this.totalFetched,
        skipped: this.totalSkipped,
        errors: this.errors.length
      }
    };

    await fs.writeFile(outputPath, JSON.stringify(cacheData, null, 2));
    
    const fileSizeKB = Math.round((JSON.stringify(cacheData).length) / 1024);
    console.log(`💾 Cache saved to: ${outputPath}`);
    console.log(`📦 File size: ${fileSizeKB}KB\n`);

    return outputPath;
  }
}

// Main execution
async function main() {
  // Check for Node.js fetch polyfill
  if (!global.fetch) {
    try {
      const fetch = (await import('node-fetch')).default;
      global.fetch = fetch;
    } catch (error) {
      console.error('❌ This script requires node-fetch. Install it with: npm install node-fetch');
      process.exit(1);
    }
  }

  const builder = new MonsterCacheBuilder();
  
  try {
    await builder.buildCache();
    const outputPath = await builder.saveCache();
    
    console.log('🎉 Monster cache built successfully!');
    console.log('💡 You can now use the cached data for lightning-fast monster searches.');
    
  } catch (error) {
    console.error('❌ Failed to build monster cache:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MonsterCacheBuilder };