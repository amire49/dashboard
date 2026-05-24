import type {
  ForwardChainStep,
  Incident,
  IncidentForwardErrorBody,
} from "@/types";

export function forwardKindLabel(kind?: string | null): string {
  if (!kind) return "Initial routing";
  switch (kind) {
    case "manual_nearest":
      return "Manual → nearest";
    case "manual_station":
      return "Manual → selected station";
    case "auto_timeout":
      return "Auto (no dispatch in time)";
    default:
      return kind.replace(/_/g, " ");
  }
}

export function formatForwardAwayBadge(
  status?: string | null
): { label: string; variant: "manual" | "auto" } {
  if (status === "auto_forwarded") {
    return { label: "Auto-forwarded", variant: "auto" };
  }
  return { label: "Forwarded", variant: "manual" };
}

export function forwardChainStationIds(
  chain?: ForwardChainStep[] | null
): Set<string> {
  const ids = new Set<string>();
  if (!chain) return ids;
  for (const step of chain) {
    if (step.station_id) ids.add(step.station_id);
  }
  return ids;
}

export function isForwardedAwayIncident(incident: Incident): boolean {
  return incident.operator_perspective === "forwarded_away";
}

export function sortedForwardChain(
  chain?: ForwardChainStep[] | null
): ForwardChainStep[] {
  if (!chain?.length) return [];
  return [...chain].sort((a, b) => a.order - b.order);
}

export function parseForwardError(body: unknown): IncidentForwardErrorBody | null {
  if (body === null || body === undefined || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const error =
    typeof o.error === "string"
      ? o.error
      : typeof o.detail === "string"
        ? o.detail
        : null;
  if (!error) return null;
  return {
    error,
    code: typeof o.code === "string" ? o.code : undefined,
    service_type: typeof o.service_type === "string" ? o.service_type : undefined,
    forward_chain: Array.isArray(o.forward_chain)
      ? (o.forward_chain as ForwardChainStep[])
      : undefined,
  };
}

export function noFurtherStationsMessage(serviceType?: string): string {
  const type = serviceType?.replace(/_/g, " ") ?? "that service type";
  return `Final assignment — no more ${type} stations available in the chain.`;
}
