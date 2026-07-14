"use client";

import * as React from "react";
import {
  Search,
  X,
  Printer,
  Download,
  Palette,
  Users,
  Check,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { useQuery } from "@tanstack/react-query";
import type { IdCardTheme } from "@/features/employees/id-card-types";
import type { StudentWithClass, SchoolClass } from "@/types/school.types";
import { getInitials } from "@/lib/utils";

const PRESET_THEMES: { label: string; theme: IdCardTheme }[] = [
  { label: "Navy & Gold", theme: { textColor: "#1f2937", accentColor: "#243c8b", goldColor: "#c89a2b", bgColor: "#ffffff" } },
  { label: "Royal Blue", theme: { textColor: "#1e293b", accentColor: "#1d4ed8", goldColor: "#f59e0b", bgColor: "#ffffff" } },
  { label: "Forest", theme: { textColor: "#1f2937", accentColor: "#15803d", goldColor: "#ca8a04", bgColor: "#ffffff" } },
  { label: "Crimson", theme: { textColor: "#1f2937", accentColor: "#b91c1c", goldColor: "#d97706", bgColor: "#ffffff" } },
  { label: "Emerald & Gold", theme: { textColor: "#1f2937", accentColor: "#065f46", goldColor: "#c9a253", bgColor: "#ffffff" } },
  { label: "Charcoal", theme: { textColor: "#1f2937", accentColor: "#1f2937", goldColor: "#c89a2b", bgColor: "#ffffff" } },
];

const DEFAULT_THEME: IdCardTheme = {
  textColor: "#1f2937",
  accentColor: "#243c8b",
  goldColor: "#c89a2b",
  bgColor: "#ffffff",
};

async function searchStudents(
  schoolId: string,
  query: string
): Promise<StudentWithClass[]> {
  const qs = new URLSearchParams({ page: "1", limit: "20", search: query, active: "true", searchFields: "name,registration_no" });
  const res = await fetch(`/api/students/${schoolId}?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data.data as StudentWithClass[];
}

async function fetchClasses(schoolId: string): Promise<SchoolClass[]> {
  const res = await fetch(`/api/classes/${schoolId}?limit=1000`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data.data as SchoolClass[];
}

interface StudentIdCardsTabProps {
  schoolId: string;
}

export function StudentIdCardsTab({ schoolId }: StudentIdCardsTabProps) {
  const { toast } = useToast();

  const [mode, setMode] = React.useState<"all" | "select">("all");
  const [selectedMap, setSelectedMap] = React.useState<Map<string, StudentWithClass>>(new Map());
  const [selectedClassIds, setSelectedClassIds] = React.useState<Set<string>>(new Set());
  const [theme, setTheme] = React.useState<IdCardTheme>(DEFAULT_THEME);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [showPdf, setShowPdf] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: classes = [] } = useQuery<SchoolClass[]>({
    queryKey: ["classes", schoolId],
    queryFn: () => fetchClasses(schoolId),
  });
  const safeClasses = Array.isArray(classes) ? classes : [];

  const { data: searchResults = [], isFetching: isSearching } = useQuery<StudentWithClass[]>({
    queryKey: ["students-search", schoolId, debouncedSearch],
    queryFn: () => searchStudents(schoolId, debouncedSearch),
    enabled: debouncedSearch.trim().length >= 2,
  });

  const selectedStudents = React.useMemo(
    () => Array.from(selectedMap.values()),
    [selectedMap]
  );

  function addStudent(s: StudentWithClass) {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.set(s.id, s);
      return next;
    });
    setSearch("");
  }

  function removeStudent(id: string) {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  function clearAll() {
    setSelectedMap(new Map());
  }

  function toggleClass(clsId: string) {
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(clsId)) next.delete(clsId);
      else next.add(clsId);
      return next;
    });
  }

  const pdfQuery = React.useMemo(() => {
    const params = new URLSearchParams();
    if (mode === "select") {
      params.set("ids", selectedStudents.map((s) => s.id).join(","));
    } else if (selectedClassIds.size > 0) {
      params.set("classIds", Array.from(selectedClassIds).join(","));
    }
    params.set("textColor", theme.textColor);
    params.set("accentColor", theme.accentColor);
    params.set("goldColor", theme.goldColor);
    params.set("bgColor", theme.bgColor);
    return params.toString();
  }, [mode, selectedStudents, selectedClassIds, theme]);

  const pdfPreviewUrl = `/api/students/id-cards/pdf?${pdfQuery}`;
  const pdfDownloadUrl = `${pdfPreviewUrl}&download=1`;

  const allModeLabel =
    selectedClassIds.size === 0
      ? "All"
      : `${selectedClassIds.size} class${selectedClassIds.size === 1 ? "" : "es"}`;

  function handleGenerate() {
    if (mode === "select" && selectedStudents.length === 0) {
      toast({
        title: "Select at least one student",
        description: "Search and add students to print ID cards for.",
        variant: "destructive",
      });
      return;
    }
    setShowPdf(true);
  }

  if (showPdf) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#525659",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-[#3f4347] px-4 py-2 text-white">
          <div className="text-sm">
            ID Cards — {mode === "all" ? allModeLabel : `${selectedStudents.length} student${selectedStudents.length === 1 ? "" : "s"}`} • Portrait CR80, A4 sheet
          </div>
          <div className="flex gap-2">
            <a href={pdfDownloadUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="bg-white text-black hover:bg-white/90">
                <Download className="mr-1 h-3.5 w-3.5" />
                Download
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPdf(false)}
              className="bg-white text-black hover:bg-white/90"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Back to options
            </Button>
          </div>
        </div>
        <div className="flex-1 bg-[#525659]">
          <iframe src={pdfPreviewUrl} title="Student ID Cards PDF preview" className="h-full w-full border-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Student ID Cards</h1>
          <p className="text-sm text-muted-foreground">
            Generate printable ID cards — CR80 portrait, 9 per A4 sheet.
          </p>
        </div>
        <Button onClick={handleGenerate} className="gap-2">
          <Printer className="h-4 w-4" />
          Generate ID Cards
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: selection */}
        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="mb-2 text-sm font-medium">Choose students</p>

              {/* Mode toggle */}
              <div className="mb-3 inline-flex rounded-md border bg-muted/40 p-0.5">
                <button
                  onClick={() => setMode("all")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    mode === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {allModeLabel}
                </button>
                <button
                  onClick={() => setMode("select")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    mode === "select" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Select ({selectedStudents.length})
                </button>
              </div>

              {mode === "all" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Select classes to print ID cards for, or leave empty to print all.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {safeClasses.map((cls) => {
                      const checked = selectedClassIds.has(cls.id);
                      return (
                        <button
                          key={cls.id}
                          onClick={() => toggleClass(cls.id)}
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                            checked
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                          }`}
                        >
                          {checked && <Check className="h-3 w-3" />}
                          {cls.name}
                        </button>
                      );
                    })}
                  </div>
                  {safeClasses.length === 0 && (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                      <GraduationCap className="h-4 w-4" />
                      No classes found. All active students will be printed.
                    </div>
                  )}
                  {selectedClassIds.size > 0 && (
                    <button
                      onClick={() => setSelectedClassIds(new Set())}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear class filters
                    </button>
                  )}
                  <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                    <Users className="mr-1 inline h-3.5 w-3.5" />
                    {selectedClassIds.size === 0
                      ? "All active students will be printed."
                      : `Students from ${selectedClassIds.size} class${selectedClassIds.size === 1 ? "" : "es"} will be printed.`}
                  </div>
                </div>
              )}

              {mode === "select" && (
                <>
                  {/* Search to add students */}
                  <div className="relative mb-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search students to add..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Search results dropdown — server-side */}
                  {debouncedSearch.trim().length >= 2 && (
                    <div className="mb-3 max-h-48 space-y-1 overflow-y-auto rounded-md border bg-background p-1.5 shadow-sm">
                      {isSearching ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : searchResults.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">
                          No students match &quot;{debouncedSearch}&quot;
                        </p>
                      ) : (
                        searchResults.map((s) => {
                          const alreadySelected = selectedMap.has(s.id);
                          return (
                            <button
                              key={s.id}
                              onClick={() => { if (!alreadySelected) addStudent(s); }}
                              disabled={alreadySelected}
                              className={`flex w-full items-center gap-3 rounded-md border px-2 py-1.5 text-left transition-colors ${
                                alreadySelected
                                  ? "cursor-default border-primary/30 bg-primary/5 opacity-60"
                                  : "border-transparent hover:border-muted-foreground/30 hover:bg-muted/40"
                              }`}
                            >
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  alreadySelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                                }`}
                              >
                                {alreadySelected && <Check className="h-3 w-3" />}
                              </div>
                              <Avatar className="h-7 w-7">
                                {s.photo_url && <AvatarImage src={s.photo_url} alt={s.name} />}
                                <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                                  {getInitials(s.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">{s.name}</p>
                                <p className="truncate text-[10px] text-muted-foreground">
                                  {s.class_name ?? "—"}
                                  {s.registration_no ? ` · ${s.registration_no}` : ""}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Selected students list */}
                  <div className="mb-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{selectedStudents.length} selected</span>
                    {selectedStudents.length > 0 && (
                      <button onClick={clearAll} className="text-primary hover:underline">Clear all</button>
                    )}
                  </div>

                  {selectedStudents.length > 0 ? (
                    <div className="max-h-[300px] space-y-1.5 overflow-y-auto rounded-md border bg-muted/20 p-2">
                      {selectedStudents.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 rounded-md border border-primary/40 bg-primary/5 px-2 py-1.5"
                        >
                          <Avatar className="h-7 w-7">
                            {s.photo_url && <AvatarImage src={s.photo_url} alt={s.name} />}
                            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                              {getInitials(s.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">{s.name}</p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {s.class_name ?? "—"}
                              {s.registration_no ? ` · ${s.registration_no}` : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => removeStudent(s.id)}
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            title="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-10 text-center">
                      <Search className="mb-2 h-6 w-6 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">Search above to add students</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: theme */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Palette className="h-4 w-4" />
                Theme
              </p>

              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_THEMES.map((p) => {
                  const isActive =
                    p.theme.textColor === theme.textColor &&
                    p.theme.accentColor === theme.accentColor &&
                    p.theme.goldColor === theme.goldColor &&
                    p.theme.bgColor === theme.bgColor;
                  return (
                    <button
                      key={p.label}
                      onClick={() => setTheme(p.theme)}
                      className={`flex flex-col items-center gap-1 rounded-md border p-2 transition-colors ${
                        isActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/50"
                      }`}
                      title={p.label}
                    >
                      <div
                        className="h-6 w-full rounded-sm border"
                        style={{
                          backgroundColor: p.theme.bgColor,
                          borderColor: p.theme.goldColor,
                          borderTopColor: p.theme.accentColor,
                          borderTopWidth: 4,
                        }}
                      />
                      <span className="text-[10px] font-medium leading-none">{p.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 border-t pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Customize</p>
                <ColorRow label="Text color" value={theme.textColor} onChange={(v) => setTheme((t) => ({ ...t, textColor: v }))} />
                <ColorRow label="Accent color" value={theme.accentColor} onChange={(v) => setTheme((t) => ({ ...t, accentColor: v }))} />
                <ColorRow label="Gold accent" value={theme.goldColor} onChange={(v) => setTheme((t) => ({ ...t, goldColor: v }))} />
                <ColorRow label="Background" value={theme.bgColor} onChange={(v) => setTheme((t) => ({ ...t, bgColor: v }))} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky generate bar */}
      <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-between border-t bg-background/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="text-xs text-muted-foreground">
          {mode === "all"
            ? selectedClassIds.size === 0
              ? "All active student cards will be printed"
              : `Students from ${selectedClassIds.size} class${selectedClassIds.size === 1 ? "" : "es"} will be printed`
            : selectedStudents.length === 0
              ? "No students selected"
              : `${selectedStudents.length} card${selectedStudents.length === 1 ? "" : "s"} will be printed`}
        </p>
        <Button onClick={handleGenerate} disabled={mode === "select" && selectedStudents.length === 0}>
          <Printer className="mr-2 h-4 w-4" />
          Generate PDF
        </Button>
      </div>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border bg-transparent p-0"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-24 font-mono text-[10px]"
        />
      </div>
    </div>
  );
}
