"use client";
import { Search, X } from "lucide-react";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "placeholder" | "className" | "onFocus"> {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
}

export default function SearchInput({ value, onChange, placeholder = "Buscar...", className = "", onFocus, ...rest }: Props) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        aria-label="Buscar"
        className="w-full pl-9 pr-8 py-2 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-all duration-200 placeholder:text-[var(--text-tertiary)]"
        {...rest}
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Limpar busca" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
