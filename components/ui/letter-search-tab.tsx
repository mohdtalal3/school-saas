"use client";

import * as React from "react";
import { FileText, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchPicker } from "@/components/ui/search-picker";
import { getInitials } from "@/lib/utils";

interface LetterSearchTabProps {
  title: string;
  icon: LucideIcon;
  searchPlaceholder: string;
  searchFn: (query: string) => Promise<{ id: string; name: string; photo_url?: string | null; subtitle?: string }[]>;
  queryKey: (query: string) => readonly unknown[];
  emptyHintTitle: string;
  emptyHintDescription: string;
  printLabel: string;
  printHref: (id: string) => string;
  printIcon?: LucideIcon;
}

export function LetterSearchTab({
  title,
  icon: Icon,
  searchPlaceholder,
  searchFn,
  queryKey,
  emptyHintTitle,
  emptyHintDescription,
  printLabel,
  printHref,
  printIcon: PrintIcon = FileText,
}: LetterSearchTabProps) {
  const [selected, setSelected] = React.useState<{ id: string; name: string; photo_url: string | null; subtitle?: string } | null>(null);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <SearchPicker
          placeholder={searchPlaceholder}
          searchFn={searchFn}
          queryKey={queryKey}
          emptyHint={{
            icon: <Icon className="h-7 w-7 text-muted-foreground" />,
            title: emptyHintTitle,
            description: emptyHintDescription,
          }}
          onSelect={(item) =>
            setSelected({
              id: item.id,
              name: item.name,
              photo_url: item.photo_url ?? null,
              subtitle: item.subtitle,
            })
          }
        />

        {selected && (
          <Card className="mx-auto max-w-md">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {selected.photo_url && (
                    <AvatarImage src={selected.photo_url} alt={selected.name} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {getInitials(selected.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-sm font-semibold">
                    {selected.name}
                  </CardTitle>
                  {selected.subtitle && (
                    <p className="truncate text-xs text-muted-foreground">
                      {selected.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" className="w-full gap-2">
                <a
                  href={printHref(selected.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <PrintIcon className="h-3.5 w-3.5" />
                  {printLabel}
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
