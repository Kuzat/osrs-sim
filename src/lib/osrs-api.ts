export interface OSRSItem {
  title: string;
  url: string;
  extract?: string;
  image?: string;
}

export interface OSRSDrop {
  name: string;
  quantity: string;
  rarity: string;
  category: string;
  imageUrl?: string;
}

export interface OSRSMonster {
  title: string;
  url: string;
  extract?: string;
  image?: string;
  drops: OSRSDrop[];
  combatLevel?: number;
  hitpoints?: number;
}

export interface OSRSSearchResponse {
  searchTerm: string;
  results: OSRSMonster[];
}

const OSRS_WIKI_API_BASE = 'https://oldschool.runescape.wiki/api.php';

function parseDropsFromWikitext(wikitext: string): OSRSDrop[] {
  const drops: OSRSDrop[] = [];

  // Find all DropsLine templates
  const dropsLineRegex = /\{\{DropsLine\|([^}]+)\}\}/g;
  const dropsClueRegex = /\{\{DropsLineClue\|([^}]+)\}\}/g;
  const herbDropLinesRegex = /\{\{HerbDropLines\|([^}]+)\}\}/g;
  const rareSeedDropLinesRegex = /\{\{RareSeedDropLines\|([^}]+)\}\}/g;

  // Current category for organizing drops
  let currentCategory = 'Unknown';

  // Look for category headers (===Category===)
  const lines = wikitext.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for category headers
    if (line.match(/^===(.+)===$/)) {
      currentCategory = line.replace(/===/g, '').trim();
      continue;
    }

    // Parse DropsLine entries
    const dropsLineMatches = [...line.matchAll(dropsLineRegex)];
    dropsLineMatches.forEach(match => {
      const params = parseTemplateParams(match[1]);
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
      const params = parseTemplateParams(match[1]);
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
      const params = parseTemplateParams(match[1]);
      const baseRate = params['0'] || params['1'] || 'Unknown'; // First parameter is the rate
      const herbDrops = parseHerbDropTable(baseRate, currentCategory);
      drops.push(...herbDrops);
    });

    // Parse RareSeedDropLines entries
    const seedMatches = [...line.matchAll(rareSeedDropLinesRegex)];
    seedMatches.forEach(match => {
      const params = parseTemplateParams(match[1]);
      const baseRate = params['0'] || params['1'] || 'Unknown'; // First parameter is the rate
      const seedDrops = parseRareSeedDropTable(baseRate, currentCategory);
      drops.push(...seedDrops);
    });
  }

  return drops;
}

function parseTemplateParams(paramString: string): Record<string, string> {
  const params: Record<string, string> = {};
  const pairs = paramString.split('|');

  pairs.forEach((pair, index) => {
    const [key, ...valueParts] = pair.split('=');
    if (key && valueParts.length > 0) {
      params[key.trim()] = valueParts.join('=').trim();
    } else if (index === 0) {
      // First parameter without key=value format
      params['0'] = pair.trim();
    } else {
      // Numbered parameters
      params[index.toString()] = pair.trim();
    }
  });

  return params;
}

function parseHerbDropTable(baseRate: string, category: string): OSRSDrop[] {
  // Standard OSRS herb drop table - common herbs used by many monsters
  const herbs = [
    {name: 'Grimy guam leaf', weight: 19},
    {name: 'Grimy marrentill', weight: 15},
    {name: 'Grimy tarromin', weight: 12},
    {name: 'Grimy harralander', weight: 9},
    {name: 'Grimy ranarr weed', weight: 6},
    {name: 'Grimy toadflax', weight: 4},
    {name: 'Grimy irit leaf', weight: 4},
    {name: 'Grimy avantoe', weight: 3},
    {name: 'Grimy kwuarm', weight: 2},
    {name: 'Grimy snapdragon', weight: 2},
    {name: 'Grimy cadantine', weight: 1},
    {name: 'Grimy lantadyme', weight: 1},
    {name: 'Grimy dwarf weed', weight: 1}
  ];

  // Calculate individual herb rates based on the base rate and herb weights
  const totalWeight = herbs.reduce((sum, herb) => sum + herb.weight, 0);

  return herbs.map(herb => ({
    name: herb.name,
    quantity: '1-3', // Herbs typically drop 1-3 per roll
    rarity: `${baseRate} (${herb.weight}/${totalWeight})`,
    category: category
  }));
}

