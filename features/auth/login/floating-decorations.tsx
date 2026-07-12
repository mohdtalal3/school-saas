"use client";

import { motion } from "framer-motion";
import { Database, KeyRound, Lock, ShieldCheck, MousePointer2 } from "lucide-react";

/**
 * Decorative transparent cards + floating icons around the hero illustration.
 * Slow infinite drift via Framer Motion. Pure visual — aria-hidden.
 */
export function FloatingDecorations() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Password field card (top-left) */}
      <motion.div
        className="absolute left-[6%] top-[12%] rounded-2xl bg-white/10 px-4 py-3 shadow-xl backdrop-blur-md ring-1 ring-white/15"
        animate={{ y: [0, -10, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2 text-white/90">
          <KeyRound className="h-4 w-4 text-brand-light" />
          <div className="flex gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          </div>
        </div>
      </motion.div>

      {/* Shield badge (top-right) */}
      <motion.div
        className="absolute right-[8%] top-[18%] flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-xl backdrop-blur-md ring-1 ring-white/15"
        animate={{ y: [0, 8, 0], rotate: [4, -4, 4] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      >
        <ShieldCheck className="h-6 w-6 text-brand-light" />
      </motion.div>

      {/* Database card (right-mid) */}
      <motion.div
        className="absolute right-[4%] top-[44%] rounded-2xl bg-white/10 p-3 shadow-xl backdrop-blur-md ring-1 ring-white/15"
        animate={{ y: [0, -8, 0], x: [0, 4, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      >
        <Database className="h-6 w-6 text-brand-light" />
      </motion.div>

      {/* Lock icon (left-mid) */}
      <motion.div
        className="absolute left-[2%] top-[52%] flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 shadow-xl backdrop-blur-md ring-1 ring-white/15"
        animate={{ y: [0, 10, 0], rotate: [-3, 3, -3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      >
        <Lock className="h-5 w-5 text-brand-light" />
      </motion.div>

      {/* Cursor (bottom-left) */}
      <motion.div
        className="absolute bottom-[18%] left-[10%]"
        animate={{ y: [0, -6, 0], x: [0, 4, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative">
          <MousePointer2 className="h-7 w-7 -rotate-12 fill-white text-white drop-shadow-lg" />
          <div className="absolute left-5 top-6 h-2 w-2 rotate-45 bg-white shadow" />
        </div>
      </motion.div>

      {/* Glow orbs */}
      <motion.div
        className="absolute -bottom-12 right-1/4 h-40 w-40 rounded-full bg-brand/40 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -left-12 top-1/3 h-44 w-44 rounded-full bg-purple-300/20 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Connection lines (SVG layer) */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 600 600"
        fill="none"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M80 120 C 200 160, 240 220, 300 280"
          stroke="white"
          strokeOpacity="0.18"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          animate={{ strokeDashoffset: [0, -40] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M520 200 C 460 240, 420 260, 360 280"
          stroke="white"
          strokeOpacity="0.18"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          animate={{ strokeDashoffset: [0, 40] }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
        />
      </svg>
    </div>
  );
}