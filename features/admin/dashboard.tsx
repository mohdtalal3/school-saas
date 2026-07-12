"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  Calendar,
  DollarSign,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminShell } from "@/components/layout/admin-shell";

export function AdminDashboard() {
  const { school } = useAdminShell();
  const firstName = school?.name?.split(" ")[0] ?? "Your School";

  const stats = [
    { label: "Total Students", value: "0", icon: Users, accent: "bg-blue-500/10 text-blue-600" },
    { label: "Total Teachers", value: "0", icon: GraduationCap, accent: "bg-emerald-500/10 text-emerald-600" },
    { label: "Attendance", value: "—", icon: Calendar, accent: "bg-amber-500/10 text-amber-600" },
    { label: "Outstanding Fees", value: school?.currency_symbol ?? "$", icon: DollarSign, accent: "bg-purple-500/10 text-purple-600" },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-primary/[0.03] to-transparent p-6 sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              Welcome to your admin portal
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {firstName}
            </h1>
            {school?.tagline && (
              <p className="mt-1 text-sm text-muted-foreground">{school.tagline}</p>
            )}
          </div>
          <Button asChild>
            <Link href="/school/settings/institute-profile">
              Complete profile
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.accent}`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-semibold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Get started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/school/settings/institute-profile"
              className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div>
                <p className="font-medium">Set up institute profile</p>
                <p className="text-xs text-muted-foreground">
                  Logo, contact info, address.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/school/settings/account-settings"
              className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div>
                <p className="font-medium">Configure account settings</p>
                <p className="text-xs text-muted-foreground">
                  Currency, timezone.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Coming soon notice */}
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="font-medium">More modules coming soon</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Students, teachers, attendance, exams, and fees will be available in
            upcoming releases.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}