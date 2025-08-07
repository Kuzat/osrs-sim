"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// This is a redirect page for backward compatibility with old ?name= URLs
function SimulateRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const monsterName = searchParams.get('name');
    if (monsterName) {
      // Redirect to the new URL structure
      router.replace(`/simulate/${encodeURIComponent(monsterName)}`);
    } else {
      // No monster name, redirect to home
      router.replace('/');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen p-8 max-w-6xl">
      <div className="text-center">
        <p>Redirecting...</p>
      </div>
    </div>
  );
}

export default function SimulatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-8 max-w-6xl">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    }>
      <SimulateRedirect />
    </Suspense>
  );
}