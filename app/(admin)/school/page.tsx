import { AdminDashboard } from "@/features/admin/dashboard";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ moduleDisabled?: string }>;
}) {
  const sp = await searchParams;
  return <AdminDashboard moduleDisabled={sp.moduleDisabled === "1"} />;
}