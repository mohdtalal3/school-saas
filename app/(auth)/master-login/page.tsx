import { Metadata } from "next";
import { MasterLoginForm } from "@/features/master/master-login-form";

export const metadata: Metadata = {
  title: "Master Login — School ERP",
};

export default function MasterLoginPage() {
  return (
    <main className="gradient-bg flex min-h-screen items-center justify-center px-4">
      <MasterLoginForm />
    </main>
  );
}