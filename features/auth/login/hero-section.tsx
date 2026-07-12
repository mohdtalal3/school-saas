"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { HeroIllustration } from "./hero-illustration";
import { FloatingDecorations } from "./floating-decorations";
import { AnimatedBackground } from "./animated-background";

interface HeroSectionProps {
  onSignUp?: () => void;
}

export function HeroSection({ onSignUp }: HeroSectionProps) {
  return (
    <div className="hero-mesh relative hidden overflow-hidden md:block">
      <AnimatedBackground />

      {/* Top right: "Don't have an account?" + Sign Up button */}
      <div className="absolute right-8 top-8 z-20 flex items-center gap-3">
        <span className="text-sm text-white/60">Don&apos;t have an account?</span>
        <button
          type="button"
          onClick={onSignUp}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Sign Up
        </button>
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-2"
        >
          <h2 className="text-5xl font-bold leading-tight text-white xl:text-[56px]">
            Continue Managing!
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-base leading-relaxed text-white/65">
            Your all-in-one platform to run classes, track attendance, manage
            fees, and empower every classroom — all from one elegant dashboard.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative w-full max-w-[560px]"
        >
          <FloatingDecorations />
          <HeroIllustration className="mx-auto w-full max-w-[520px]" />
        </motion.div>
      </div>
    </div>
  );
}