"use client";

import {
  IconFlame,
  IconShield,
  IconStethoscope,
  IconArrowRight,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  forwardKindLabel,
  sortedForwardChain,
} from "@/lib/forward-chain";
import type { ForwardChainStep } from "@/types";

const TYPE_CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof IconShield }
> = {
  police: {
    label: "Police",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    icon: IconShield,
  },
  medical: {
    label: "Medical",
    className: "border-green-200 bg-green-50 text-green-700",
    icon: IconStethoscope,
  },
  fire: {
    label: "Fire",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: IconFlame,
  },
};

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
  const key = type?.toLowerCase() ?? "";
  const cfg = TYPE_CONFIG[key] ?? {
    label: type ?? "Station",
    className: "border-border bg-muted text-muted-foreground",
    icon: IconShield,
  };
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`gap-1 capitalize ${cfg.className}`}>
      <Icon size={12} stroke={1.5} />
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
      className={`relative rounded-xl border px-4 py-3 ${
        step.is_current
          ? "border-indigo-300 bg-indigo-50/60 shadow-sm"
          : "border-border bg-card"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          Step {step.order}
        </span>
        {step.is_current && (
          <Badge className="bg-indigo-600 text-white hover:bg-indigo-600">
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
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{time}</p>
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
        <IconArrowRight size={14} stroke={1.5} className="text-muted-foreground" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
              className={`absolute left-0 top-4 h-2.5 w-2.5 rounded-full border-2 ${
                step.is_current
                  ? "border-indigo-600 bg-indigo-600"
                  : "border-muted-foreground/40 bg-background"
              }`}
            />
            <StepRow step={step} />
          </div>
        ))}
      </div>
    </div>
  );
}
