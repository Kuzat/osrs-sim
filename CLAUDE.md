# LootSim - OSRS Monster Drop Table Explorer

## Project Overview
LootSim is a Next.js application that integrates with the Old School RuneScape Wiki API to search for monsters and display their complete drop tables with rates. Users can search for any monster and view organized drop information including rarities, quantities, and categories.

## Tech Stack
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **API**: Old School RuneScape Wiki MediaWiki API
- **Build Tools**: ESLint, PostCSS

## Key Features
- Monster search with real-time API integration
- Wikitext parsing for drop table extraction
- Categorized drop displays (100%, Tertiary, etc.)
- **Loot simulation engine** - simulate killing monsters up to 100,000 times
- Drop probability calculator with statistical analysis
- Combat stats display (level, hitpoints)
- Responsive design with loading states
- Direct links to OSRS Wiki pages

## Architecture

### API Integration (`src/lib/osrs-api.ts`)
- **Base URL**: `https://oldschool.runescape.wiki/api.php`
- **Search Endpoint**: Uses OpenSearch action for monster discovery
- **Content Endpoint**: Uses query action with revisions prop for wikitext
- **Parser**: Custom wikitext parser for `{{DropsLine}}` templates

### Data Models
```typescript
interface OSRSMonster {
  title: string;
  url: string;
  extract?: string;
  image?: string;
  drops: OSRSDrop[];
  combatLevel?: number;
  hitpoints?: number;
}

interface OSRSDrop {
  name: string;
  quantity: string;
  rarity: string;
  category: string;
}
```

### Core Functions
- `searchMonsters()`: Searches and filters for monsters with drop data
- `getMonsterDetails()`: Fetches full monster info including wikitext
- `parseDropsFromWikitext()`: Parses wiki markup for drop information
- `parseTemplateParams()`: Utility for parsing template parameters

## Development Commands
```bash
# Development server
npm run dev

# Production build
npm run build

# Linting
npm run lint

# Add new Shadcn components
npx shadcn@latest add [component-name]
```

## Project Structure
```
src/
├── app/
│   ├── page.tsx              # Main search interface
│   ├── simulate/
│   │   └── page.tsx          # Loot simulation page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   └── ui/                   # Shadcn UI components
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
└── lib/
    ├── osrs-api.ts           # OSRS Wiki API service
    └── utils.ts              # Utility functions
```

## OSRS Wiki API Details

### Search Pattern
```
GET /api.php?action=opensearch&search={query}&limit=10&format=json&origin=*
```

### Monster Data Pattern  
```
GET /api.php?action=query&titles={monster}&prop=revisions|extracts|pageimages&rvprop=content&format=json&origin=*
```

### Drop Table Parsing
The parser looks for these wikitext patterns:
- `===Category===` - Drop categories (100%, Tertiary, etc.)
- `{{DropsLine|name=Item|quantity=1|rarity=Always}}` - Individual drops
- `{{DropsLineClue|type=beginner|rarity=1/128}}` - Clue scroll drops

### Known Limitations
- Only monsters with structured drop tables are returned
- Parsing relies on consistent wiki template formatting
- Some complex drop mechanics may not be fully captured
- API calls are limited by CORS and rate limiting

## Common Issues & Solutions

### Build Errors
- **TypeScript errors**: Check interface usage and type imports
- **ESLint warnings**: Remove unused variables and fix quote escaping
- **API errors**: Verify CORS settings and URL encoding

### API Issues
- **No results**: Monster may not have structured drop data
- **Parsing errors**: Wiki page may use non-standard template format
- **Rate limiting**: Implement request throttling if needed

### Testing Monsters
Good test cases for development:
- `cow` - Simple drop table
- `hill giant` - Complex multi-category drops  
- `goblin` - Basic monster with minimal drops
- `dragon` - Should show multiple dragon-type monsters

## Simulation Features
- **Accurate OSRS Drop Mechanics**: 
  - Always drops (bones) - guaranteed every kill
  - Main drop table - exactly one item per kill using weighted selection
  - Tertiary drops - independent rolls (clue scrolls, rare items)
- **Drop Rate Parser**: Converts wiki drop rates (1/128, Always, etc.) to proper weights
- **Kill Simulator**: Simulates realistic monster kills following OSRS mechanics
- **Statistical Analysis**: Tracks total items, unique drops, and success rates
- **Results Display**: Shows actual vs expected drop rates with proper distribution
- **Performance**: Can handle up to 100,000 simulated kills efficiently

## Future Enhancements
- [x] ~~Add drop rate probability calculations~~ ✅ **COMPLETED**
- [x] ~~Implement drop simulation features~~ ✅ **COMPLETED**
- [ ] Add drop value calculations using Grand Exchange prices
- [ ] Implement monster filtering by combat level
- [ ] Create monster comparison views
- [ ] Add favorite monsters functionality
- [ ] Add search history
- [ ] Export simulation results to CSV/JSON
- [ ] Add simulation presets (common kill counts)
- [ ] Mobile app version

## Dependencies
Key packages and their purposes:
- `next` - React framework
- `react` - UI library
- `tailwindcss` - Styling
- `@radix-ui/*` - Headless UI components (via Shadcn)
- `class-variance-authority` - Component variants
- `clsx` - Conditional classes
- `tailwind-merge` - Tailwind class merging

## Deployment Notes
- Build command: `npm run build`
- Static export compatible
- No server-side dependencies
- CORS handled by API origin parameter
- All API calls are client-side

## Git Workflow
- Main branch: `main`
- Commit format: Descriptive messages with feature summaries
- All changes should build successfully before committing
- Use TypeScript strict mode and fix all warnings