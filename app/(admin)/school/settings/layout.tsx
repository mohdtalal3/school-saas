import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">General Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your school profile, calendar, rules, and account preferences.
        </p>
      </div>
      {children}
    </div>
  );
}
