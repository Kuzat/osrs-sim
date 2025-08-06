#!/usr/bin/env node

/**
 * Build a sample cache with popular OSRS monsters for testing
 */

const { MonsterCacheBuilder } = require('./build-monster-cache.js');

async function buildSampleCache() {
  if (!global.fetch) {
    const fetch = (await import('node-fetch')).default;
    global.fetch = fetch;
  }

  console.log('🏗️  Building Sample OSRS Monster Cache...\n');
  
  // Popular monsters for testing
  const popularMonsters = [
    'Cow', 'Goblin', 'Hill Giant', 'Dragon', 'Zombie', 'Skeleton',
    'Giant rat', 'Spider', 'Chicken', 'Fire giant', 'Moss giant',
    'Ice giant', 'Giant spider', 'Minotaur', 'Ogre', 'Troll'
  ];
  
  const builder = new MonsterCacheBuilder();
  
  console.log(`🎯 Building cache for ${popularMonsters.length} popular monsters...\n`);
  
  for (const monsterName of popularMonsters) {
    try {
      console.log(`Fetching ${monsterName}...`);
      const monster = await builder.fetchMonsterDetails(monsterName);
      
      if (monster) {
        builder.monsters.set(monsterName, monster);
        console.log(`  ✅ ${monsterName} (${monster.drops.length} drops)`);
      } else {
        console.log(`  ⏭️  ${monsterName} (no drops found)`);
      }
      
      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`  ❌ Error fetching ${monsterName}:`, error.message);
    }
  }
  
  await builder.saveCache();
  console.log('\n🎉 Sample cache built successfully!');
}

buildSampleCache().catch(console.error);