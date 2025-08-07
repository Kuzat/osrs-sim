"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Autocomplete } from "@/components/ui/autocomplete";
import { ItemIcon } from "@/components/ui/item-icon";
import { CacheStatus } from "@/components/cache-status";
import { searchItems, searchMonsterNames, type OSRSMonster, type OSRSDrop } from "@/lib/osrs-api";
import { useDebounce } from "@/hooks/useDebounce";
import { getWebsiteStructuredData, getGameStructuredData } from "@/lib/structured-data";
import { FAQSection } from "@/components/faq-section";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OSRSMonster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autocompleteOptions, setAutocompleteOptions] = useState<{value: string; label: string}[]>([]);
  const [isLoadingAutocomplete, setIsLoadingAutocomplete] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMeta, setSearchMeta] = useState<{source?: 'cache' | 'api', searchTime?: number} | null>(null);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const handleSearch = async () => {
    performSearch();
  };

  useEffect(() => {
    const fetchAutocomplete = async () => {
      if (debouncedSearchQuery.length < 2) {
        setAutocompleteOptions([]);
        return;
      }

      setIsLoadingAutocomplete(true);
      try {
        const names = await searchMonsterNames(debouncedSearchQuery, 8);
        
        // Always include the typed text as the first option if it doesn't exactly match any suggestion
        const suggestions = names.map(name => ({ value: name, label: name }));
        const typedText = debouncedSearchQuery.trim();
        const exactMatch = suggestions.some(option => 
          option.value.toLowerCase() === typedText.toLowerCase()
        );
        
        if (!exactMatch && typedText.length > 0) {
          suggestions.unshift({ 
            value: typedText, 
            label: `Search for "${typedText}"` 
          });
        }
        
        setAutocompleteOptions(suggestions);
      } catch (error) {
        console.error('Autocomplete search failed:', error);
        setAutocompleteOptions([]);
      } finally {
        setIsLoadingAutocomplete(false);
      }
    };

    fetchAutocomplete();
  }, [debouncedSearchQuery]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleAutocompleteSelect = (option: {value: string; label: string}) => {
    setSearchQuery(option.value);
    // Trigger search immediately with the selected option
    setTimeout(() => {
      performSearch(option.value);
    }, 0);
  };

  const performSearch = async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setSearchMeta(null);

    const startTime = Date.now();

    try {
      // Try API route first (which has cache integration)
      try {
        const response = await fetch(`/api/monsters/search?q=${encodeURIComponent(searchTerm)}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
          setSearchMeta({
            source: data.cached ? 'cache' : 'api',
            searchTime: Date.now() - startTime
          });
          return;
        }
      } catch (apiError) {
        console.warn('API route failed, falling back to direct search:', apiError);
      }

      // Fallback to direct API call
      const response = await searchItems(searchTerm);
      setSearchResults(response.results);
      setSearchMeta({
        source: 'api',
        searchTime: Date.now() - startTime
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setSearchResults([]);
      setSearchMeta(null);
    } finally {
      setIsLoading(false);
    }
  };

  const websiteStructuredData = getWebsiteStructuredData();
  const gameStructuredData = getGameStructuredData();

  return (
    <div className="min-h-screen p-8 w-full max-w-6xl md:mt-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(gameStructuredData) }}
      />
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">OSRS Loot Simulator - Monster Drop Calculator</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Free Old School RuneScape loot simulator with accurate drop mechanics
        </p>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-base text-muted-foreground/80 mb-4">
            Calculate monster drop rates, simulate loot tables, and analyze probabilities for 1000+ OSRS monsters. 
            Get realistic drop simulation results up to 100,000 kills with accurate game mechanics.
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground/70">
            <span className="bg-muted px-2 py-1 rounded">Drop Rate Calculator</span>
            <span className="bg-muted px-2 py-1 rounded">Loot Simulation</span>
            <span className="bg-muted px-2 py-1 rounded">OSRS Wiki Integration</span>
            <span className="bg-muted px-2 py-1 rounded">Probability Analysis</span>
          </div>
        </div>
      </header>

      <main className="space-y-8">
        <CacheStatus />
        <Card>
          <CardHeader>
            <CardTitle>Monster Drop Search</CardTitle>
            <CardDescription>
              Search for monsters and view their drop tables with rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Autocomplete
                options={autocompleteOptions}
                value={searchQuery}
                onChange={setSearchQuery}
                onSelect={handleAutocompleteSelect}
                onKeyPress={handleKeyPress}
                placeholder="Search for monsters (e.g., 'cow', 'goblin', 'giant')..."
                isLoading={isLoadingAutocomplete}
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </CardContent>
        </Card>

        {searchResults.length > 0 && (
          <div className="space-y-6">
            <Card className="border-muted">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Found {searchResults.length} monster{searchResults.length !== 1 ? 's' : ''}
                    </span>
                    {searchMeta?.source && (
                      <span className={`text-xs px-2 py-1 rounded font-mono ${
                        searchMeta.source === 'cache' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {searchMeta.source === 'cache' ? 'CACHE' : 'API'}
                      </span>
                    )}
                  </div>
                  {searchMeta?.searchTime && (
                    <span className="text-xs text-muted-foreground">
                      {searchMeta.searchTime}ms
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
            {searchResults.map((monster, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                      {monster.image && (
                        <div className="flex-shrink-0">
                          <img
                            src={monster.image}
                            alt={monster.title}
                            className="w-16 h-16 rounded-lg object-cover border bg-muted/20"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-xl">{monster.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {monster.combatLevel && `Combat Level: ${monster.combatLevel}`}
                          {monster.combatLevel && monster.hitpoints && ' • '}
                          {monster.hitpoints && `Hitpoints: ${monster.hitpoints}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => {
                          // Store monster data in sessionStorage for the simulation page
                          sessionStorage.setItem('simulationMonster', JSON.stringify({
                            title: monster.title,
                            drops: monster.drops,
                            combatLevel: monster.combatLevel,
                            hitpoints: monster.hitpoints
                          }));
                          window.location.href = `/simulate?name=${encodeURIComponent(monster.title)}`;
                        }}
                      >
                        Simulate Drops
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={monster.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View on Wiki →
                        </a>
                      </Button>
                    </div>
                  </div>
                  {monster.extract && (
                    <p className="text-sm text-muted-foreground mt-3">
                      {monster.extract.length > 200 
                        ? `${monster.extract.substring(0, 200)}...` 
                        : monster.extract
                      }
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <h4 className="font-semibold mb-4">Drop Table ({monster.drops.length} items)</h4>
                  
                  {/* Group drops by category */}
                  {Object.entries(
                    monster.drops.reduce((acc, drop) => {
                      if (!acc[drop.category]) acc[drop.category] = [];
                      acc[drop.category].push(drop);
                      return acc;
                    }, {} as Record<string, OSRSDrop[]>)
                  ).map(([category, drops]) => (
                    <div key={category} className="mb-6">
                      <h5 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                        {category}
                      </h5>
                      <div className="grid gap-2">
                        {drops.map((drop, dropIndex) => (
                          <div
                            key={dropIndex}
                            className="flex justify-between items-center p-3 border rounded-lg bg-muted/20"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <ItemIcon 
                                src={drop.imageUrl} 
                                alt={drop.name}
                                size="md"
                              />
                              <div>
                                <span className="font-medium">{drop.name}</span>
                                {drop.quantity !== '1' && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    (×{drop.quantity})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-sm font-mono bg-background px-2 py-1 rounded border">
                              {drop.rarity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {searchResults.length === 0 && searchQuery && !isLoading && !error && hasSearched && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                No monsters found with drop data for &quot;{searchQuery}&quot;
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try searching for monster names like cow, goblin, or giant
              </p>
            </CardContent>
          </Card>
        )}

        <FAQSection />
      </main>
    </div>
  );
}
