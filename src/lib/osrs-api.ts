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
  }
  
  return drops;
}

function parseTemplateParams(paramString: string): Record<string, string> {
  const params: Record<string, string> = {};
  const pairs = paramString.split('|');
  
  pairs.forEach(pair => {
    const [key, ...valueParts] = pair.split('=');
    if (key && valueParts.length > 0) {
      params[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  return params;
}

export async function searchMonsters(query: string, limit: number = 10): Promise<OSRSSearchResponse> {
  if (!query.trim()) {
    return { searchTerm: query, results: [] };
  }

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

    return { searchTerm, results: validMonsters };
  } catch (error) {
    console.error('Error searching monsters:', error);
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
    
    // Extract combat level and hitpoints from wikitext if available
    const combatLevelMatch = wikitext.match(/\|combat\s*=\s*(\d+)/i);
    const hitpointsMatch = wikitext.match(/\|hitpoints\s*=\s*(\d+)/i);

    return {
      title: page.title,
      url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      extract: page.extract || '',
      image: page.original?.source || '',
      drops,
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
    console.error('Error searching monster names:', error);
    return [];
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