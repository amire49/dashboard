import type { LucideIcon } from "lucide-react";
import {
  CircleDashed,
  Flame,
  Shield,
  Stethoscope,
} from "lucide-react";

export type StatusStyle = {
  label: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
  pulse?: boolean;
};

export type CategoryStyle = {
  label: string;
  text: string;
  bg: string;
  border: string;
  icon: LucideIcon;
};

export type StationTypeStyle = CategoryStyle;

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "_");
}

const INCIDENT_STATUS_STYLES: Record<string, StatusStyle> = {
  pending: {
    label: "Pending",
    text: "text-status-pending",
    bg: "bg-status-pending-muted",
    border: "border-status-pending/25",
    dot: "bg-status-pending",
  },
  routed: {
    label: "Routed",
    text: "text-status-routed",
    bg: "bg-status-routed-muted",
    border: "border-status-routed/30",
    dot: "bg-status-routed",
    pulse: true,
  },
  dispatched: {
    label: "Dispatched",
    text: "text-status-dispatched",
    bg: "bg-status-dispatched-muted",
    border: "border-status-dispatched/30",
    dot: "bg-status-dispatched",
  },
  en_route: {
    label: "En Route",
    text: "text-status-en-route",
    bg: "bg-status-en-route-muted",
    border: "border-status-en-route/30",
    dot: "bg-status-en-route",
  },
  reached: {
    label: "Reached",
    text: "text-status-reached",
    bg: "bg-status-reached-muted",
    border: "border-status-reached/30",
    dot: "bg-status-reached",
  },
  served: {
    label: "Served",
    text: "text-status-served",
    bg: "bg-status-served-muted",
    border: "border-status-served/30",
    dot: "bg-status-served",
  },
  resolved: {
    label: "Resolved",
    text: "text-status-resolved",
    bg: "bg-status-resolved-muted",
    border: "border-status-resolved/30",
    dot: "bg-status-resolved",
  },
  false_alarm: {
    label: "False Alarm",
    text: "text-status-false-alarm",
    bg: "bg-status-false-alarm-muted",
    border: "border-status-false-alarm/25",
    dot: "bg-status-false-alarm",
  },
  in_progress: {
    label: "In Progress",
    text: "text-status-en-route",
    bg: "bg-status-en-route-muted",
    border: "border-status-en-route/30",
    dot: "bg-status-en-route",
  },
};

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  fire: {
    label: "Fire",
    text: "text-station-fire",
    bg: "bg-station-fire-muted",
    border: "border-station-fire/30",
    icon: Flame,
  },
  medical: {
    label: "Medical",
    text: "text-station-medical",
    bg: "bg-station-medical-muted",
    border: "border-station-medical/30",
    icon: Stethoscope,
  },
  police: {
    label: "Police",
    text: "text-station-police",
    bg: "bg-station-police-muted",
    border: "border-station-police/30",
    icon: Shield,
  },
  crime: {
    label: "Crime",
    text: "text-station-police",
    bg: "bg-station-police-muted",
    border: "border-station-police/30",
    icon: Shield,
  },
};

const DEFAULT_CATEGORY: CategoryStyle = {
  label: "Unknown",
  text: "text-muted-foreground",
  bg: "bg-muted",
  border: "border-border",
  icon: CircleDashed,
};

const DEFAULT_STATUS: StatusStyle = {
  label: "Unknown",
  text: "text-muted-foreground",
  bg: "bg-muted",
  border: "border-border",
  dot: "bg-muted-foreground",
};

export function incidentStatusStyle(status: string): StatusStyle {
  const key = normalizeKey(status);
  return INCIDENT_STATUS_STYLES[key] ?? DEFAULT_STATUS;
}

export function categoryStyle(category?: string | null): CategoryStyle {
  const key = normalizeKey(category ?? "");
  return CATEGORY_STYLES[key] ?? {
    ...DEFAULT_CATEGORY,
    label: category ?? "Unknown",
  };
}

export function stationTypeStyle(type?: string | null): StationTypeStyle {
  return categoryStyle(type ?? "");
}

export function statusFilterLabel(status: string): string {
  if (status === "all") return "All Statuses";
  return incidentStatusStyle(status).label;
}

export const STAT_CARD_VARIANTS = {
  default: {
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    border: "border-border",
  },
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    border: "border-primary/20",
  },
  info: {
    iconBg: "bg-info-muted",
    iconColor: "text-info",
    border: "border-info/20",
  },
  success: {
    iconBg: "bg-success-muted",
    iconColor: "text-success",
    border: "border-success/20",
  },
  warning: {
    iconBg: "bg-warning-muted",
    iconColor: "text-warning-foreground",
    border: "border-warning/25",
  },
  danger: {
    iconBg: "bg-status-routed-muted",
    iconColor: "text-status-routed",
    border: "border-status-routed/25",
  },
} as const;

export type StatCardVariant = keyof typeof STAT_CARD_VARIANTS;

const INCIDENT_STATUS_CSS_VARS: Record<string, string> = {
  pending: "--status-pending",
  routed: "--status-routed",
  dispatched: "--status-dispatched",
  en_route: "--status-en-route",
  reached: "--status-reached",
  served: "--status-served",
  resolved: "--status-resolved",
  false_alarm: "--status-false-alarm",
  in_progress: "--status-en-route",
};

const STATION_TYPE_CSS_VARS: Record<string, string> = {
  police: "--station-police",
  medical: "--station-medical",
  fire: "--station-fire",
  crime: "--station-police",
};

/** Read a CSS custom property from :root (client-only; returns fallback on server). */
export function readCssVar(name: string, fallback = "#6b7280"): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/** Resolved color for Leaflet markers / SVG fills keyed by incident status. */
export function incidentStatusColor(status: string): string {
  const key = normalizeKey(status);
  const varName = INCIDENT_STATUS_CSS_VARS[key];
  return varName ? readCssVar(varName) : readCssVar("--muted-foreground");
}

/** Resolved color for Leaflet markers keyed by station / category type. */
export function stationTypeColor(type?: string | null): string {
  const key = normalizeKey(type ?? "");
  const varName = STATION_TYPE_CSS_VARS[key];
  return varName ? readCssVar(varName) : readCssVar("--muted-foreground");
}

export function themeColor(token: "primary" | "info" | "success" | "warning" | "destructive"): string {
  const map = {
    primary: "--primary",
    info: "--info",
    success: "--success",
    warning: "--warning",
    destructive: "--destructive",
  } as const;
  return readCssVar(map[token]);
}
