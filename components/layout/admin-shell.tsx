"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopbar } from "@/components/layout/admin-topbar";
import type { School } from "@/types/school.types";

interface AdminShellContextValue {
  school: School | undefined;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  logout: () => Promise<void>;
}

const AdminShellContext = React.createContext<AdminShellContextValue | null>(null);

export function useAdminShell() {
  const ctx = React.useContext(AdminShellContext);
  if (!ctx) throw new Error("useAdminShell must be used inside AdminShell");
  return ctx;
}

export function useSchoolContext(schoolId?: string) {
  return useQuery({
    queryKey: ["school", schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing schoolId");
      const res = await fetch(`/api/schools/${schoolId}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      return data.data as School;
    },
    enabled: !!schoolId,
  });
}

interface AdminShellProps {
  schoolId: string;
  initialSchool?: School;
  children: React.ReactNode;
}

export function AdminShell({ schoolId, initialSchool, children }: AdminShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const { data: school } = useSchoolContext(schoolId);
  const liveSchool = school ?? initialSchool;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/school-login");
    router.refresh();
  }

  return (
    <AdminShellContext.Provider
      value={{
        school: liveSchool,
        sidebarOpen,
        setSidebarOpen,
        logout,
      }}
    >
      <div className="flex min-h-screen bg-muted/30">
        <AdminSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          schoolName={liveSchool?.name ?? "School ERP"}
          onLogout={logout}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar
            onMenuClick={() => setSidebarOpen(true)}
            schoolName={liveSchool?.name ?? "School ERP"}
            schoolLogo={liveSchool?.logo_url}
          />
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="container mx-auto px-4 py-6 sm:px-6 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminShellContext.Provider>
  );
}