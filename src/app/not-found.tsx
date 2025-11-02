import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen p-8 w-full max-w-4xl mx-auto flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">Page Not Found</h1>
        <p className="text-muted-foreground">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div>
          <Link href="/" className="underline underline-offset-4">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
