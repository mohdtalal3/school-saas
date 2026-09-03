import { getSchoolSession } from "@/lib/auth/jwt";
import { FeeManagement } from "@/features/fees/fee-management";
import { requireModule } from "@/lib/module-access";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin" || !session.schoolId) {
    redirect("/school-login");
  }
  const { tab } = await searchParams;
  await requireModule(session.schoolId, "fees", { tabParam: tab });
  return (
    <Suspense fallback={null}>
      <FeeManagement schoolId={session.schoolId} />
    </Suspense>
  );
}
