"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ItemIconProps {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fallback?: React.ReactNode;
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8", 
  lg: "w-12 h-12"
};

export function ItemIcon({ 
  src, 
  alt, 
  size = "sm", 
  className,
  fallback 
}: ItemIconProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!src || hasError) {
    return (
      <div 
        className={cn(
          sizeClasses[size],
          "rounded border bg-muted/20 flex items-center justify-center text-xs text-muted-foreground",
          className
        )}
        title={alt}
      >
        {fallback || "?"}
      </div>
    );
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {isLoading && (
        <div className={cn(
          "absolute inset-0 rounded border bg-muted/20 animate-pulse",
          sizeClasses[size]
        )} />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          sizeClasses[size],
          "rounded border object-cover bg-muted/20",
          isLoading && "opacity-0"
        )}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
}