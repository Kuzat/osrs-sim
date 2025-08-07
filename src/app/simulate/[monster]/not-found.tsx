import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen p-8 w-full max-w-6xl">
      <div className="text-center">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Monster Not Found</CardTitle>
            <CardDescription>
              The requested monster could not be found or doesn&apos;t have drop data available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This could happen if:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 text-left max-w-md mx-auto">
              <li>The monster name was spelled incorrectly</li>
              <li>The monster doesn&apos;t exist in Old School RuneScape</li>
              <li>The monster doesn&apos;t have structured drop data on the OSRS Wiki</li>
              <li>There was an error fetching data from the OSRS Wiki API</li>
            </ul>
            <div className="pt-4">
              <Button asChild>
                <Link href="/">
                  ← Back to Monster Search
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Try searching for monsters like &quot;cow&quot;, &quot;goblin&quot;, or &quot;hill giant&quot;
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}