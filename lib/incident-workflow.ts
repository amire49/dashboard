import type { IncidentStatus } from "@/types";

export function normalizeIncidentStatus(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_");
}

const PRIMARY_NEXT: Record<string, IncidentStatus> = {
  dispatched: "en_route",
  en_route: "reached",
  reached: "served",
  served: "resolved",
};

const FALSE_ALARM_FROM = new Set(["dispatched", "en_route", "reached"]);

const TERMINAL = new Set(["resolved", "false_alarm"]);

const PRIMARY_LABELS: Record<string, string> = {
  en_route: "Mark En Route",
  reached: "Mark Reached",
  served: "Mark Served",
  resolved: "Close Incident",
};

export function getPrimaryNextStatus(current: string): IncidentStatus | null {
  const s = normalizeIncidentStatus(current);
  return PRIMARY_NEXT[s] ?? null;
}

export function getPrimaryNextLabel(current: string): string {
  const next = getPrimaryNextStatus(current);
  if (!next) return "";
  return PRIMARY_LABELS[normalizeIncidentStatus(next)] ?? `Mark ${next.replace(/_/g, " ")}`;
}

export function canMarkFalseAlarm(current: string): boolean {
  return FALSE_ALARM_FROM.has(normalizeIncidentStatus(current));
}

export function isTerminalStatus(current: string): boolean {
  return TERMINAL.has(normalizeIncidentStatus(current));
}

export function isAutoOnlyStatus(current: string): boolean {
  const s = normalizeIncidentStatus(current);
  return s === "pending" || s === "routed";
}

export function isUnread(incident: { is_read?: boolean; is_new?: boolean }): boolean {
  return incident.is_new === true || incident.is_read === false;
}
