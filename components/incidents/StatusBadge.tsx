import { cn } from "@/lib/utils";
import { incidentStatusStyle } from "@/lib/status-styles";

type Props = {
  status: string;
  className?: string;
};

export default function StatusBadge({ status, className }: Props) {
  const cfg = incidentStatusStyle(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        cfg.bg,
        cfg.text,
        cfg.border,
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          cfg.dot,
          cfg.pulse && "animate-pulse"
        )}
      />
      {cfg.label}
    </span>
  );
}
