"use client";

interface Props {
  id?: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
}

export default function Select({ id, label, value, onChange, options, disabled, className = "" }: Props) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={className}>
      {label && <label htmlFor={selectId} className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>}
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3.5 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-all duration-200 appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed pr-10"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
