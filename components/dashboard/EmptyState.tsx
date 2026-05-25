import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-20 text-center",
        className
      )}
    >
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-9 w-9 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <p className="text-section-title mb-2">{title}</p>
      <p className="max-w-md text-caption">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
