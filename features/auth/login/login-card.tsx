"use client";

import { motion } from "framer-motion";
import { useToast } from "@/components/ui/toast";
import { LoginForm } from "./login-form";
import { HeroSection } from "./hero-section";

/**
 * Premium two-panel login shell.
 * Left: lavender form panel. Right: dark-purple hero (hidden on mobile).
 */
export function LoginCard() {
  const { toast } = useToast();

  const onSignUp = () => {
    toast({
      title: "Account creation",
      description:
        "Accounts are created by your school administrator. Ask yours for an invite.",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="grid w-full max-w-[1280px] overflow-hidden rounded-3xl bg-white shadow-2xl shadow-brand/10 ring-1 ring-black/5 lg:h-[830px] lg:grid-cols-[42fr_58fr] md:grid-cols-[45fr_55fr]"
    >
      {/* Left: form panel */}
      <div className="flex flex-col justify-start bg-brand-light px-6 py-10 sm:px-12 sm:py-14">
        <div className="mx-auto flex w-full max-w-[440px] flex-col">
          <LoginForm />
        </div>
      </div>

      {/* Right: hero panel */}
      <HeroSection onSignUp={onSignUp} />
    </motion.div>
  );
}