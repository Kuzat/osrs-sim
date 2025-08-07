"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ItemIcon } from "@/components/ui/item-icon";
import { Tooltip } from "@/components/ui/tooltip";
import { type OSRSMonster, type OSRSDrop } from "@/lib/osrs-api";
import { getCalculatorStructuredData } from "@/lib/structured-data";
import { Breadcrumb } from "@/components/ui/breadcrumb";

interface SimulationResult {
  itemName: string;
  quantity: number;
  timesDropped: number;
  category: string;
  rarity: string;
  imageUrl?: string;
}

interface SimulationStats {
  totalKills: number;
  totalItems: number;
  uniqueItems: number;
  results: SimulationResult[];
}

interface SimulationClientProps {
  initialMonsterData: OSRSMonster;
  encodedMonsterName: string;
}

export function SimulationClient({ initialMonsterData }: SimulationClientProps) {
  const router = useRouter();
  const [killCount, setKillCount] = useState(1000);
  const [simulationResults, setSimulationResults] = useState<SimulationStats | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Store monster data in sessionStorage for potential fallback compatibility
  useEffect(() => {
    try {
      sessionStorage.setItem('simulationMonster', JSON.stringify(initialMonsterData));
    } catch (error) {
      console.warn('Failed to store monster data in sessionStorage:', error);
    }
  }, [initialMonsterData]);

  // Generate structured data on client side to avoid hydration issues
  useEffect(() => {
    const calculatorStructuredData = getCalculatorStructuredData(initialMonsterData.title);
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(calculatorStructuredData);
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      document.head.removeChild(script);
    };
  }, [initialMonsterData.title]);

  const parseDropRate = (rarity: string): number => {
    if (rarity.toLowerCase() === 'always' || rarity === '100%') {
      return 1.0;
    }
    
    // Handle fractions like "1/128", "1/5000", etc.
    const fractionMatch = rarity.match(/(\d+)\/(\d+)/);
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1]);
      const denominator = parseInt(fractionMatch[2]);
      return numerator / denominator;
    }
    
    // Handle percentages like "50%", "12.5%"
    const percentMatch = rarity.match(/(\d+(?:\.\d+)?)%/);
    if (percentMatch) {
      return parseFloat(percentMatch[1]) / 100;
    }
    
    // Default to very rare for unknown formats
    return 0.001;
  };

  const parseQuantity = (quantityString: string): number => {
    // Handle ranges like "200,300" or "1-3" or "10–15" or "5, 10" or "100-200"
    const rangeMatch = quantityString.match(/(\d+)[\s,\-–]+(\d+)/);
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1]);
      const max = parseInt(rangeMatch[2]);
      // Return a random number between min and max (inclusive)
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // Handle single numbers, extracting only the first number found
    const singleMatch = quantityString.match(/(\d+)/);
    if (singleMatch) {
      return parseInt(singleMatch[1]);
    }
    
    // Default to 1 if no number found
    return 1;
  };

  const simulateKills = () => {
    setIsSimulating(true);
    
    // Use setTimeout to prevent blocking the UI
    setTimeout(() => {
      const results: { [key: string]: SimulationResult } = {};
      
      // Group drops by type
      const alwaysDrops = initialMonsterData.drops.filter(drop => 
        drop.rarity.toLowerCase() === 'always' || drop.category === '100%'
      );
      const tertiaryDrops = initialMonsterData.drops.filter(drop => 
        drop.category.toLowerCase() === 'tertiary'
      );
      const mainTableDrops = initialMonsterData.drops.filter(drop => 
        drop.rarity.toLowerCase() !== 'always' && 
        drop.category !== '100%' && 
        drop.category.toLowerCase() !== 'tertiary'
      );
      
      // Calculate weights for main drop table based on wiki drop rates
      const mainTableWeights = mainTableDrops.map(drop => {
        // Parse the actual weight from fraction format (e.g., "3/128" -> weight = 3)
        const fractionMatch = drop.rarity.match(/(\d+)\/(\d+)/);
        if (fractionMatch) {
          return { drop, weight: parseInt(fractionMatch[1]) };
        }
        
        // Handle percentage format
        const percentMatch = drop.rarity.match(/(\d+(?:\.\d+)?)%/);
        if (percentMatch) {
          const percent = parseFloat(percentMatch[1]);
          return { drop, weight: Math.round(percent * 1.28) }; // Convert to ~128 scale
        }
        
        // Default weight for unknown formats
        return { drop, weight: 1 };
      });
      
      // FIXED: Use standard OSRS drop table denominator (128) instead of sum of weights
      // This ensures correct probability distribution matching wiki drop rates
      const totalMainWeight = 128;
      const currentWeightSum = mainTableWeights.reduce((sum, item) => sum + item.weight, 0);
      
      // Validate that weights don't exceed the total (should not happen with proper wiki data)
      if (currentWeightSum > totalMainWeight) {
        console.warn(`Drop table weights (${currentWeightSum}) exceed expected total (${totalMainWeight}) for ${initialMonsterData.title}`);
      }
      
      for (let kill = 0; kill < killCount; kill++) {
        // 1. Always drops (bones, guaranteed items)
        alwaysDrops.forEach((drop) => {
          const key = `${drop.name}-${drop.category}`;
          if (!results[key]) {
            results[key] = {
              itemName: drop.name,
              quantity: 0,
              timesDropped: 0,
              category: drop.category,
              rarity: drop.rarity,
              imageUrl: drop.imageUrl
            };
          }
          
          const quantityToAdd = parseQuantity(drop.quantity);
          results[key].quantity += quantityToAdd;
          results[key].timesDropped += 1;
        });
        
        // 2. Main drop table (exactly one item per kill, or nothing if weights don't fill table)
        if (mainTableWeights.length > 0) {
          const random = Math.random() * totalMainWeight;
          let currentWeight = 0;
          
          for (const { drop, weight } of mainTableWeights) {
            currentWeight += weight;
            if (random <= currentWeight) {
              const key = `${drop.name}-${drop.category}`;
              if (!results[key]) {
                results[key] = {
                  itemName: drop.name,
                  quantity: 0,
                  timesDropped: 0,
                  category: drop.category,
                  rarity: drop.rarity,
                  imageUrl: drop.imageUrl
                };
              }
              
              const quantityToAdd = parseQuantity(drop.quantity);
              results[key].quantity += quantityToAdd;
              results[key].timesDropped += 1;
              break;
            }
          }
          // If random > currentWeight, it means "nothing" was rolled (valid in OSRS)
          // This happens when drop weights don't sum to 128 (e.g., rare drop tables)
        }
        
        // 3. Tertiary drops (independent rolls)
        tertiaryDrops.forEach((drop) => {
          const dropRate = parseDropRate(drop.rarity);
          const random = Math.random();
          
          if (random < dropRate) {
            const key = `${drop.name}-${drop.category}`;
            if (!results[key]) {
              results[key] = {
                itemName: drop.name,
                quantity: 0,
                timesDropped: 0,
                category: drop.category,
                rarity: drop.rarity,
                imageUrl: drop.imageUrl
              };
            }
            
            const quantityToAdd = parseQuantity(drop.quantity);
            results[key].quantity += quantityToAdd;
            results[key].timesDropped += 1;
          }
        });
      }
      
      const sortedResults = Object.values(results).sort((a, b) => b.timesDropped - a.timesDropped);
      
      setSimulationResults({
        totalKills: killCount,
        totalItems: sortedResults.reduce((sum, result) => sum + result.quantity, 0),
        uniqueItems: sortedResults.length,
        results: sortedResults
      });
      
      setIsSimulating(false);
    }, 100);
  };

  return (
    <div className="min-h-screen p-8 w-full max-w-6xl">
      <div className="mb-6">
        <Breadcrumb 
          items={[
            { label: "Loot Simulator", href: "/" },
            { label: initialMonsterData.title + " Simulation", current: true }
          ]}
        />
        
        <Button 
          variant="outline" 
          onClick={() => router.push('/')}
          className="mb-4"
        >
          ← Back to Search
        </Button>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">OSRS Monster LootSim</h1>
          <div className="flex items-center justify-center gap-4 mb-2">
            {initialMonsterData.image && (
              <img
                src={initialMonsterData.image}
                alt={initialMonsterData.title}
                className="w-16 h-16 rounded-lg object-cover border bg-muted/20"
                loading="eager"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <h2 className="text-2xl text-muted-foreground">{initialMonsterData.title}</h2>
          </div>
          {initialMonsterData.combatLevel && (
            <p className="text-sm text-muted-foreground mt-2">
              Combat Level: {initialMonsterData.combatLevel}
              {initialMonsterData.hitpoints && ` • Hitpoints: ${initialMonsterData.hitpoints}`}
            </p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Simulation Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Simulation Settings</CardTitle>
            <CardDescription>
              Configure your loot simulation parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="killCount" className="block text-sm font-medium mb-2">
                Number of Kills
              </label>
              <Input
                id="killCount"
                type="number"
                value={killCount}
                onChange={(e) => setKillCount(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="100000"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Simulate between 1 and 100,000 kills
              </p>
            </div>
            
            <Button 
              onClick={simulateKills} 
              disabled={isSimulating}
              className="w-full"
              size="lg"
            >
              {isSimulating ? "Simulating..." : `Simulate ${killCount.toLocaleString()} Kills`}
            </Button>
            
            {simulationResults && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Simulation Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Kills:</span>
                    <div className="font-mono">{simulationResults.totalKills.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Items Received:</span>
                    <div className="font-mono">{simulationResults.totalItems.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unique Items:</span>
                    <div className="font-mono">{simulationResults.uniqueItems}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Items per Kill:</span>
                    <div className="font-mono">
                      {(simulationResults.totalItems / simulationResults.totalKills).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drop Table Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Drop Table Reference</CardTitle>
            <CardDescription>
              All possible drops for {initialMonsterData.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {Object.entries(
              initialMonsterData.drops.reduce((acc, drop) => {
                if (!acc[drop.category]) acc[drop.category] = [];
                acc[drop.category].push(drop);
                return acc;
              }, {} as Record<string, OSRSDrop[]>)
            ).map(([category, drops]) => (
              <div key={category} className="mb-4">
                <h5 className="font-medium text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                  {category}
                </h5>
                <div className="space-y-1">
                  {drops.map((drop, dropIndex) => (
                    <div key={dropIndex} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <ItemIcon 
                          src={drop.imageUrl} 
                          alt={drop.name}
                          size="sm"
                        />
                        <span>{drop.name} (×{drop.quantity})</span>
                      </div>
                      <span className="font-mono text-muted-foreground">{drop.rarity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Simulation Results */}
      {simulationResults && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Simulation Results</CardTitle>
                <CardDescription>
                  Items obtained from {simulationResults.totalKills.toLocaleString()} simulated kills
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {simulationResults.results.length > 0 ? (
              viewMode === 'list' ? (
                <div className="space-y-2">
                  {simulationResults.results.map((result, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <ItemIcon 
                          src={result.imageUrl} 
                          alt={result.itemName}
                          size="md"
                        />
                        <div>
                          <div className="font-medium">{result.itemName}</div>
                          <div className="text-sm text-muted-foreground">
                            {result.category} • Expected rate: {result.rarity}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-lg">×{result.quantity.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.timesDropped} drops ({((result.timesDropped / simulationResults.totalKills) * 100).toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                  {simulationResults.results.map((result, index) => (
                    <Tooltip
                      key={index}
                      content={
                        <div className="text-center">
                          <div className="font-medium">{result.itemName}</div>
                          <div className="text-sm opacity-90">×{result.quantity.toLocaleString()}</div>
                          <div className="text-xs opacity-75">
                            {result.timesDropped} drops ({((result.timesDropped / simulationResults.totalKills) * 100).toFixed(2)}%)
                          </div>
                          <div className="text-xs opacity-75 mt-1">
                            {result.category} • {result.rarity}
                          </div>
                        </div>
                      }
                    >
                      <div className="relative p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                        <ItemIcon 
                          src={result.imageUrl} 
                          alt={result.itemName}
                          size="lg"
                          className="mx-auto"
                        />
                        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-mono px-1 rounded-sm min-w-[20px] text-center">
                          {result.quantity > 999 ? `${Math.floor(result.quantity / 1000)}k` : result.quantity}
                        </div>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No items were dropped in this simulation.</p>
                <p className="text-sm mt-1">Try increasing the kill count or the monster may have very rare drops.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}