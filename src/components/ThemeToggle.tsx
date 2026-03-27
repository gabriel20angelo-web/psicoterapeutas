"use client";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-[rgba(200,75,49,.06)]"
      style={{ color: theme === "dark" ? "var(--text-secondary)" : "var(--orange-500)" }}
      aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "light" ? (
          <motion.span
            key="moon"
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <Moon size={18} />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ opacity: 0, rotate: 90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.6 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <Sun size={18} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
