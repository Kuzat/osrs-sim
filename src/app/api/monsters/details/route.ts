import { NextRequest, NextResponse } from 'next/server';
import { getMonsterDetails } from '@/lib/osrs-api';

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Monster name is required' },
        { status: 400 }
      );
    }

    const monster = await getMonsterDetails(name);
    
    if (!monster) {
      return NextResponse.json(
        { error: 'Monster not found' },
        { status: 404 }
      );
    }

    // Add cache headers for better performance
    const response = NextResponse.json({ monster });
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
    
    return response;
  } catch (error) {
    console.error('Error fetching monster details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}