import { getSchoolSession } from "@/lib/auth/jwt";
import { FeeManagement } from "@/features/fees/fee-management";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function FeesPage() {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin" || !session.schoolId) {
    redirect("/school-login");
  }
  return (
    <Suspense fallback={null}>
      <FeeManagement schoolId={session.schoolId} />
    </Suspense>
  );
}
