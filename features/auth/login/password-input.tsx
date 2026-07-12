"use client";

import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(({ className, hasError, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground/80" />
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn(
          "h-14 w-full rounded-xl border bg-white pl-11 pr-12 text-sm shadow-sm transition-all",
          "placeholder:text-muted-foreground/70",
          "focus:outline-none focus:ring-4 focus:ring-brand/15",
          hasError
            ? "border-destructive/60 focus:border-destructive focus:ring-destructive/15"
            : "border-border focus:border-brand",
          className
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff className="h-[18px] w-[18px]" />
        ) : (
          <Eye className="h-[18px] w-[18px]" />
        )}
      </button>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";