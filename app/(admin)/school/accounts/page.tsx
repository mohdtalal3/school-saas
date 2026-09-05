import { getSchoolSession } from "@/lib/auth/jwt";
import { AccountsManagement } from "@/features/accounts/accounts-management";
import { requireModule } from "@/lib/module-access";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin" || !session.schoolId) {
    redirect("/school-login");
  }
  const { tab } = await searchParams;
  await requireModule(session.schoolId, "accounts", { tabParam: tab });
  return (
    <Suspense fallback={null}>
      <AccountsManagement schoolId={session.schoolId} />
    </Suspense>
  );
}
