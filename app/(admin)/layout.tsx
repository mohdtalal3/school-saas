import { redirect } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getSchoolById } from "@/services/school.service";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin") {
    redirect("/school-login");
  }

  // Prefetch the school record so the UI renders immediately on first paint.
  let initialSchool;
  try {
    initialSchool = await getSchoolById(session.schoolId);
  } catch {
    initialSchool = undefined;
  }

  // The client shell handles layout (sidebar + topbar + data fetching).
  const { AdminShell } = await import("@/components/layout/admin-shell");
  return (
    <AdminShell schoolId={session.schoolId} initialSchool={initialSchool}>
      {children}
    </AdminShell>
  );
}