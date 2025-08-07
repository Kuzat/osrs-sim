import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type OSRSMonster, getMonsterDetails } from '@/lib/osrs-api';
import { getCalculatorStructuredData } from '@/lib/structured-data';
import { SimulationClient } from './simulation-client';

interface Props {
  params: Promise<{ monster: string }>;
}

// Generate metadata for each monster page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { monster: encodedMonsterName } = await params;
  const monsterName = decodeURIComponent(encodedMonsterName);
  
  try {
    const monsterData = await getMonsterDetails(monsterName);
    
    if (!monsterData) {
      return {
        title: 'Monster Not Found - OSRS Loot Simulator',
        description: 'The requested monster could not be found. Try searching for a different monster.',
      };
    }

    const title = `${monsterData.title} Loot Simulator - OSRS Drop Calculator`;
    const description = `Simulate ${monsterData.title} loot drops with accurate OSRS mechanics. Calculate drop rates, view drop tables, and analyze loot probabilities. ${monsterData.drops.length} unique drops available.`;
    
    return {
      title,
      description,
      keywords: [
        `${monsterData.title} drops`,
        `${monsterData.title} loot simulator`,
        `OSRS ${monsterData.title}`,
        `${monsterData.title} drop table`,
        `${monsterData.title} drop rates`,
        'OSRS loot simulator',
        'Old School RuneScape drop calculator'
      ],
      openGraph: {
        title,
        description,
        url: `/simulate/${encodedMonsterName}`,
        siteName: 'OSRS Monster LootSim',
        locale: 'en_US',
        type: 'website',
        images: monsterData.image ? [{
          url: monsterData.image,
          width: 150,
          height: 150,
          alt: `${monsterData.title} monster image`,
        }] : undefined,
      },
      twitter: {
        card: 'summary',
        title,
        description,
        creator: '@osrs_loot_sim',
        images: monsterData.image ? [monsterData.image] : undefined,
      },
      alternates: {
        canonical: `/simulate/${encodedMonsterName}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Error - OSRS Loot Simulator',
      description: 'An error occurred while loading monster data.',
    };
  }
}

// Cache monster data for 1 hour (3600 seconds)
async function getCachedMonsterData(monsterName: string): Promise<OSRSMonster | null> {
  try {
    // Using Next.js fetch with cache control
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/monsters/details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: monsterName }),
      next: { 
        revalidate: 3600 // Cache for 1 hour
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.monster;
    }
  } catch (error) {
    console.warn('API route failed, falling back to direct fetch:', error);
  }

  // Fallback to direct API call
  return await getMonsterDetails(monsterName);
}

export default async function MonsterSimulatePage({ params }: Props) {
  const { monster: encodedMonsterName } = await params;
  const monsterName = decodeURIComponent(encodedMonsterName);
  
  // Server-side data fetching with caching
  let monsterData: OSRSMonster | null = null;
  
  try {
    monsterData = await getCachedMonsterData(monsterName);
    
    if (!monsterData || monsterData.drops.length === 0) {
      notFound();
    }
  } catch (error) {
    console.error('Error fetching monster data server-side:', error);
    notFound();
  }

  // Generate structured data for SEO
  const calculatorStructuredData = getCalculatorStructuredData(monsterData.title);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorStructuredData) }}
      />
      <SimulationClient 
        initialMonsterData={monsterData}
        encodedMonsterName={encodedMonsterName}
      />
    </>
  );
}