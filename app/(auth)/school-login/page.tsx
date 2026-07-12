import { Metadata } from "next";
import { LoginCard } from "@/features/auth/login/login-card";

export const metadata: Metadata = {
  title: "Sign In — School ERP",
  description: "School ERP admin portal sign in.",
};

export default function SchoolLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FC] px-4 py-6 sm:px-6">
      <LoginCard />
    </main>
  );
}