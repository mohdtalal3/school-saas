"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Settings,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  X,
  UserCog,
  Building2,
  LogOut,
  Users,
  ScrollText,
  BookOpen,
  GraduationCap as GraduationCapIcon,
  Table,
  KeyRound,
  FileText,
  Paperclip,
  CreditCard,
  UsersRound,
  ArrowUpCircle,
  Wallet,
  HandCoins,
  Receipt,
  Search,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Clock3,
  CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface SidebarSubItem {
  label: string;
  icon: React.ElementType;
  tab: string;
}

const baseItems: SidebarItem[] = [
  { href: "/school", label: "Dashboard", icon: LayoutDashboard },
];

const settingsItems: SidebarItem[] = [
  { href: "/school/settings/institute-profile", label: "Institute Profile", icon: Building2 },
  { href: "/school/settings/rules-regulations", label: "Rules & Regulations", icon: ScrollText },
  { href: "/school/settings/account-settings", label: "Account Settings", icon: UserCog },
];

const studentSubItems: SidebarSubItem[] = [
  { label: "All Students", icon: Users, tab: "all" },
  { label: "Basic List", icon: Table, tab: "list" },
  { label: "Admission Letter", icon: FileText, tab: "admission" },
  { label: "Attachments", icon: Paperclip, tab: "attachments" },
  { label: "Family", icon: UsersRound, tab: "family" },
  { label: "Promote", icon: ArrowUpCircle, tab: "promote" },
  { label: "ID Cards", icon: CreditCard, tab: "idcards" },
];

const feeSubItems: SidebarSubItem[] = [
  { label: "Fee Particulars", icon: Receipt, tab: "particulars" },
  { label: "Invoice Generator", icon: FileText, tab: "invoices" },
  { label: "Search Invoices", icon: Search, tab: "search" },
  { label: "Collect Fees", icon: HandCoins, tab: "collect" },
  { label: "Fee Defaulters", icon: AlertTriangle, tab: "defaulters" },
  { label: "Fee Report", icon: BarChart3, tab: "report" },
];

const employeeSubItems: SidebarSubItem[] = [
  { label: "All Employees", icon: Users, tab: "all" },
  { label: "Basic List", icon: Table, tab: "list" },
  { label: "Manage Login", icon: KeyRound, tab: "login" },
  { label: "Job Offer Letter", icon: FileText, tab: "offer" },
  { label: "Attachments", icon: Paperclip, tab: "attachments" },
  { label: "ID Cards", icon: CreditCard, tab: "idcards" },
];

const subjectSubItems: SidebarSubItem[] = [
  { label: "Create Subjects", icon: BookOpen, tab: "create" },
  { label: "Assign Subjects", icon: Table, tab: "assign" },
];

const timetableSubItems: SidebarSubItem[] = [
  { label: "Weekdays", icon: CalendarDays, tab: "weekdays" },
  { label: "Time Periods", icon: Clock3, tab: "periods" },
  { label: "Create Timetable", icon: CalendarRange, tab: "create" },
  { label: "Preview Timetable", icon: Search, tab: "preview" },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
  schoolName: string;
  onLogout: () => void;
}

