import { cn } from "@/lib/utils";
import { categoryStyle } from "@/lib/status-styles";

type Props = {
  category?: string | null;
  className?: string;
};

export default function CategoryBadge({ category, className }: Props) {
  const cfg = categoryStyle(category);
  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize",
        cfg.bg,
        cfg.text,
        cfg.border,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      {category ?? cfg.label}
    </span>
  );
}
