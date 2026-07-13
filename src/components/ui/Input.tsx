"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-0.5"
        >
          {label}
        </label>
      )}
      
      <input
        id={inputId}
        className={`
          w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-950/60 dark:hover:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all placeholder-slate-400 dark:placeholder-slate-500
          ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
          ${className}
        `}
        {...props}
      />
      
      {error && (
        <p className="text-xs text-red-500 ml-0.5 mt-1 font-medium animate-pulse">{error}</p>
      )}
    </div>
  );
}
