"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Upload,
  Building2,
  Loader2,
  ImageIcon,
  Globe,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const COUNTRIES = [
  "Pakistan",
  "India",
  "Bangladesh",
  "United Arab Emirates",
  "Saudi Arabia",
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "Other",
];

const schema = z.object({
  name: z.string().min(2, "Institute name is required"),
  tagline: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z
    .string()
    .url("Enter a valid URL (https://...)")
    .optional()
    .or(z.literal("")),
  address: z.string().max(500).optional(),
  country: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

async function fetchInstituteProfile(schoolId: string): Promise<School> {
  const res = await fetch(`/api/settings/institute-profile/${schoolId}`);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to load");
  return data.data;
}

async function updateProfile({
  schoolId,
  values,
}: {
  schoolId: string;
  values: FormValues;
}): Promise<School> {
  const res = await fetch(`/api/settings/institute-profile/${schoolId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: values.name,
      tagline: values.tagline || null,
      phone: values.phone || null,
      email: values.email || null,
      website: values.website || null,
      address: values.address || null,
      country: values.country || null,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Update failed");
  return data.data;
}

export function InstituteProfileForm({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { school } = useAdminShell();
  const [logoUploading, setLogoUploading] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["institute-profile", schoolId],
    queryFn: () => fetchInstituteProfile(schoolId),
    initialData: school,
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
          name: data.name ?? "",
          tagline: data.tagline ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          website: data.website ?? "",
          address: data.address ?? "",
          country: data.country ?? "",
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      toast({
        title: "Profile updated",
        description: "Changes saved successfully.",
        variant: "success",
      });
      qc.setQueryData(["institute-profile", schoolId], updated);
      qc.setQueryData(["school", schoolId], updated);
      reset({
        name: updated.name ?? "",
        tagline: updated.tagline ?? "",
        phone: updated.phone ?? "",
        email: updated.email ?? "",
        website: updated.website ?? "",
        address: updated.address ?? "",
        country: updated.country ?? "",
      });
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

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/settings/institute-profile/${schoolId}/logo`,
        { method: "POST", body: fd }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Logo upload failed");
      }
      const updated = json.data.school as School;
      qc.setQueryData(["institute-profile", schoolId], updated);
      qc.setQueryData(["school", schoolId], updated);
      toast({
        title: "Logo updated",
        variant: "success",
      });
      router.refresh();
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  }

  const currentLogo =
    data?.logo_url ?? (typeof watch("logo_url") === "string" ? null : null);

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
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Update Profile</CardTitle>
              <p className="text-sm font-normal text-muted-foreground">
                Manage your institute's profile information.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((v) =>
              updateMutation.mutate({ schoolId, values: v })
            )}
            className="space-y-8"
          >
            {/* Logo */}
            <div className="grid gap-6 md:grid-cols-[200px_1fr] md:gap-8">
              <div className="flex flex-col items-center gap-3">
                <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/40">
                  {currentLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentLogo}
                      alt="Logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <label className="w-full">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={onLogoChange}
                  />
                  <span className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-accent">
                    {logoUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Change Logo
                  </span>
                </label>
                <p className="text-center text-[10px] text-muted-foreground">
                  JPG, PNG. Max 500KB
                </p>
              </div>

              {/* Name + Tagline */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">
                    Name of Institute <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g. Suffah Islamic School System"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tagline">
                    Target Line <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tagline"
                    placeholder="Effort for Excellence"
                    {...register("tagline")}
                  />
                  {errors.tagline && (
                    <p className="text-xs text-destructive">
                      {errors.tagline.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="0514905828"
                    className="pl-9"
                    {...register("phone")}
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@school.edu"
                    className="pl-9"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://school.edu"
                    className="pl-9"
                    {...register("website")}
                  />
                </div>
                {errors.website && (
                  <p className="text-xs text-destructive">
                    {errors.website.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="country">
                  Country <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch("country") || ""}
                  onValueChange={(v) => setValue("country", v, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">
                Address <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="address"
                  rows={3}
                  placeholder="Near New City Phase 2 GT Road Wah Cantt"
                  className="pl-9"
                  {...register("address")}
                />
              </div>
              {errors.address && (
                <p className="text-xs text-destructive">
                  {errors.address.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                disabled={!isDirty || updateMutation.isPending}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={!isDirty || updateMutation.isPending || isLoading}
              >
                {updateMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Update Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}