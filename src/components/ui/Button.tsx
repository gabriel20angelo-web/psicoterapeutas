"use client";
import { type ReactNode } from "react";

interface Props {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
}

const VARIANTS = {
  primary: "btn-gradient ripple",
  secondary: "bg-[var(--bg-card-elevated)] border-[1.5px] border-[var(--border-strong)] text-[var(--text-primary)] hover:border-[var(--orange-500)] hover:text-[var(--orange-400)] hover:bg-[var(--orange-glow)]",
  danger: "bg-[var(--red-bg)] border border-[var(--red-border)] text-[var(--red-text)] hover:bg-red-500/20",
  ghost: "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
};

export default function Button({ variant = "primary", size = "md", children, onClick, type = "button", disabled, icon, className = "" }: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-dm font-semibold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-glow ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
