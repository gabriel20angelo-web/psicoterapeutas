"use client";

interface Props {
  id?: string;
  label?: string;
  value: string; // "HH:mm"
  onChange: (val: string) => void;
  className?: string;
}

export default function TimePicker({ id, label, value, onChange, className = "" }: Props) {
  const [h, m] = value.split(":").map(Number);
  const hours = Array.from({ length: 19 }, (_, i) => i + 5); // 5-23
  const minutes = [0, 15, 30, 45];
  const baseId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const hourId = baseId ? `${baseId}-hour` : undefined;
  const minuteId = baseId ? `${baseId}-minute` : undefined;

  return (
    <div className={className}>
      {label && <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>}
      <div className="flex gap-2">
        <select
          id={hourId}
          aria-label={label ? `${label} - hora` : "Hora"}
          value={h}
          onChange={e => onChange(`${String(e.target.value).padStart(2, '0')}:${String(m).padStart(2, '0')}`)}
          className="flex-1 px-3 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)]"
        >
          {hours.map(hour => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}h</option>)}
        </select>
        <select
          id={minuteId}
          aria-label={label ? `${label} - minuto` : "Minuto"}
          value={m}
          onChange={e => onChange(`${String(h).padStart(2, '0')}:${String(e.target.value).padStart(2, '0')}`)}
          className="flex-1 px-3 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)]"
        >
          {minutes.map(min => <option key={min} value={min}>{String(min).padStart(2, '0')}min</option>)}
        </select>
      </div>
    </div>
  );
}
