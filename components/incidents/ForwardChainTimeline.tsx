"use client";

import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  forwardKindLabel,
  sortedForwardChain,
} from "@/lib/forward-chain";
import { stationTypeStyle } from "@/lib/status-styles";
import type { ForwardChainStep } from "@/types";

function formatStepTime(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function TypeBadge({ type }: { type?: string }) {
  const cfg = stationTypeStyle(type);
  const Icon = cfg.icon;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 capitalize", cfg.bg, cfg.text, cfg.border)}
    >
      <Icon className="h-3 w-3" strokeWidth={1.75} />
      {cfg.label}
    </Badge>
  );
}

function StepRow({ step }: { step: ForwardChainStep }) {
  const time = formatStepTime(step.forwarded_at);
  const route =
    step.from_station_name && step.order > 1
      ? `${step.from_station_name} → ${step.station_name}`
      : step.station_name;

  return (
    <div
      className={cn(
        "relative rounded-xl border px-4 py-3",
        step.is_current
          ? "border-info/30 bg-info-muted shadow-sm"
          : "border-border bg-card"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label">
          Step {step.order}
        </span>
        {step.is_current && (
          <Badge className="bg-info text-info-foreground hover:bg-info">
            Current
          </Badge>
        )}
        <TypeBadge type={step.station_type} />
      </div>
      <p className="mt-2 text-sm font-semibold">{route}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {forwardKindLabel(step.kind)}
      </p>
      {step.reason && (
        <p className="mt-1 text-xs text-muted-foreground">{step.reason}</p>
      )}
      {step.initiated_by_name && (
        <p className="mt-1 text-xs text-muted-foreground">
          By {step.initiated_by_name}
        </p>
      )}
      {time && (
        <p className="text-data mt-1 text-muted-foreground">{time}</p>
      )}
    </div>
  );
}

type Props = {
  chain?: ForwardChainStep[] | null;
  title?: string;
  compact?: boolean;
};

export default function ForwardChainTimeline({
  chain,
  title = "Forward chain",
  compact = false,
}: Props) {
  const steps = sortedForwardChain(chain);
  if (steps.length === 0) return null;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center gap-2">
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
        <p className="text-label">
          {title}
        </p>
      </div>
      <div className="relative space-y-3 pl-3">
        <div
          className="absolute bottom-2 left-[5px] top-2 w-px bg-border"
          aria-hidden
        />
        {steps.map((step) => (
          <div key={`${step.order}-${step.station_id}`} className="relative pl-4">
            <span
              className={cn(
                "absolute left-0 top-4 h-2.5 w-2.5 rounded-full border-2",
                step.is_current
                  ? "border-info bg-info"
                  : "border-muted-foreground/40 bg-background"
              )}
            />
            <StepRow step={step} />
          </div>
        ))}
      </div>
    </div>
  );
}