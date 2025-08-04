"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  disabled?: boolean;
  onKeyPress?: (e: React.KeyboardEvent) => void;
}

export function Autocomplete({
  options,
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  isLoading = false,
  disabled = false,
  onKeyPress,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [options]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && options.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        return;
      }
    }

    if (isOpen) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            e.preventDefault();
            handleSelect(options[highlightedIndex]);
          } else if (onKeyPress) {
            onKeyPress(e);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightedIndex(-1);
          inputRef.current?.blur();
          break;
        default:
          if (onKeyPress) {
            onKeyPress(e);
          }
      }
    } else if (onKeyPress) {
      onKeyPress(e);
    }
  };

  const handleSelect = (option: AutocompleteOption) => {
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (onSelect) {
      onSelect(option);
    }
  };

  const showDropdown = isOpen && options.length > 0 && value.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length > 0 && options.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          showDropdown && "rounded-b-none border-b-0"
        )}
      />
      
      {showDropdown && (
        <div className={cn(
          "absolute top-full left-0 right-0 z-50",
          "bg-background border border-t-0 rounded-b-md shadow-lg",
          "max-h-60 overflow-y-auto"
        )}>
          {isLoading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Loading...
            </div>
          )}
          {!isLoading && options.map((option, index) => (
            <div
              key={option.value}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm",
                "hover:bg-muted/50",
                highlightedIndex === index && "bg-muted"
              )}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option.label}
            </div>
          ))}
          {!isLoading && options.length === 0 && value.length > 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}