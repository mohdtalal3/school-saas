"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  fetchCategories,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
} from "./api";
import type { AccountCategory, AccountCategoryType } from "@/types/school.types";

type StatusFilter = "all" | "active" | "inactive";
type SortField = "name" | "created_at" | "updated_at";
type SortDir = "asc" | "desc";
type DialogMode = "add" | "edit" | "delete";

export function ChartOfAccountsTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [typeTab, setTypeTab] = React.useState<AccountCategoryType>("income");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [sortField, setSortField] = React.useState<SortField>("name");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  const [mode, setMode] = React.useState<DialogMode | null>(null);
  const [selected, setSelected] = React.useState<AccountCategory | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formActive, setFormActive] = React.useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryKey = ["account-categories", schoolId, typeTab, debouncedSearch, statusFilter, sortField, sortDir];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      fetchCategories(schoolId, {
        type: typeTab,
        search: debouncedSearch,
        status: statusFilter,
        sortBy: sortField,
        sortDir,
      }),
  });
  const categories = data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string | null; is_active?: boolean }) => {
      if (mode === "add") {
        return createCategoryApi(schoolId, { ...payload, type: typeTab });
      }
      return updateCategoryApi(schoolId, selected!.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account-categories", schoolId] });
      setMode(null);
      setSelected(null);
      toast({ title: mode === "add" ? "Category created" : "Category updated", variant: "success" });
    },
    onError: (e) =>
      toast({
        title: "Failed to save category",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => deleteCategoryApi(schoolId, categoryId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["account-categories", schoolId] });
      setMode(null);
      setSelected(null);
      toast({
        title: result.mode === "deactivated" ? "Category deactivated (in use by transactions)" : "Category deleted",
        variant: "success",
      });
    },
    onError: (e) =>
      toast({
        title: "Failed to delete",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e1065]">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage income and expense categories used across the Accounts module.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelected(null);
            setFormName("");
            setFormDescription("");
            setFormActive(true);
            setMode("add");
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      {/* Income / Expense section tabs */}
      <div className="flex gap-2">
        <Button
          variant={typeTab === "income" ? "default" : "outline"}
          onClick={() => setTypeTab("income")}
          className={cn(typeTab === "income" && "bg-emerald-600 hover:bg-emerald-700")}
        >
          <TrendingUp className="mr-2 h-4 w-4" /> Income
        </Button>
        <Button
          variant={typeTab === "expense" ? "default" : "outline"}
          onClick={() => setTypeTab("expense")}
          className={cn(typeTab === "expense" && "bg-rose-600 hover:bg-rose-700")}
        >
          <TrendingDown className="mr-2 h-4 w-4" /> Expense
        </Button>
      </div>

      {/* Search / filter / sort controls */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={`${sortField}:${sortDir}`}
            onValueChange={(v) => {
              const [f, d] = v.split(":");
              setSortField(f as SortField);
              setSortDir(d as SortDir);
            }}
          >
            <SelectTrigger className="w-full sm:w-[190px]">
              <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name:asc">Name A→Z</SelectItem>
              <SelectItem value="name:desc">Name Z→A</SelectItem>
              <SelectItem value="created_at:desc">Newest first</SelectItem>
              <SelectItem value="created_at:asc">Oldest first</SelectItem>
              <SelectItem value="updated_at:desc">Recently updated</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Category table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <p className="text-sm font-medium">No {typeTab} categories yet</p>
              <p className="text-xs text-muted-foreground">
                Create your first {typeTab} category to start recording transactions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{category.name}</td>
                      <td className="max-w-[240px] truncate px-4 py-3 text-muted-foreground">
                        {category.description || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            category.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
                          )}
                        >
                          {category.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(category.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(category.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setSelected(category);
                              setFormName(category.name);
                              setFormDescription(category.description ?? "");
                              setFormActive(category.is_active);
                              setMode("edit");
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelected(category);
                              setMode("delete");
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={mode === "add" || mode === "edit"} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === "add" ? "Add" : "Edit"} {typeTab === "income" ? "Income" : "Expense"} Category</DialogTitle>
            <DialogDescription>
              Category names must be unique within their type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={typeTab === "income" ? "e.g. Admission Fees" : "e.g. Electricity Bill"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description (optional)</Label>
              <Input
                id="category-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Short description"
              />
            </div>
            {mode === "edit" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Active (inactive categories are hidden from new transactions)
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button
              disabled={saveMutation.isPending || !formName.trim()}
              onClick={() =>
                saveMutation.mutate({
                  name: formName.trim(),
                  description: formDescription.trim() || null,
                  is_active: mode === "edit" ? formActive : true,
                })
              }
            >
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "add" ? "Create" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={mode === "delete"} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate category?</DialogTitle>
            <DialogDescription>
              Categories used by transactions are never permanently deleted — this category will be
              deactivated instead. Historical transactions keep their category.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!selected) return;
                deleteMutation.mutate(selected.id);
              }}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
