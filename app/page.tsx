import { redirect } from "next/navigation";
import { getMasterSession } from "@/lib/auth/jwt";

export default async function RootPage() {
  const session = await getMasterSession();
  if (session?.role === "master") {
    redirect("/master");
  }
  redirect("/master-login");
}