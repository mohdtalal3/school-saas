"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Save,
  ScrollText,
  Info,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

interface RulesResponse {
  employee_rules: string | null;
  student_rules: string | null;
}

interface RulesRegulationsFormProps {
  schoolId: string;
}

export function RulesRegulationsForm({ schoolId }: RulesRegulationsFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [employeeRules, setEmployeeRules] = useState("");
  const [studentRules, setStudentRules] = useState("");
  const [activeTab, setActiveTab] = useState<"employee" | "student">("employee");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/settings/rules-regulations/${schoolId}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!cancelled && res.ok && json.data) {
          setEmployeeRules(json.data.employee_rules ?? "");
          setStudentRules(json.data.student_rules ?? "");
        } else if (!cancelled) {
          toast({
            title: "Failed to load",
            description: json.error ?? "Could not load rules.",
            variant: "destructive",
          });
        }
      } catch (e) {
        if (!cancelled) {
          toast({
            title: "Network error",
            description: e instanceof Error ? e.message : "Could not load rules.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [schoolId, toast]);

  async function save(kind: "employee" | "student") {
    setSaving(true);
    try {
      const body =
        kind === "employee"
          ? { employee_rules: employeeRules }
          : { student_rules: studentRules };
      const res = await fetch(`/api/settings/rules-regulations/${schoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      toast({
        title: "Rules saved",
        description:
          kind === "employee"
            ? "Employee rules updated. New offer letters will use these rules."
            : "Student rules updated.",
      });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Could not save rules.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading rules…
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Rules &amp; Regulations
              </CardTitle>
              <CardDescription>
                Maintain the rules printed on Job Offer Letters and Student documents. Each has its own copy — edit anytime.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              Use plain text. Number each rule on a new line for readability (e.g.&nbsp;
              <code className="rounded bg-white/60 px-1 py-0.5 dark:bg-black/40">1. Be on time</code>).
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "employee" | "student")}
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="employee" className="gap-1.5">
                <Briefcase className="h-4 w-4" />
                Employees
              </TabsTrigger>
              <TabsTrigger value="student" className="gap-1.5">
                <GraduationCap className="h-4 w-4" />
                Students
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employee" className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="employee-rules">Employee rules</Label>
                <Textarea
                  id="employee-rules"
                  rows={14}
                  value={employeeRules}
                  onChange={(e) => setEmployeeRules(e.target.value)}
                  placeholder="1. The employee shall report to the school premises on time..."
                  className="font-mono text-sm leading-relaxed"
                />
                <p className="text-xs text-muted-foreground">
                  These rules appear on every Job Offer Letter.
                </p>
              </div>
              <Button disabled={saving} onClick={() => save("employee")}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save employee rules
              </Button>
            </TabsContent>

            <TabsContent value="student" className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="student-rules">Student rules</Label>
                <Textarea
                  id="student-rules"
                  rows={14}
                  value={studentRules}
                  onChange={(e) => setStudentRules(e.target.value)}
                  placeholder="1. Students must arrive at school on time..."
                  className="font-mono text-sm leading-relaxed"
                />
                <p className="text-xs text-muted-foreground">
                  Used for student contracts / handbooks. Keep separate from employee rules.
                </p>
              </div>
              <Button disabled={saving} onClick={() => save("student")}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save student rules
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
