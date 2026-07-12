"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RememberSwitchProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label?: string;
  className?: string;
  id?: string;
}

export function RememberSwitch({
  checked,
  onCheckedChange,
  label = "Remember me",
  className,
  id,
}: RememberSwitchProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-3 text-sm font-medium text-muted-foreground",
        className
      )}
    >
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          aria-label={label}
        />
        <span
          aria-hidden
          className={cn(
            "h-6 w-11 rounded-full border border-border bg-muted transition-colors duration-200",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 peer-focus-visible:ring-offset-2",
            "peer-checked:border-brand peer-checked:bg-brand"
          )}
        />
        <span
          aria-hidden
          className={cn(
            "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
            "peer-checked:translate-x-5"
          )}
        />
      </span>
      <span className="text-foreground/80">{label}</span>
    </label>
  );
}