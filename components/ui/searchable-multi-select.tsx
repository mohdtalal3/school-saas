"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface SearchableMultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  pageSize?: number;
}

export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  pageSize = 10,
}: SearchableMultiSelectProps) {
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

  const filtered = options.filter((option) => option.label.toLowerCase().includes(search.trim().toLowerCase()));
  const visible = filtered.slice(0, visibleCount);
  const selected = options.filter((option) => value.includes(option.value));
  const toggle = (optionValue: string) => onChange(
    value.includes(optionValue) ? value.filter((item) => item !== optionValue) : [...value, optionValue]
  );

  return <div ref={rootRef} className={cn("relative", className)}>
    <button type="button" onClick={() => setOpen((current) => !current)} className="flex min-h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
      <span className={cn("min-w-0 flex-1 truncate", !selected.length && "text-muted-foreground")}>
        {selected.length ? `${selected.length} ${selected.length === 1 ? "class" : "classes"} selected` : placeholder}
      </span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
    {selected.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{selected.map((option) => <span key={option.value} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{option.label}<button type="button" aria-label={`Remove ${option.label}`} onClick={() => toggle(option.value)}><X className="h-3 w-3" /></button></span>)}</div>}
    {open && <div className="absolute z-50 mt-2 w-full min-w-[260px] rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
      <div className="relative mb-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} className="pl-9" autoFocus /></div>
      <div className="max-h-60 overflow-y-auto">{visible.length ? visible.map((option) => { const checked = value.includes(option.value); return <button type="button" key={option.value} onClick={() => toggle(option.value)} className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"><span className={cn("flex h-4 w-4 items-center justify-center rounded border", checked && "border-primary bg-primary text-primary-foreground")}>{checked && <Check className="h-3 w-3" />}</span><span className="flex-1 truncate">{option.label}</span></button>; }) : <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>}</div>
      {visibleCount < filtered.length && <div className="border-t pt-2"><Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setVisibleCount((count) => count + pageSize)}>Show more ({filtered.length - visibleCount} remaining)</Button></div>}
    </div>}
  </div>;
}
