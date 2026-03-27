interface Props {
  bg: string;
  text: string;
  label: string;
  dot?: string;
  size?: "sm" | "md";
  mono?: boolean;
}

export default function Badge({ bg, text, label, dot, size = "sm", mono }: Props) {
  return (
    <span
      role="status"
      className={`
        inline-flex items-center gap-1.5 font-semibold rounded-full border badge-hamilton
        ${mono ? 'font-mono tracking-tight' : 'font-dm'}
        ${bg} ${text}
        ${size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs"}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {label}
    </span>
  );
}
