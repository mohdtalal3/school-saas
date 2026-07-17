"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { apiRequest, jsonRequest } from "@/features/scheduling/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import type { Subject } from "@/types/school.types";

export function SubjectCatalogTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const key = ["subjects", schoolId];
  const query = useQuery({ queryKey: key, queryFn: () => apiRequest<Subject[]>(`/api/subjects/${schoolId}`) });

  const mutation = useMutation({
    mutationFn: ({ url, init }: { url: string; init: RequestInit }) => apiRequest(url, init),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setName(""); setEditingId(null); toast({ title: "Subjects updated", variant: "success" }); },
    onError: (e) => toast({ title: "Could not update subjects", description: e instanceof Error ? e.message : "Try again", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Subjects</h1>
        <p className="text-sm text-muted-foreground">Manage the school-wide subject catalog. Common subjects are added automatically.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Add another subject</CardTitle></CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); if (name.trim()) mutation.mutate({ url: `/api/subjects/${schoolId}`, init: jsonRequest("POST", { name }) }); }}>
            <div className="flex-1 space-y-1.5"><Label htmlFor="subject-name">Subject name</Label><Input id="subject-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Physics" /></div>
            <Button disabled={!name.trim() || mutation.isPending}><Plus className="mr-2 h-4 w-4" />Add Subject</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4" />Subject Catalog ({query.data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {query.isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm"><thead className="bg-muted/60"><tr><th className="px-4 py-3 text-left font-medium">Subject</th><th className="w-32 px-4 py-3 text-right font-medium">Actions</th></tr></thead>
                <tbody>{query.data?.map((subject) => <tr key={subject.id} className="border-t">
                  <td className="px-4 py-3">{editingId === subject.id ? <Input className="max-w-sm" value={editName} onChange={(e) => setEditName(e.target.value)} /> : <span className="font-medium">{subject.name}</span>}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                    {editingId === subject.id ? <><Button size="icon" variant="ghost" aria-label="Save" onClick={() => mutation.mutate({ url: `/api/subjects/${schoolId}/${subject.id}`, init: jsonRequest("PATCH", { name: editName }) })}><Check className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Cancel" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button></> : <><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditingId(subject.id); setEditName(subject.name); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Delete" className="text-destructive" onClick={() => mutation.mutate({ url: `/api/subjects/${schoolId}/${subject.id}`, init: { method: "DELETE" } })}><Trash2 className="h-4 w-4" /></Button></>}
                  </div></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
