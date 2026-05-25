import { cn } from "@/lib/utils";
import {
  STAT_CARD_VARIANTS,
  type StatCardVariant,
} from "@/lib/status-styles";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  variant?: StatCardVariant;
  className?: string;
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  className,
}: Props) {
  const styles = STAT_CARD_VARIANTS[variant];

  return (
    <Card
      className={cn(
        "gap-0 border py-0 shadow-card",
        styles.border,
        className
      )}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            styles.iconBg
          )}
        >
          <Icon className={cn("h-6 w-6", styles.iconColor)} strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-data text-3xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-caption">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
