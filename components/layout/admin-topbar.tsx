"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Breadcrumb {
  label: string;
  href?: string;
}

const PATH_LABELS: Record<string, Breadcrumb[]> = {
  "/school": [{ label: "Dashboard" }],
  "/school/settings": [{ label: "Settings", href: "/school/settings" }, { label: "General" }],
  "/school/settings/institute-profile": [
    { label: "Settings", href: "/school/settings" },
    { label: "Institute Profile" },
  ],
  "/school/settings/account-settings": [
    { label: "Settings", href: "/school/settings" },
    { label: "Account Settings" },
  ],
};

interface AdminTopbarProps {
  onMenuClick: () => void;
  schoolName: string;
  schoolLogo?: string | null;
}

export function AdminTopbar({ onMenuClick, schoolName, schoolLogo }: AdminTopbarProps) {
  const pathname = usePathname();
  const breadcrumbs = PATH_LABELS[pathname] ?? [{ label: "Dashboard" }];

  const initials = schoolName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={cn(i === 0 ? "font-medium" : "text-muted-foreground")}>
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {/* School badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {schoolLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={schoolLogo}
              alt={schoolName}
              className="h-5 w-5 rounded-full object-cover"
            />
          ) : null}
          <span className="max-w-[120px] truncate">{schoolName}</span>
        </div>

        {/* Admin avatar */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-medium leading-none">Admin</p>
            <p className="text-[10px] text-muted-foreground">Administrator</p>
          </div>
          <Avatar className="h-8 w-8">
            {schoolLogo && <AvatarImage src={schoolLogo} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}