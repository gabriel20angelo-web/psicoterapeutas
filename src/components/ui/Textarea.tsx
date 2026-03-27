"use client";

import { forwardRef } from "react";

interface Props {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
  rows?: number;
  id?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, value, onChange, placeholder, required, error, className = "", rows = 3, id }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={inputId}
            className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5"
          >
            {label} {required && <span className="text-[var(--red-text)]">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className={`w-full px-3.5 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border transition-all duration-200 outline-none resize-none placeholder:text-[var(--text-tertiary)] text-[var(--text-primary)] ${
            error
              ? "border-[var(--red-text)]"
              : "border-[var(--border-default)] focus:border-[var(--orange-500)] hover:border-[var(--border-strong)]"
          }`}
        />
        {error && <p className="font-dm text-xs text-[var(--red-text)] mt-1">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
