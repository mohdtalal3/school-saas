import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MasterNavbar } from "@/components/layout/master-navbar";
import { CreateSchoolForm } from "@/features/master/create-school-form";
import { Button } from "@/components/ui/button";

export default function CreateSchoolPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <MasterNavbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link href="/master">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create School
          </h1>
        </div>
        <CreateSchoolForm />
      </main>
    </div>
  );
}