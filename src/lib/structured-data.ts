export function getWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'OSRS Monster LootSim',
    description: 'Search Old School RuneScape monsters and simulate their drop tables. View detailed loot statistics and probabilities with accurate OSRS drop mechanics.',
    url: 'https://osrs-loot-sim.vercel.app',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Organization',
      name: 'OSRS Monster LootSim',
    },
    keywords: ['OSRS', 'Old School RuneScape', 'loot simulator', 'drop table', 'monster drops', 'RuneScape calculator'],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'Monster drop table search',
      'Loot simulation up to 100,000 kills',
      'Probability calculations',
      'OSRS Wiki integration',
      'Real-time search results',
    ],
  };
}

export function getCalculatorStructuredData(monsterName?: string) {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: monsterName 
      ? `${monsterName} Loot Simulator - OSRS Drop Calculator`
      : 'OSRS Monster Drop Calculator',
    description: monsterName
      ? `Simulate ${monsterName} drops from Old School RuneScape. Calculate loot probabilities and drop rates with accurate OSRS mechanics.`
      : 'Calculate drop rates and simulate loot from Old School RuneScape monsters with accurate game mechanics.',
    url: monsterName 
      ? `https://osrs-loot-sim.vercel.app/simulate/${encodeURIComponent(monsterName)}`
      : 'https://osrs-loot-sim.vercel.app',
    applicationCategory: 'CalculatorApplication',
    operatingSystem: 'Web Browser',
    about: {
      '@type': 'VideoGame',
      name: 'Old School RuneScape',
      publisher: 'Jagex',
    },
  };

  if (monsterName) {
    return {
      ...baseData,
      potentialAction: {
        '@type': 'CalculateAction',
        description: `Calculate ${monsterName} loot drops`,
        target: `https://osrs-loot-sim.vercel.app/simulate/${encodeURIComponent(monsterName)}`,
      },
    };
  }

  return baseData;
}

export function getGameStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'Old School RuneScape',
    alternateName: 'OSRS',
    description: 'Old School RuneScape is a massively multiplayer online role-playing game.',
    publisher: {
      '@type': 'Organization',
      name: 'Jagex',
    },
    genre: 'MMORPG',
    gamePlatform: ['PC', 'Mobile', 'Web Browser'],
    operatingSystem: ['Windows', 'macOS', 'Android', 'iOS'],
  };
}