export function AdminSidebar({ open, onClose, schoolName, onLogout }: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  // Keep groups open by default when you're already inside them,
  // so the active sub-item is visible on initial load.
  const [settingsOpen, setSettingsOpen] = React.useState(
    pathname?.startsWith("/school/settings") ?? false
  );
  const [studentsOpen, setStudentsOpen] = React.useState(
    pathname?.startsWith("/school/students") ?? false
  );
  const [employeesOpen, setEmployeesOpen] = React.useState(
    pathname?.startsWith("/school/employees") ?? false
  );
  const [feesOpen, setFeesOpen] = React.useState(
    pathname?.startsWith("/school/fees") ?? false
  );
  const [subjectsOpen, setSubjectsOpen] = React.useState(pathname?.startsWith("/school/subjects") ?? false);
  const [timetableOpen, setTimetableOpen] = React.useState(pathname?.startsWith("/school/timetable") ?? false);

  React.useEffect(() => {
    // Auto-expand if you navigate into a sub-page elsewhere.
    if (pathname?.startsWith("/school/settings")) setSettingsOpen(true);
    if (pathname?.startsWith("/school/students")) setStudentsOpen(true);
    if (pathname?.startsWith("/school/employees")) setEmployeesOpen(true);
    if (pathname?.startsWith("/school/fees")) setFeesOpen(true);
    if (pathname?.startsWith("/school/subjects")) setSubjectsOpen(true);
    if (pathname?.startsWith("/school/timetable")) setTimetableOpen(true);
  }, [pathname]);

  const settingsActive = pathname?.startsWith("/school/settings") ?? false;
  const employeesActive = pathname?.startsWith("/school/employees") ?? false;
  const classesActive = pathname?.startsWith("/school/classes") ?? false;
  const studentsActive = pathname?.startsWith("/school/students") ?? false;
  const feesActive = pathname?.startsWith("/school/fees") ?? false;
  const subjectsActive = pathname?.startsWith("/school/subjects") ?? false;
  const timetableActive = pathname?.startsWith("/school/timetable") ?? false;

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 scrollbar-thin overflow-y-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/school" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {schoolName}
              </p>
              <p className="text-xs text-sidebar-foreground/70">Admin Portal</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="space-y-1 p-3">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Main
          </p>
          {baseItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-white"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="h-4 w-4" />}
              </Link>
            );
          })}

          {/* Employees — collapsible group */}
          <button
            type="button"
            onClick={() => setEmployeesOpen((v) => !v)}
            aria-expanded={employeesOpen}
            aria-controls="employees-group"
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              employeesActive
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
            )}
          >
            <Users className="h-4 w-4" />
            <span className="flex-1 text-left">Employees</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                employeesOpen ? "rotate-180" : "rotate-0"
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {employeesOpen && (
              <motion.div
                id="employees-group"
                key="employees-group"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-1 ml-2 mt-1 border-l border-sidebar-border/60 pl-2 pb-1">
                  {employeeSubItems.map((item) => {
                    const active = employeesActive && (currentTab === item.tab || (!currentTab && item.tab === "all"));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.tab}
                        href={`/school/employees?tab=${item.tab}`}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-white"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {active && <ChevronRight className="h-4 w-4" />}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <SidebarTabGroup label="Subjects" icon={BookOpen} open={subjectsOpen} setOpen={setSubjectsOpen} active={subjectsActive} currentTab={currentTab} defaultTab="create" href="/school/subjects" items={subjectSubItems} onClose={onClose} />

          <SidebarTabGroup label="Timetable" icon={CalendarRange} open={timetableOpen} setOpen={setTimetableOpen} active={timetableActive} currentTab={currentTab} defaultTab="weekdays" href="/school/timetable" items={timetableSubItems} onClose={onClose} />

          {/* Classes */}
          <Link
            href="/school/classes"
            onClick={onClose}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              classesActive
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
            )}
          >
            <BookOpen className="h-4 w-4" />
            <span className="flex-1">Classes</span>
          </Link>

          {/* Students — collapsible group */}
          <button
            type="button"
            onClick={() => setStudentsOpen((v) => !v)}
            aria-expanded={studentsOpen}
            aria-controls="students-group"
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              studentsActive
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
            )}
          >
            <GraduationCapIcon className="h-4 w-4" />
            <span className="flex-1 text-left">Students</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                studentsOpen ? "rotate-180" : "rotate-0"
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {studentsOpen && (
              <motion.div
                id="students-group"
                key="students-group"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-1 ml-2 mt-1 border-l border-sidebar-border/60 pl-2 pb-1">
                  {studentSubItems.map((item) => {
                    const active = studentsActive && (currentTab === item.tab || (!currentTab && item.tab === "all"));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.tab}
                        href={`/school/students?tab=${item.tab}`}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-white"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {active && <ChevronRight className="h-4 w-4" />}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* General Settings — collapsible group */}
          <p className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Management
          </p>

          {/* Fees — collapsible group */}
          <button
            type="button"
            onClick={() => setFeesOpen((v) => !v)}
            aria-expanded={feesOpen}
            aria-controls="fees-group"
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              feesActive
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
            )}
          >
            <Wallet className="h-4 w-4" />
            <span className="flex-1 text-left">Fees</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                feesOpen ? "rotate-180" : "rotate-0"
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {feesOpen && (
              <motion.div
                id="fees-group"
                key="fees-group"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-1 ml-2 mt-1 border-l border-sidebar-border/60 pl-2 pb-1">
                  {feeSubItems.map((item) => {
                    const active = feesActive && (currentTab === item.tab || (!currentTab && item.tab === "particulars"));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.tab}
                        href={`/school/fees?tab=${item.tab}`}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-white"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {active && <ChevronRight className="h-4 w-4" />}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
            aria-controls="settings-group"
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              settingsActive
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="flex-1 text-left">General Settings</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                settingsOpen ? "rotate-180" : "rotate-0"
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {settingsOpen && (
              <motion.div
                id="settings-group"
                key="settings-group"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-1 ml-2 mt-1 border-l border-sidebar-border/60 pl-2 pb-1">
                  {settingsItems.map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-white"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {active && <ChevronRight className="h-4 w-4" />}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-sidebar-border p-3">
          <button
            onClick={onLogout}
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarTabGroup({ label, icon: Icon, open, setOpen, active, currentTab, defaultTab, href, items, onClose }: {
  label: string; icon: React.ElementType; open: boolean; setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  active: boolean; currentTab: string | null; defaultTab: string; href: string; items: SidebarSubItem[]; onClose: () => void;
}) {
  return <><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className={cn("group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", active ? "bg-sidebar-accent text-white" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white")}><Icon className="h-4 w-4" /><span className="flex-1 text-left">{label}</span><ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} /></button><AnimatePresence initial={false}>{open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="ml-2 mt-1 space-y-1 border-l border-sidebar-border/60 pb-1 pl-2">{items.map((item) => { const ItemIcon = item.icon; const itemActive = active && (currentTab === item.tab || (!currentTab && item.tab === defaultTab)); return <Link key={item.tab} href={`${href}?tab=${item.tab}`} onClick={onClose} className={cn("group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", itemActive ? "bg-sidebar-accent text-white" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white")}><ItemIcon className="h-4 w-4" /><span className="flex-1">{item.label}</span>{itemActive && <ChevronRight className="h-4 w-4" />}</Link>; })}</div></motion.div>}</AnimatePresence></>;
}

export { type SidebarItem };
