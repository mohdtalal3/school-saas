import { redirect } from "next/navigation";
import { getMasterSession } from "@/lib/auth/jwt";

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getMasterSession();
  if (!session || session.role !== "master") {
    redirect("/master-login");
  }
  return <>{children}</>;
}