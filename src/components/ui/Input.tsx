"use client";

interface Props {
  id?: string;
  label?: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export default function Input({ id, label, type = "text", value, onChange, placeholder, required, error, className = "" }: Props) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5 label-elegant">
          {label} {required && <span className="text-[var(--red-text)]">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={`w-full input-hamilton font-dm text-sm ${error ? 'border-[var(--red-text)]!' : ''}`}
      />
      {error && <p id={errorId} className="font-dm text-xs text-[var(--red-text)] mt-1">{error}</p>}
    </div>
  );
}
