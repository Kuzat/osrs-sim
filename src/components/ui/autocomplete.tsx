"use client";

import { useState, useRef, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
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
  const [selectedValue, setSelectedValue] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    setIsOpen(true);
    setSelectedValue(""); // Clear selection when typing
  };

  const handleSelect = (optionValue: string) => {
    const option = options.find(opt => opt.value === optionValue);
    if (option) {
      onChange(option.value);
      setSelectedValue(option.value);
      setIsOpen(false);
      if (onSelect) {
        onSelect(option);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If Command component doesn't handle Enter and we have a selection, use it
    if (e.key === 'Enter') {
      if (selectedValue && options.find(opt => opt.value === selectedValue)) {
        e.preventDefault();
        const option = options.find(opt => opt.value === selectedValue)!;
        handleSelect(option.value);
        return;
      }
      // If no selection, pass through to parent for search
      if (onKeyPress) {
        setIsOpen(false);
        onKeyPress(e);
      }
    }
    
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen && value.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Command 
        className="overflow-visible bg-transparent"
        onKeyDown={handleKeyDown}
        shouldFilter={false} // We handle filtering via API
      >
        <CommandInput
          value={value}
          onValueChange={handleInputChange}
          onFocus={() => value.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "h-10",
            showDropdown && "rounded-b-none"
          )}
        />
        
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 z-50">
            <CommandList className="bg-background border border-t-0 rounded-b-md shadow-lg max-h-60">
              {isLoading && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Loading monsters...
                </div>
              )}
              
              {!isLoading && options.length === 0 && (
                <CommandEmpty className="py-6 text-center text-sm">
                  No monsters found.
                </CommandEmpty>
              )}
              
              {!isLoading && options.length > 0 && (
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleSelect(option.value)}
                      onMouseEnter={() => setSelectedValue(option.value)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {option.label.startsWith('Search for "') ? (
                          <div className="w-2 h-2 rounded-sm bg-primary/60"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div>
                        )}
                        <span className={option.label.startsWith('Search for "') ? "text-primary" : ""}>
                          {option.label}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
}