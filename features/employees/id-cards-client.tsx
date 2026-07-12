"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Printer,
  Loader2,
  Palette,
  Users,
  Square,
  RectangleHorizontal,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { IdCardPDFViewer } from "./id-card-pdf-viewer";
import type { IdCardTheme, IdCardOrientation } from "./id-card-pdf";
import type { Employee, School } from "@/types/school.types";
import { getInitials } from "@/lib/utils";

interface Props {
  employees: Employee[]; // currently-selected employees
  allEmployees: Employee[];
  school: School;
  initialOrientation: IdCardOrientation;
  initialTheme: IdCardTheme;
}

const PRESET_THEMES: { label: string; theme: IdCardTheme }[] = [
  {
    label: "Classic Navy",
    theme: { textColor: "#1f2937", accentColor: "#0b1d39", bgColor: "#ffffff" },
  },
  {
    label: "Royal Blue",
    theme: { textColor: "#1e293b", accentColor: "#1d4ed8", bgColor: "#ffffff" },
  },
  {
    label: "Forest",
    theme: { textColor: "#1f2937", accentColor: "#15803d", bgColor: "#ffffff" },
  },
  {
    label: "Crimson",
    theme: { textColor: "#1f2937", accentColor: "#b91c1c", bgColor: "#ffffff" },
  },
  {
    label: "Gold",
    theme: { textColor: "#1f2937", accentColor: "#c9a253", bgColor: "#ffffff" },
  },
  {
    label: "Dark Mode",
    theme: { textColor: "#f9fafb", accentColor: "#3b82f6", bgColor: "#111827" },
  },
];

