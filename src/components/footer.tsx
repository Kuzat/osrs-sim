"use client";

import { useDebug } from "@/contexts/debug-context";

export function Footer() {
  const { showCacheDebug, toggleCacheDebug } = useDebug();
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="max-w-4xl mx-auto px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>
            Thanks to:{" "}
            <a
              href="https://oldschool.runescape.wiki"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline font-medium"
            >
              OSRS Wiki
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleCacheDebug}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              title={showCacheDebug ? "Hide cache debug info" : "Show cache debug info"}
            >
              {showCacheDebug ? "🔧 Hide Debug" : "🔧 Debug"}
            </button>
            <div className="text-center sm:text-right">
              RuneScape Old School is a trademark of{" "}
              <a
                href="https://jagex.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline font-medium"
              >
                Jagex Limited
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}