function parseRareSeedDropTable(baseRate: string, category: string): OSRSDrop[] {
  // Standard OSRS rare seed drop table - used by many monsters
  const seeds = [
    {name: 'Toadflax seed', rarity: '1/33.8'},
    {name: 'Irit seed', rarity: '1/49.7'},
    {name: 'Belladonna seed', rarity: '1/51.3'},
    {name: 'Poison ivy seed', rarity: '1/72.3'},
    {name: 'Avantoe seed', rarity: '1/72.3'},
    {name: 'Cactus seed', rarity: '1/75.7'},
    {name: 'Potato cactus seed', rarity: '1/106'},
    {name: 'Kwuarm seed', rarity: '1/106'},
    {name: 'Snapdragon seed', rarity: '1/159'},
    {name: 'Cadantine seed', rarity: '1/227.1'},
    {name: 'Lantadyme seed', rarity: '1/318'},
    {name: 'Snape grass seed', rarity: '1/397.5', quantity: '3'},
    {name: 'Dwarf weed seed', rarity: '1/530'},
    {name: 'Torstol seed', rarity: '1/794.9'}
  ];

  return seeds.map(seed => ({
    name: seed.name,
    quantity: seed.quantity || '1',
    rarity: `${baseRate} then ${seed.rarity}`,
    category: category
  }));
}

export async function searchMonsters(query: string, limit: number = 10): Promise<OSRSSearchResponse> {
  if (!query.trim()) {
    return {searchTerm: query, results: []};
  }

  // Try cache first
  try {
    const {monsterCache} = await import('./monster-cache');
    const cacheResult = await monsterCache.searchMonsters(query, limit);

    if (cacheResult.fromCache && cacheResult.results.length > 0) {
      console.log(`Cache hit: Found ${cacheResult.results.length} results for "${query}"`);
      return {
        searchTerm: query,
        results: cacheResult.results.map(entry => ({
          title: entry.title,
          url: entry.url,
          extract: entry.extract,
          image: entry.image,
          drops: entry.drops,
          combatLevel: entry.combatLevel,
          hitpoints: entry.hitpoints
        }))
      };
    }

    console.log(`Cache miss for "${query}", falling back to API`);
  } catch (error) {
    console.warn('Cache unavailable, using API:', error);
  }

  // Fallback to original API-based search
  try {
    // First, get monster names using category-based search
    const monsterNames = await searchMonsterNames(query, limit * 2); // Get more to account for filtering

    // If category search returns few/no results, also try opensearch and combine results
    let allMonsterNames = monsterNames;
    if (monsterNames.length < 5) {
      try {
        const fallbackNames = await searchMonsterNamesFallback(query, limit * 2);

        // Filter and combine results
        const validFallbackNames = [];
        for (const title of fallbackNames) {
          if (monsterNames.includes(title)) continue;

          // Quick filter for likely non-monsters
          const titleLower = title.toLowerCase();
          const isLikelyNonMonster =
            titleLower.includes('quest') ||
            titleLower.includes('diary') ||
            titleLower.includes('achievement') ||
            titleLower.includes('minigame') ||
            titleLower.includes('guide') ||
            titleLower.includes('music');

          if (!isLikelyNonMonster) {
            validFallbackNames.push(title);
          }
        }

        allMonsterNames = [...monsterNames, ...validFallbackNames];
      } catch (fallbackError) {
        console.warn('Fallback search failed, using category results only:', fallbackError);
      }
    }

    // Sort by relevance before processing
    const queryLower = query.toLowerCase();
    allMonsterNames.sort((a: string, b: string) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();

      // Exact matches first
      if (aLower === queryLower && bLower !== queryLower) return -1;
      if (bLower === queryLower && aLower !== queryLower) return 1;

      // Starts with query second
      if (aLower.startsWith(queryLower) && !bLower.startsWith(queryLower)) return -1;
      if (bLower.startsWith(queryLower) && !aLower.startsWith(queryLower)) return 1;

      // Shorter names for specificity
      if (aLower.startsWith(queryLower) && bLower.startsWith(queryLower)) {
        return a.length - b.length;
      }

      return a.localeCompare(b);
    });

    if (allMonsterNames.length === 0) {
      return {searchTerm: query, results: []};
    }

    // Get detailed data for found monsters
    const monsterPromises = allMonsterNames.slice(0, limit).map(async (title: string) => {
      const monsterData = await getMonsterDetails(title);
      return monsterData;
    });

    const monsters = await Promise.all(monsterPromises);
    const validMonsters = monsters.filter((monster): monster is OSRSMonster =>
      monster !== null && monster.drops.length > 0
    );

    // Cache the results for future searches
    try {
      const {monsterCache} = await import('./monster-cache');
      for (const monster of validMonsters) {
        monsterCache.setMonster(monster);
      }
      console.log(`Cached ${validMonsters.length} monsters from API search for "${query}"`);
    } catch (error) {
      console.warn('Failed to cache API results:', error);
    }

    return {searchTerm: query, results: validMonsters};
  } catch (error) {
    console.error('Error searching monsters:', error);
    // Fallback to original opensearch method
    return searchMonstersFallback(query, limit);
  }
}

