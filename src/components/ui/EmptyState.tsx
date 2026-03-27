interface Props {
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ message, icon, action, className = "" }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-[var(--border-default)] ${className}`}>
      {icon && <div className="mb-3 text-[var(--text-tertiary)]">{icon}</div>}
      <p className="font-dm text-sm text-[var(--text-tertiary)]">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
