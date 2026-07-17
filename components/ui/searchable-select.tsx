"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SearchableSelectOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  pageSize?: number;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  pageSize = 10,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(pageSize);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  React.useEffect(() => setVisibleCount(pageSize), [search, pageSize]);

  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) => `${option.label} ${option.subtitle ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const visible = filtered.slice(0, visibleCount);

  return <div ref={rootRef} className={cn("relative", className)}>
    <button type="button" onClick={() => setOpen((current) => !current)} className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
      <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted-foreground")}>{selected?.label ?? placeholder}</span>
      <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
    </button>
    {open && <div className="absolute z-50 mt-2 w-full min-w-[260px] rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
      <div className="relative mb-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} className="pl-9" autoFocus /></div>
      <div className="max-h-64 overflow-y-auto">{visible.length ? visible.map((option) => <button type="button" key={option.value} onClick={() => { onChange(option.value); setOpen(false); setSearch(""); }} className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"><Check className={cn("h-4 w-4 text-primary", value !== option.value && "invisible")} /><div className="min-w-0 flex-1"><p className="truncate">{option.label}</p>{option.subtitle && <p className="truncate text-xs text-muted-foreground">{option.subtitle}</p>}</div></button>) : <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>}</div>
      {visibleCount < filtered.length && <div className="border-t pt-2"><Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setVisibleCount((count) => count + pageSize)}>Show more ({filtered.length - visibleCount} remaining)</Button></div>}
    </div>}
  </div>;
}
