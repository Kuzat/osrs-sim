import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type OSRSMonster, getMonsterDetails } from '@/lib/osrs-api';
import { SimulationClient } from './simulation-client';

interface Props {
  params: Promise<{ monster: string }>;
}

// Unified function for fetching monster data with consistent caching
async function getMonsterData(monsterName: string): Promise<OSRSMonster | null> {
  // Use direct API call for consistency between metadata and component
  // Next.js will automatically cache this between the two calls
  return await getMonsterDetails(monsterName);
}

// Generate metadata for each monster page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { monster: encodedMonsterName } = await params;
  const monsterName = decodeURIComponent(encodedMonsterName);
  
  try {
    const monsterData = await getMonsterData(monsterName);
    
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

export default async function MonsterSimulatePage({ params }: Props) {
  const { monster: encodedMonsterName } = await params;
  const monsterName = decodeURIComponent(encodedMonsterName);
  
  // Server-side data fetching - Next.js will reuse the cached result from generateMetadata
  let monsterData: OSRSMonster | null = null;
  
  try {
    monsterData = await getMonsterData(monsterName);
    
    if (!monsterData || monsterData.drops.length === 0) {
      notFound();
    }
  } catch (error) {
    console.error('Error fetching monster data server-side:', error);
    notFound();
  }

  return (
    <>
      <SimulationClient 
        initialMonsterData={monsterData}
        encodedMonsterName={encodedMonsterName}
      />
    </>
  );
}