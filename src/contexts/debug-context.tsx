"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface DebugContextType {
  showCacheDebug: boolean;
  toggleCacheDebug: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [showCacheDebug, setShowCacheDebug] = useState(false);

  // Load debug state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('osrs-debug-cache');
    if (saved === 'true') {
      setShowCacheDebug(true);
    }
  }, []);

  const toggleCacheDebug = () => {
    const newState = !showCacheDebug;
    setShowCacheDebug(newState);
    localStorage.setItem('osrs-debug-cache', newState.toString());
  };

  return (
    <DebugContext.Provider value={{ showCacheDebug, toggleCacheDebug }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}