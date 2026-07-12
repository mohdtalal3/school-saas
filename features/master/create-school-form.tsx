"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { CreateSchoolRequest } from "@/types/api.types";

const schema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters"),
  adminEmail: z.string().email("Enter a valid admin email"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  adminName: z.string().min(2, "Admin name is required").optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateSchoolForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      adminEmail: "",
      adminPassword: "",
      adminName: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create school");
      }
      toast({
        title: "School created!",
        description: `${values.name} has been added.`,
        variant: "success",
      });
      router.push("/master");
      router.refresh();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Create New School</CardTitle>
              <p className="text-sm font-normal text-muted-foreground">
                Add a new school and create its first admin account.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* School Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                School Information
              </h3>
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  School Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Suffah Islamic School"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            {/* Admin Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Admin Account
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="adminName">Admin Name</Label>
                  <Input
                    id="adminName"
                    placeholder="Full name"
                    {...register("adminName")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminEmail">
                    Admin Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@school.edu"
                    {...register("adminEmail")}
                  />
                  {errors.adminEmail && (
                    <p className="text-xs text-destructive">
                      {errors.adminEmail.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adminPassword">
                  Admin Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Min. 8 characters"
                  {...register("adminPassword")}
                />
                {errors.adminPassword && (
                  <p className="text-xs text-destructive">
                    {errors.adminPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Creating..." : "Create School"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}