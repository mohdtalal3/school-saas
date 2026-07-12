import { MasterNavbar } from "@/components/layout/master-navbar";
import { SchoolsList } from "@/features/master/schools-list";

export default function MasterDashboardPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <MasterNavbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Master Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage schools on the platform.
          </p>
        </div>
        <SchoolsList />
      </main>
    </div>
  );
}