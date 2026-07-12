"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Globe2,
  Coins,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAdminShell } from "@/components/layout/admin-shell";
import type { School } from "@/types/school.types";

const TIMEZONES = [
  "UTC",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

const CURRENCY_SYMBOLS = ["$", "€", "£", "¥", "₹", "₨", "د.إ", "﷼", "R$", "A$"];

const schema = z.object({
  currency_symbol: z.string().min(1).max(5),
  currency_name: z.string().min(1).max(50),
  timezone: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

interface AccountSettingsDTO {
  currency_symbol: string;
  currency_name: string;
  timezone: string;
}

async function fetchSettings(schoolId: string): Promise<AccountSettingsDTO> {
  const res = await fetch(`/api/settings/account-settings/${schoolId}`);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to load");
  return data.data;
}

async function updateSettings({
  schoolId,
  values,
}: {
  schoolId: string;
  values: FormValues;
}): Promise<AccountSettingsDTO> {
  const res = await fetch(`/api/settings/account-settings/${schoolId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Update failed");
  return data.data;
}

export function AccountSettingsForm({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { school } = useAdminShell();

  const { data, isLoading } = useQuery({
    queryKey: ["account-settings", schoolId],
    queryFn: () => fetchSettings(schoolId),
    initialData: school
      ? {
          currency_symbol: school.currency_symbol,
          currency_name: school.currency_name,
          timezone: school.timezone,
        }
      : undefined,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: data
      ? {
          currency_symbol: data.currency_symbol,
          currency_name: data.currency_name,
          timezone: data.timezone,
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (updated) => {
      toast({
        title: "Settings updated",
        variant: "success",
      });
      qc.setQueryData(["account-settings", schoolId], updated);
      // Also patch the school record (currency fields)
      qc.setQueryData(["school", schoolId], (prev: School | undefined) =>
        prev
          ? {
              ...prev,
              currency_symbol: updated.currency_symbol,
              currency_name: updated.currency_name,
              timezone: updated.timezone,
            }
          : prev
      );
      reset(updated);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Account Settings</CardTitle>
              <p className="text-sm font-normal text-muted-foreground">
                Configure currency and timezone for your school.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((v) => mutation.mutate({ schoolId, values: v }))}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="currency_symbol">Currency Symbol</Label>
                <div className="relative">
                  <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Select
                    value={watch("currency_symbol")}
                    onValueChange={(v) =>
                      setValue("currency_symbol", v, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger className="pl-9">
                      <SelectValue placeholder="Select symbol" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_SYMBOLS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.currency_symbol && (
                  <p className="text-xs text-destructive">
                    {errors.currency_symbol.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency_name">Currency Name</Label>
                <Input
                  id="currency_name"
                  placeholder="e.g. USD, PKR, AED"
                  {...register("currency_name")}
                />
                {errors.currency_name && (
                  <p className="text-xs text-destructive">
                    {errors.currency_name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <div className="relative">
                <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Select
                  value={watch("timezone")}
                  onValueChange={(v) =>
                    setValue("timezone", v, { shouldDirty: true })
                  }
                >
                  <SelectTrigger className="pl-9">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.timezone && (
                <p className="text-xs text-destructive">
                  {errors.timezone.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                disabled={!isDirty || mutation.isPending}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={!isDirty || mutation.isPending || isLoading}
              >
                {mutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Update Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}