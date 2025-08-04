"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type OSRSMonster, type OSRSDrop, getMonsterDetails } from "@/lib/osrs-api";

interface SimulationResult {
  itemName: string;
  quantity: number;
  timesDropped: number;
  category: string;
  rarity: string;
}

interface SimulationStats {
  totalKills: number;
  totalItems: number;
  uniqueItems: number;
  results: SimulationResult[];
}

function SimulateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [monster, setMonster] = useState<OSRSMonster | null>(null);
  const [killCount, setKillCount] = useState(1000);
  const [simulationResults, setSimulationResults] = useState<SimulationStats | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const monsterName = searchParams.get('name');
    if (monsterName) {
      try {
        // Try to get monster data from sessionStorage first
        const storedMonster = sessionStorage.getItem('simulationMonster');
        if (storedMonster) {
          const parsedMonster = JSON.parse(storedMonster);
          if (parsedMonster.title === decodeURIComponent(monsterName)) {
            setMonster({
              ...parsedMonster,
              url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(parsedMonster.title.replace(/ /g, '_'))}`,
              extract: ''
            });
            return;
          }
        }
        
        // If no stored data or mismatch, try to fetch from API as fallback
        console.log('No stored monster data, attempting to fetch from API...');
        const fetchMonsterData = async () => {
          try {
            const monsterData = await getMonsterDetails(decodeURIComponent(monsterName));
            if (monsterData && monsterData.drops.length > 0) {
              setMonster(monsterData);
            } else {
              console.error('Failed to fetch monster data or no drops found');
              router.push('/');
            }
          } catch (error) {
            console.error('Error fetching monster data:', error);
            router.push('/');
          }
        };
        fetchMonsterData();
      } catch (error) {
        console.error('Error loading monster data:', error);
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [searchParams, router]);

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

  const simulateKills = () => {
    if (!monster) return;

    setIsSimulating(true);
    
    // Use setTimeout to prevent blocking the UI
    setTimeout(() => {
      const results: { [key: string]: SimulationResult } = {};
      
      for (let kill = 0; kill < killCount; kill++) {
        monster.drops.forEach((drop) => {
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
                rarity: drop.rarity
              };
            }
            
            const quantityToAdd = parseInt(drop.quantity.replace(/[^\d]/g, '')) || 1;
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

  if (!monster) {
    return (
      <div className="min-h-screen p-8 max-w-4xl mx-auto">
        <div className="text-center">
          <p>Loading monster data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.push('/')}
          className="mb-4"
        >
          ← Back to Search
        </Button>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Loot Simulator</h1>
          <h2 className="text-2xl text-muted-foreground">{monster.title}</h2>
          {monster.combatLevel && (
            <p className="text-sm text-muted-foreground mt-2">
              Combat Level: {monster.combatLevel}
              {monster.hitpoints && ` • Hitpoints: ${monster.hitpoints}`}
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
              All possible drops for {monster.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {Object.entries(
              monster.drops.reduce((acc, drop) => {
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
                    <div key={dropIndex} className="flex justify-between text-sm">
                      <span>{drop.name} (×{drop.quantity})</span>
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
            <CardTitle>Simulation Results</CardTitle>
            <CardDescription>
              Items obtained from {simulationResults.totalKills.toLocaleString()} simulated kills
            </CardDescription>
          </CardHeader>
          <CardContent>
            {simulationResults.results.length > 0 ? (
              <div className="space-y-2">
                {simulationResults.results.map((result, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{result.itemName}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.category} • Expected rate: {result.rarity}
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

export default function SimulatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-8 max-w-4xl mx-auto">
        <div className="text-center">
          <p>Loading simulation...</p>
        </div>
      </div>
    }>
      <SimulateContent />
    </Suspense>
  );
}