export function IdCardsClient({
  employees: initialEmployees,
  allEmployees,
  school,
  initialOrientation,
  initialTheme,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  // Selection mode: "all" or "select"
  const [mode, setMode] = React.useState<"all" | "select">(
    initialEmployees.length === allEmployees.length ? "all" : "select"
  );
  const [selectedIds, setSelectedIds] =
    React.useState<Set<string>>(new Set(initialEmployees.map((e) => e.id)));

  const [orientation, setOrientation] =
    React.useState<IdCardOrientation>(initialOrientation);
  const [theme, setTheme] = React.useState<IdCardTheme>(initialTheme);

  const [search, setSearch] = React.useState("");

  // PDF preview mode
  const [showPdf, setShowPdf] = React.useState(false);

  // The employees to render
  const employeesToRender = React.useMemo(() => {
    if (mode === "all") return allEmployees;
    return allEmployees.filter((e) => selectedIds.has(e.id));
  }, [mode, selectedIds, allEmployees]);

  const filteredForPicker = React.useMemo(() => {
    if (!search.trim()) return allEmployees;
    const q = search.toLowerCase();
    return allEmployees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q)
    );
  }, [allEmployees, search]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(allEmployees.map((e) => e.id)));
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  function handleGenerate() {
    if (employeesToRender.length === 0) {
      toast({
        title: "Select at least one employee",
        description: "Pick employees to print ID cards for.",
        variant: "destructive",
      });
      return;
    }
    setShowPdf(true);
  }

  function closePdf() {
    setShowPdf(false);
  }

  // ── PDF render ────────────────────────────────────────────────────────────

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
            ID Cards — {employeesToRender.length} employee
            {employeesToRender.length === 1 ? "" : "s"} •{" "}
            {orientation === "portrait" ? "Portrait" : "Landscape"} A4
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={closePdf}
            className="bg-white text-black hover:bg-white/90"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Back to options
          </Button>
        </div>
        <div className="flex-1">
          <IdCardPDFViewer
            employees={employeesToRender}
            school={school}
            orientation={orientation}
            theme={theme}
          />
        </div>
      </div>
    );
  }

  // ── Options UI ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Employee ID Cards
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate printable ID cards — 6 per A4 sheet, one-sided.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <X className="mr-1 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleGenerate} className="gap-2">
            <Printer className="h-4 w-4" />
            Generate ID Cards
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: selection */}
        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="mb-2 text-sm font-medium">Choose employees</p>

              {/* Mode toggle */}
              <div className="mb-3 inline-flex rounded-md border bg-muted/40 p-0.5">
                <button
                  onClick={() => setMode("all")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    mode === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({allEmployees.length})
                </button>
                <button
                  onClick={() => setMode("select")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    mode === "select"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Select ({selectedIds.size})
                </button>
              </div>

              {mode === "select" && (
                <>
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search employees..."
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

                  <div className="mb-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {selectedIds.size} of {allEmployees.length} selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAll}
                        className="text-primary hover:underline"
                      >
                        Select all
                      </button>
                      <span className="text-muted-foreground">·</span>
                      <button
                        onClick={clearAll}
                        className="text-primary hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Employee list */}
                  <div className="max-h-[420px] space-y-1.5 overflow-y-auto rounded-md border bg-muted/20 p-2">
                    {filteredForPicker.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        No employees match "{search}"
                      </p>
                    ) : (
                      filteredForPicker.map((emp) => {
                        const checked = selectedIds.has(emp.id);
                        return (
                          <button
                            key={emp.id}
                            onClick={() => toggleSelected(emp.id)}
                            className={`flex w-full items-center gap-3 rounded-md border px-2 py-1.5 text-left transition-colors ${
                              checked
                                ? "border-primary/40 bg-primary/5"
                                : "border-transparent bg-background hover:border-muted-foreground/30"
                            }`}
                          >
                            <div
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                checked
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/40"
                              }`}
                            >
                              {checked && <Check className="h-3 w-3" />}
                            </div>
                            <Avatar className="h-7 w-7">
                              {emp.photo_url && (
                                <AvatarImage src={emp.photo_url} alt={emp.name} />
                              )}
                              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                                {getInitials(emp.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium">
                                {emp.name}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {emp.role}
                                {emp.employee_code ? ` · ${emp.employee_code}` : ""}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}

              {mode === "all" && (
                <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                  <Users className="mr-1 inline h-3.5 w-3.5" />
                  All {allEmployees.length} employees will be printed.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: orientation + theme */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <RectangleHorizontal className="h-4 w-4" />
                  Orientation
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOrientation("portrait")}
                    className={`flex flex-col items-center gap-1.5 rounded-md border p-3 transition-colors ${
                      orientation === "portrait"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted-foreground/30 hover:border-muted-foreground/50"
                    }`}
                  >
                    <RectangleHorizontal
                      className="h-7 w-5"
                      style={{ transform: "rotate(90deg)" }}
                    />
                    <span className="text-xs font-medium">Vertical</span>
                    <span className="text-[10px] text-muted-foreground">
                      2 cols × 3 rows
                    </span>
                  </button>
                  <button
                    onClick={() => setOrientation("landscape")}
                    className={`flex flex-col items-center gap-1.5 rounded-md border p-3 transition-colors ${
                      orientation === "landscape"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted-foreground/30 hover:border-muted-foreground/50"
                    }`}
                  >
                    <RectangleHorizontal className="h-5 w-7" />
                    <span className="text-xs font-medium">Horizontal</span>
                    <span className="text-[10px] text-muted-foreground">
                      2 cols × 3 rows
                    </span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Palette className="h-4 w-4" />
                Theme
              </p>

              {/* Preset chips */}
              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_THEMES.map((p) => {
                  const isActive =
                    p.theme.textColor === theme.textColor &&
                    p.theme.accentColor === theme.accentColor &&
                    p.theme.bgColor === theme.bgColor;
                  return (
                    <button
                      key={p.label}
                      onClick={() => setTheme(p.theme)}
                      className={`flex flex-col items-center gap-1 rounded-md border p-2 transition-colors ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/30 hover:border-muted-foreground/50"
                      }`}
                      title={p.label}
                    >
                      <div
                        className="h-6 w-full rounded-sm border"
                        style={{
                          backgroundColor: p.theme.bgColor,
                          borderColor: p.theme.accentColor,
                          borderTopWidth: 4,
                        }}
                      />
                      <span className="text-[10px] font-medium leading-none">
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom colors */}
              <div className="space-y-2 border-t pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Customize
                </p>
                <ColorRow
                  label="Text color"
                  value={theme.textColor}
                  onChange={(v) => setTheme((t) => ({ ...t, textColor: v }))}
                />
                <ColorRow
                  label="Accent color"
                  value={theme.accentColor}
                  onChange={(v) => setTheme((t) => ({ ...t, accentColor: v }))}
                />
                <ColorRow
                  label="Background"
                  value={theme.bgColor}
                  onChange={(v) => setTheme((t) => ({ ...t, bgColor: v }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky generate bar at bottom */}
      <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-between border-t bg-background/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="text-xs text-muted-foreground">
          {employeesToRender.length === 0
            ? "No employees selected"
            : `${employeesToRender.length} card${
                employeesToRender.length === 1 ? "" : "s"
              } will be printed`}
        </p>
        <Button onClick={handleGenerate} disabled={employeesToRender.length === 0}>
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