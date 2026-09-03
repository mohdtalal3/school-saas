"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Blocks,
  Loader2,
  Users,
  GraduationCap,
  BookOpen,
  CalendarRange,
  Wallet,
  ClipboardCheck,
  UsersRound,
  School as SchoolIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useAdminShell } from "@/components/layout/admin-shell";
import { MODULES } from "@/lib/modules";
import type { School } from "@/types/school.types";

const MODULE_ICONS: Record<string, React.ElementType> = {
  employees: Users,
  students: GraduationCap,
  classes: SchoolIcon,
  subjects: BookOpen,
  timetable: CalendarRange,
  fees: Wallet,
  "attendance.students": ClipboardCheck,
  "attendance.employees": UsersRound,
};

interface ModuleSettingsDTO {
  disabled_modules: string[];
}

async function fetchModuleSettings(schoolId: string): Promise<ModuleSettingsDTO> {
  const res = await fetch(`/api/settings/modules/${schoolId}`);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to load");
  return data.data;
}

async function updateModuleSettings({
  schoolId,
  disabledModules,
}: {
  schoolId: string;
  disabledModules: string[];
}): Promise<ModuleSettingsDTO> {
  const res = await fetch(`/api/settings/modules/${schoolId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ disabled_modules: disabledModules }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Update failed");
  return data.data;
}

export function ModuleSettingsForm({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { school } = useAdminShell();

  const { data, isLoading } = useQuery({
    queryKey: ["module-settings", schoolId],
    queryFn: () => fetchModuleSettings(schoolId),
    initialData: school
      ? { disabled_modules: school.disabled_modules ?? [] }
      : undefined,
  });

  // Draft state — the keys currently marked disabled in the UI (unsaved).
  const [draft, setDraft] = React.useState<Set<string>>(
    () => new Set(data?.disabled_modules ?? [])
  );
  const [saved, setSaved] = React.useState<Set<string>>(
    () => new Set(data?.disabled_modules ?? [])
  );

  React.useEffect(() => {
    if (data?.disabled_modules) {
      setDraft(new Set(data.disabled_modules));
      setSaved(new Set(data.disabled_modules));
    }
  }, [data]);

  const isDirty = React.useMemo(
    () =>
      draft.size !== saved.size ||
      [...draft].some((key) => !saved.has(key)),
    [draft, saved]
  );

  const mutation = useMutation({
    mutationFn: updateModuleSettings,
    onSuccess: (updated) => {
      const next = new Set(updated.disabled_modules ?? []);
      setSaved(next);
      setDraft(new Set(next));
      qc.setQueryData(["module-settings", schoolId], updated);
      qc.setQueryData(["school", schoolId], (prev: School | undefined) =>
        prev
          ? { ...prev, disabled_modules: updated.disabled_modules ?? [] }
          : prev
      );
      toast({ title: "Module settings updated", variant: "success" });
      router.refresh();
    },
    onError: (e) => {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  function toggleModule(moduleKey: string, enabled: boolean) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (enabled) next.delete(moduleKey);
      else next.add(moduleKey);
      return next;
    });
  }

  function toggleTab(tabKey: string, enabled: boolean) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (enabled) next.delete(tabKey);
      else next.add(tabKey);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Blocks className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Module Settings</CardTitle>
              <p className="text-sm font-normal text-muted-foreground">
                Enable or disable sidebar modules and their subtabs. Disabled
                features are hidden from the sidebar and blocked from direct
                URL access.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {MODULES.map((module) => {
            const moduleDisabled = draft.has(module.key);
            const Icon = MODULE_ICONS[module.key] ?? Blocks;
            return (
              <div
                key={module.key}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{module.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {module.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={!moduleDisabled}
                    onCheckedChange={(enabled) =>
                      toggleModule(module.key, enabled)
                    }
                    aria-label={`Enable ${module.label}`}
                  />
                </div>

                {module.tabs.length > 0 && (
                  <div className="ml-1 space-y-1 border-l pl-4 pt-1">
                    {module.tabs.map((tab) => {
                      const tabDisabled =
                        moduleDisabled || draft.has(tab.key);
                      return (
                        <div
                          key={tab.key}
                          className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 hover:bg-muted/40"
                        >
                          <p
                            className={
                              moduleDisabled
                                ? "text-sm text-muted-foreground/60"
                                : "text-sm text-muted-foreground"
                            }
                          >
                            {tab.label}
                          </p>
                          <Switch
                            checked={!tabDisabled}
                            disabled={moduleDisabled}
                            onCheckedChange={(enabled) =>
                              toggleTab(tab.key, enabled)
                            }
                            aria-label={`Enable ${tab.label}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty || mutation.isPending}
              onClick={() => setDraft(new Set(saved))}
            >
              Reset
            </Button>
            <Button
              type="button"
              disabled={!isDirty || mutation.isPending}
              onClick={() =>
                mutation.mutate({ schoolId, disabledModules: [...draft] })
              }
            >
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
