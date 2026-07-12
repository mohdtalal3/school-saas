"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface SearchPickerItem {
  id: string;
  name: string;
  photo_url?: string | null;
  subtitle?: string;
}

interface SearchPickerProps {
  placeholder?: string;
  searchFn: (query: string) => Promise<SearchPickerItem[]>;
  queryKey: (query: string) => readonly unknown[];
  minChars?: number;
  emptyHint?: {
    icon?: React.ReactNode;
    title: string;
    description: string;
  };
  renderItem?: (item: SearchPickerItem) => React.ReactNode;
  onSelect: (item: SearchPickerItem) => void;
  className?: string;
}

export function SearchPicker({
  placeholder = "Type at least 3 letters to search...",
  searchFn,
  queryKey,
  minChars = 3,
  emptyHint,
  renderItem,
  onSelect,
  className,
}: SearchPickerProps) {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [showResults, setShowResults] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (query.length < minChars) {
      setDebounced("");
      return;
    }
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query, minChars]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: results = [], isFetching } = useQuery({
    queryKey: queryKey(debounced),
    queryFn: () => searchFn(debounced),
    enabled: debounced.length >= minChars,
  });

  function handleSelect(item: SearchPickerItem) {
    onSelect(item);
    setShowResults(false);
  }

  return (
    <div ref={containerRef} className={className}>
      {/* Search bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="h-12 pl-12 pr-10 text-base"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setDebounced("");
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Dropdown results */}
        {showResults && debounced.length >= minChars && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border bg-background shadow-lg">
            {isFetching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No results for &quot;{debounced}&quot;
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60"
                  >
                    {renderItem ? (
                      renderItem(item)
                    ) : (
                      <>
                        <Avatar className="h-8 w-8">
                          {item.photo_url && (
                            <AvatarImage src={item.photo_url} alt={item.name} />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(item.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          {item.subtitle && (
                            <p className="truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty hint when no query */}
      {query.length < minChars && emptyHint && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            {emptyHint.icon}
          </div>
          <p className="font-medium">{emptyHint.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyHint.description}</p>
        </div>
      )}
    </div>
  );
}
