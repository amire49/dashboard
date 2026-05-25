import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SlidersHorizontal } from "lucide-react";

type Props = {
  children: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
};

export default function FilterBar({ children, trailing, className }: Props) {
  return (
    <Card className={cn("mb-4 gap-0 border py-0 shadow-card", className)}>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <SlidersHorizontal
            className="h-4 w-4 text-muted-foreground"
            strokeWidth={1.75}
          />
        </div>
        {children}
        {trailing && <div className="ml-auto">{trailing}</div>}
      </CardContent>
    </Card>
  );
}
