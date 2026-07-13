import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular";
}

export default function Skeleton({
  className = "",
  variant = "rectangular"
}: SkeletonProps) {
  const shapes = {
    text: "h-4 w-full rounded",
    rectangular: "h-20 w-full rounded-2xl",
    circular: "h-12 w-12 rounded-full"
  };

  return (
    <div
      className={`
        animate-pulse bg-slate-200/80 dark:bg-slate-800/40 relative overflow-hidden
        ${shapes[variant]}
        ${className}
      `}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
    </div>
  );
}
