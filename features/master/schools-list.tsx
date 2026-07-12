"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { School } from "@/types/school.types";

async function fetchSchools(): Promise<School[]> {
  const res = await fetch("/api/schools");
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to load schools");
  }
  return data.data;
}

export function SchoolsList() {
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["schools"],
    queryFn: fetchSchools,
  });

  React.useEffect(() => {
    if (error) {
      toast({
        title: "Could not load schools",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Schools</h2>
          <p className="text-sm text-muted-foreground">
            Manage schools on the platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Refresh
          </Button>
          <Button asChild size="sm">
            <Link href="/master/create-school">
              <Plus className="h-4 w-4" />
              Create School
            </Link>
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      )}

      {!isLoading && data && data.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No schools yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first school to get started.
              </p>
            </div>
            <Button asChild>
              <Link href="/master/create-school">
                <Plus className="h-4 w-4" />
                Create School
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((school, i) => (
            <motion.div
              key={school.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Card className="group transition-shadow hover:shadow-md">
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {school.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={school.logo_url}
                          alt={school.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <Building2 className="h-6 w-6" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{school.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {school.tagline ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Admin portal ready
                    </span>
                    <span>•</span>
                    <span>{school.country ?? "—"}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}