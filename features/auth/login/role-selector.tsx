"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Briefcase, GraduationCap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type LoginRole = "admin" | "employee" | "student";

interface RoleOption {
  id: LoginRole;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

const ROLES: RoleOption[] = [
  { id: "admin", label: "Admin", Icon: ShieldCheck, enabled: true },
  { id: "employee", label: "Employee", Icon: Briefcase, enabled: false },
  { id: "student", label: "Student", Icon: GraduationCap, enabled: false },
];

interface RoleSelectorProps {
  value: LoginRole;
  onChange: (role: LoginRole) => void;
  onDisabledSelect?: (role: LoginRole) => void;
}

export function RoleSelector({
  value,
  onChange,
  onDisabledSelect,
}: RoleSelectorProps) {
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
      {ROLES.map((role) => {
        const selected = value === role.id;
        const Icon = role.Icon;
        const handleSelect = () => {
          if (!role.enabled) {
            onDisabledSelect?.(role.id);
            return;
          }
          onChange(role.id);
        };

        return (
          <motion.button
            key={role.id}
            type="button"
            onClick={handleSelect}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            aria-pressed={selected}
            aria-label={`Select ${role.label} role`}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl",
              "h-[88px] w-[88px] shrink-0 border transition-colors duration-200",
              "focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/30",
              selected
                ? "border-transparent bg-brand text-white shadow-lg shadow-brand/25"
                : "border-border bg-white text-foreground hover:border-brand/40"
            )}
          >
            <motion.span
              layout
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                selected
                  ? "bg-white/20 text-white"
                  : "bg-brand/10 text-brand group-hover:bg-brand/15"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </motion.span>
            <span className="text-[11px] font-semibold tracking-wide">
              {role.label.toUpperCase()}
            </span>
            {!role.enabled && (
              <span
                aria-hidden
                className="absolute -right-1.5 -top-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground shadow-sm"
              >
                SOON
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}