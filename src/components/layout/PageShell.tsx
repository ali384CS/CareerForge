"use client";

import React from "react";
import { motion } from "framer-motion";
import { pageTransition } from "@/lib/animations";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageShell({
  children,
  className = ""
}: PageShellProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
      className={`flex-1 min-w-0 p-6 md:p-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}