async function searchMonstersFallback(query: string, limit: number = 10): Promise<OSRSSearchResponse> {
  try {
    const searchUrl = new URL(OSRS_WIKI_API_BASE);
    searchUrl.searchParams.set('action', 'opensearch');
    searchUrl.searchParams.set('search', query);
    searchUrl.searchParams.set('limit', (limit * 2).toString()); // Search more to filter for monsters
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('origin', '*');

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length < 4) {
      throw new Error('Invalid API response format');
    }

    const [searchTerm, titles] = data;

    // Filter and get detailed data for potential monsters
    const monsterPromises = titles.slice(0, limit).map(async (title: string) => {
      const monsterData = await getMonsterDetails(title);
      return monsterData;
    });

    const monsters = await Promise.all(monsterPromises);
    const validMonsters = monsters.filter((monster): monster is OSRSMonster =>
      monster !== null && monster.drops.length > 0
    );

    return {searchTerm: searchTerm, results: validMonsters};
  } catch (error) {
    console.error('Error in fallback search:', error);
    throw error;
  }
}

export async function getMonsterDetails(title: string): Promise<OSRSMonster | null> {
  try {
    // Get both page content and basic info
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

    const response = await fetch(detailsUrl.toString());

    if (!response.ok) {
      throw new Error(`Details fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    const pages = data.query?.pages;

    if (!pages) {
      return null;
    }

    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    if (pageId === '-1' || !page) {
      return null;
    }

    // Get the wikitext content
    const wikitext = page.revisions?.[0]?.['*'] || '';

    // Parse drops from wikitext
    const drops = parseDropsFromWikitext(wikitext);

    // Only return if we found drops (indicating this is likely a monster)
    if (drops.length === 0) {
      return null;
    }

    // Fetch images for all drop items (with error handling)
    let dropsWithImages = drops;
    try {
      const uniqueItemNames = [...new Set(drops.map(drop => drop.name))];
      const itemImages = await getMultipleItemImages(uniqueItemNames);

      // Add image URLs to drops
      dropsWithImages = drops.map(drop => ({
        ...drop,
        imageUrl: itemImages[drop.name] || undefined
      }));
    } catch (error) {
      console.warn('Failed to fetch item images, continuing without images:', error);
      // Continue with original drops without images
    }

    // Extract combat level and hitpoints from wikitext if available
    const combatLevelMatch = wikitext.match(/\|combat\s*=\s*(\d+)/i);
    const hitpointsMatch = wikitext.match(/\|hitpoints\s*=\s*(\d+)/i);

    return {
      title: page.title,
      url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      extract: page.extract || '',
      image: page.original?.source || '',
      drops: dropsWithImages,
      combatLevel: combatLevelMatch ? parseInt(combatLevelMatch[1]) : undefined,
      hitpoints: hitpointsMatch ? parseInt(hitpointsMatch[1]) : undefined
    };
  } catch (error) {
    console.error('Error fetching monster details:', error);
    return null;
  }
}

// Keep the old function for backward compatibility but rename to be clearer
export async function searchItems(query: string, limit: number = 10): Promise<OSRSSearchResponse> {
  return searchMonsters(query, limit);
}

export async function searchMonsterNames(query: string, limit: number = 10): Promise<string[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    // Use category-based search for more accurate monster filtering
    const searchUrl = new URL(OSRS_WIKI_API_BASE);
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('list', 'categorymembers');
    searchUrl.searchParams.set('cmtitle', 'Category:Monsters');
    searchUrl.searchParams.set('cmlimit', '500'); // Get more results to filter
    searchUrl.searchParams.set('cmtype', 'page');
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('origin', '*');

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.query?.categorymembers) {
      return [];
    }

    const monsters = data.query.categorymembers;

    // Filter monster names that match the query (case-insensitive)
    const queryLower = query.toLowerCase();
    const categoryResults = monsters
      .filter((monster: { title: string }) =>
        monster.title.toLowerCase().includes(queryLower)
      )
      .map((monster: { title: string }) => monster.title);

    // If we have few category results, also try opensearch to find pages like "Goblin"
    let allResults = categoryResults;
    if (categoryResults.length < 8) {
      try {
        const fallbackResults = await searchMonsterNamesFallback(query, limit * 2);

        // Filter fallback results to only include potential monsters by checking for drop data
        const validFallbackResults = [];
        for (const title of fallbackResults) {
          // Skip if we already have this from category search
          if (categoryResults.includes(title)) continue;

          // Quick check if this might be a monster by looking for common non-monster patterns
          const titleLower = title.toLowerCase();
          const isLikelyNonMonster =
            titleLower.includes('quest') ||
            titleLower.includes('diary') ||
            titleLower.includes('achievement') ||
            titleLower.includes('minigame') ||
            titleLower.includes('activity') ||
            titleLower.includes('guide') ||
            titleLower.includes('music') ||
            titleLower.includes('soundtrack') ||
            titleLower.includes('chathead') ||
            titleLower.includes('examine') ||
            titleLower.includes('dialogue');

          if (!isLikelyNonMonster) {
            validFallbackResults.push(title);
          }
        }

        allResults = [...categoryResults, ...validFallbackResults];
      } catch (fallbackError) {
        console.warn('Fallback name search failed:', fallbackError);
      }
    }

    // Sort results by relevance - exact matches first, then by length, then alphabetically
    const sortedResults = allResults.sort((a: string, b: string) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();

      // Exact matches first
      if (aLower === queryLower && bLower !== queryLower) return -1;
      if (bLower === queryLower && aLower !== queryLower) return 1;

      // Starts with query second
      if (aLower.startsWith(queryLower) && !bLower.startsWith(queryLower)) return -1;
      if (bLower.startsWith(queryLower) && !aLower.startsWith(queryLower)) return 1;

      // Shorter names (more specific) come before longer names
      if (aLower.startsWith(queryLower) && bLower.startsWith(queryLower)) {
        return a.length - b.length;
      }

      // Finally, alphabetical order
      return a.localeCompare(b);
    });

    return sortedResults.slice(0, limit);
  } catch (error) {
    console.error('Error searching monster names:', error);
    // Fallback to original opensearch method
    return searchMonsterNamesFallback(query, limit);
  }
}

async function searchMonsterNamesFallback(query: string, limit: number = 10): Promise<string[]> {
  try {
    const searchUrl = new URL(OSRS_WIKI_API_BASE);
    searchUrl.searchParams.set('action', 'opensearch');
    searchUrl.searchParams.set('search', query);
    searchUrl.searchParams.set('limit', limit.toString());
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('origin', '*');

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length < 2) {
      return [];
    }

    const [, titles] = data;
    return Array.isArray(titles) ? titles : [];
  } catch (error) {
    console.error('Error in fallback search:', error);
    return [];
  }
}

export async function getItemImage(itemName: string): Promise<string | null> {
  if (!itemName.trim()) {
    return null;
  }

  try {
    const imageUrl = new URL(OSRS_WIKI_API_BASE);
    imageUrl.searchParams.set('action', 'query');
    imageUrl.searchParams.set('titles', itemName);
    imageUrl.searchParams.set('prop', 'pageimages');
    imageUrl.searchParams.set('piprop', 'original');
    imageUrl.searchParams.set('format', 'json');
    imageUrl.searchParams.set('origin', '*');

    const response = await fetch(imageUrl.toString());

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const pages = data.query?.pages;

    if (!pages) {
      return null;
    }

    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    if (pageId === '-1' || !page) {
      return null;
    }

    return page.original?.source || null;
  } catch (error) {
    console.error('Error fetching item image:', error);
    return null;
  }
}

export async function getMultipleItemImages(itemNames: string[]): Promise<Record<string, string | null>> {
  if (itemNames.length === 0) {
    return {};
  }

  try {
    const imageUrl = new URL(OSRS_WIKI_API_BASE);
    imageUrl.searchParams.set('action', 'query');
    imageUrl.searchParams.set('titles', itemNames.join('|'));
    imageUrl.searchParams.set('prop', 'pageimages');
    imageUrl.searchParams.set('piprop', 'original');
    imageUrl.searchParams.set('format', 'json');
    imageUrl.searchParams.set('origin', '*');

    const response = await fetch(imageUrl.toString());

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    const pages = data.query?.pages;

    if (!pages) {
      return {};
    }

    const results: Record<string, string | null> = {};

    Object.values(pages as Record<string, { title?: string; original?: { source?: string } }>).forEach((page) => {
      if (page.title) {
        results[page.title] = page.original?.source || null;
      }
    });

    return results;
  } catch (error) {
    console.error('Error fetching multiple item images:', error);
    return {};
  }
}

export async function getItemDetails(title: string): Promise<OSRSItem | null> {
  try {
    const detailsUrl = new URL(OSRS_WIKI_API_BASE);
    detailsUrl.searchParams.set('action', 'query');
    detailsUrl.searchParams.set('titles', title);
    detailsUrl.searchParams.set('prop', 'extracts|pageimages');
    detailsUrl.searchParams.set('format', 'json');
    detailsUrl.searchParams.set('exintro', '1');
    detailsUrl.searchParams.set('explaintext', '1');
    detailsUrl.searchParams.set('piprop', 'original');
    detailsUrl.searchParams.set('origin', '*');

    const response = await fetch(detailsUrl.toString());

    if (!response.ok) {
      throw new Error(`Details fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    const pages = data.query?.pages;

    if (!pages) {
      return null;
    }

    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    if (pageId === '-1' || !page) {
      return null;
    }

    return {
      title: page.title,
      url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      extract: page.extract || '',
      image: page.original?.source || ''
    };
  } catch (error) {
    console.error('Error fetching item details:', error);
    return null;
  }
}