"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

import { PasswordInput } from "./password-input";
import { RememberSwitch } from "./remember-switch";
import { RoleSelector, type LoginRole } from "./role-selector";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

interface LoginFormProps {
  className?: string;
}

export function LoginForm({ className }: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [role, setRole] = React.useState<LoginRole>("admin");
  const [remember, setRemember] = React.useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch("/api/auth/school-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, role, remember }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }
      return data.data;
    },
    onSuccess: () => {
      toast({ title: "Welcome back!", variant: "success" });
      router.push("/school");
      router.refresh();
    },
    onError: (e) => {
      toast({
        title: "Login failed",
        description: e instanceof Error ? e.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const onDisabledRole = (r: LoginRole) => {
    toast({
      title: `${r.charAt(0).toUpperCase() + r.slice(1)} portal coming soon`,
      description:
        "Admin login is available today. Other role portals are on the roadmap.",
    });
  };

  const onForgot = () => {
    toast({
      title: "Password reset",
      description: "Please contact your school administrator to reset your password.",
    });
  };

  return (
    <form
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      className={cn("space-y-6", className)}
      noValidate
    >
      {/* Logo block */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-md shadow-brand/30">
          <span className="text-base font-bold">S</span>
        </div>
        <div>
          <div className="text-base font-bold tracking-tight text-foreground">
            School ERP
          </div>
          <div className="text-[11px] text-muted-foreground">
            Please enter your credentials to access your dashboard.
          </div>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome Back! <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your role to continue.
        </p>
      </div>

      <div>
        <RoleSelector
          value={role}
          onChange={setRole}
          onDisabledSelect={onDisabledRole}
        />
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-foreground/80"
          >
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground/80" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@school.edu"
              className="h-14 rounded-xl border-border pl-11 text-sm focus-visible:border-brand focus-visible:ring-brand/20"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
          </div>
          <AnimatePresence>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-destructive"
              >
                {errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground/80"
          >
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            hasError={!!errors.password}
            {...register("password")}
          />
          <AnimatePresence>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-destructive"
              >
                {errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <RememberSwitch
          id="remember"
          checked={remember}
          onCheckedChange={setRemember}
        />
        <button
          type="button"
          onClick={onForgot}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-brand focus:outline-none focus-visible:underline"
        >
          Forgot password?
        </button>
      </div>

      <Button
        type="submit"
        disabled={mutation.isPending}
        className="login-gradient h-[54px] w-full rounded-[14px] text-base font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30 focus-visible:ring-brand/40"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Login"
        )}
      </Button>
    </form>
  );
}