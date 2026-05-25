import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon?: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-start justify-between gap-4",
        className
      )}
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
          </div>
        )}
        <div>
          <h1 className="text-page-title">{title}</h1>
          {subtitle && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-caption">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
