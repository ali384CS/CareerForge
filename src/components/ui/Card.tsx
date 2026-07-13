"use client";

import React from "react";
import { motion } from "framer-motion";
import { hoverScale } from "@/lib/animations";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  children: React.ReactNode;
}

export default function Card({
  hoverEffect = true,
  children,
  className = "",
  ...props
}: CardProps) {
  const baseStyle = "bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm overflow-hidden relative";

  if (hoverEffect) {
    return (
      <motion.div
        whileHover={hoverScale.whileHover}
        whileTap={hoverScale.whileTap}
        className={`${baseStyle} transition-colors hover:border-slate-350 dark:hover:border-slate-700 cursor-pointer ${className}`}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${baseStyle} ${className}`} {...props}>
      {children}
    </div>
  );
}
