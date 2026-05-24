"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  IconAlertHexagon,
  IconRadar,
  IconRefresh,
  IconLayoutList,
  IconMap2,
  IconChartBar,
  IconProgress,
  IconCircleCheck,
  IconAdjustmentsHorizontal,
  IconTag,
  IconUser,
  IconBuildingHospital,
  IconActivity,
  IconClockHour4,
  IconStethoscope,
  IconShield,
  IconFlame,
  IconCircleDashed,
  IconX,
  IconChevronRight,
  IconInboxOff,
  IconMapPin,
  IconFileText,
  IconVolume,
  IconNavigation,
  IconPlayerPlay,
  IconPlayerPause,
  IconLoader2,
  IconMail,
  IconHistory,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Sidebar from "@/components/layout/Sidebar";
import { incidentsAPI } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/lib/useToast";
import { useIncidentSocket } from "@/lib/useIncidentSocket";
import {
  normalizeIncidentStatus,
  canMarkFalseAlarm,
  isTerminalStatus,
  isAutoOnlyStatus,
  isUnread,
  canForwardIncident,
  shouldShowUnitTracking,
  needsUnitAssignment,
  isAwaitingClosure,
  isFieldProgressByUnit,
  getOperatorWorkflowHint,
  shouldAcknowledgeOnOpen,
} from "@/lib/incident-workflow";
import ForwardIncidentControls from "@/components/incidents/ForwardIncidentControls";
import ForwardChainTimeline from "@/components/incidents/ForwardChainTimeline";
import AssignUnitControls from "@/components/incidents/AssignUnitControls";
import UnitTrackingMap from "@/components/incidents/UnitTrackingMap";
import { formatForwardAwayBadge } from "@/lib/forward-chain";
import type { Incident, IncidentStatus, OperatorPerspective, UnitLocationPing } from "@/types";

const IncidentMap = dynamic(() => import("@/components/incidents/IncidentMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-xl bg-muted/30">
      <IconLoader2 size={24} stroke={1.5} className="animate-spin text-muted-foreground" />
    </div>
  ),
});

const InlineMap = dynamic(() => import("@/components/incidents/InlineMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-muted/30">
      <IconLoader2 size={20} stroke={1.5} className="animate-spin text-muted-foreground" />
    </div>
  ),
});

const INCIDENT_CATEGORIES = ["all", "fire", "medical", "police", "crime"] as const;
const INCIDENT_STATUSES = [
  "all",
  "pending",
  "routed",
  "dispatched",
  "en_route",
  "reached",
  "served",
  "resolved",
  "false_alarm",
] as const;

type FilterCategory = (typeof INCIDENT_CATEGORIES)[number];
type FilterStatus   = (typeof INCIDENT_STATUSES)[number];
type QueueTab = "active" | "forwarded_away";

// ── Error Boundary ────────────────────────────────────────────────────────────

class IncidentsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen overflow-hidden">
          <Sidebar role="operator" />
          <main className="flex-1 overflow-y-auto bg-background p-6">
            <div className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <IconAlertHexagon size={20} stroke={1.5} className="text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-600">Something went wrong</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  An unexpected error occurred. Please refresh the page.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <IconRefresh size={16} stroke={1.5} className="mr-1.5" />
                Reload
              </Button>
            </div>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Audio Player ──────────────────────────────────────────────────────────────

function AudioPlayer({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReady(false);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const fetchAudio = async () => {
      try {
        const token = getAccessToken();
        if (!token) {
          setError("Authentication required to play audio");
          setLoading(false);
          return;
        }

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        if (cancelled) return;

        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;

        const audio = new Audio(blobUrl);
        audio.preload = "metadata";
        const markReady = () => {
          if (cancelled) return;
          if (audio.duration && isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
          setReady(true);
          setLoading(false);
        };
        audio.addEventListener("loadedmetadata", markReady);
        audio.addEventListener("canplay", markReady, { once: true });
        audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
        audio.addEventListener("ended", () => { setIsPlaying(false); setCurrentTime(0); });
        audio.addEventListener("error", () => {
          setError("Unable to play audio file.");
          setLoading(false);
        });
        audioRef.current = audio;
      } catch {
        if (!cancelled) {
          setError("Unable to load audio. Please try again.");
          setLoading(false);
        }
      }
    };

    fetchAudio();

    return () => {
      cancelled = true;
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.src = "";
      audioRef.current = null;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    };
  }, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => setError("Playback failed. Format may not be supported."));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div className="mt-1 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
        <p className="text-xs text-destructive">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="mt-1 flex items-center gap-3 rounded-lg border border-border bg-muted/5 px-3 py-2"
        aria-busy="true"
        aria-label="Loading audio recording"
      >
        <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-1 w-full animate-pulse rounded-full bg-muted" />
          <div className="flex justify-between">
            <div className="h-2.5 w-7 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-7 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-3 rounded-lg border border-border bg-muted/5 px-3 py-2">
      <button
        onClick={togglePlay}
        disabled={!ready}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
      >
        {isPlaying ? <IconPlayerPause size={16} stroke={1.5} /> : <IconPlayerPlay size={16} stroke={1.5} className="ml-0.5" />}
      </button>
      <div className="flex-1">
        <input
          type="range" min="0" max={duration || 0} value={currentTime}
          onChange={handleSeek}
          disabled={!ready}
          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Status / Category helpers ─────────────────────────────────────────────────

function statusFilterLabel(s: FilterStatus): string {
  if (s === "all") return "All Statuses";
  return s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function StatusBadge({ status }: { status: string }) {
  const s = normalizeIncidentStatus(status);
  
  const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
    pending: { 
      bg: "bg-gray-50", 
      text: "text-gray-500", 
      border: "border-gray-200", 
      dot: "bg-gray-500",
      label: "Pending"
    },
    routed: { 
      bg: "bg-red-50", 
      text: "text-red-600", 
      border: "border-red-200", 
      dot: "bg-red-600",
      label: "Routed"
    },
    dispatched: { 
      bg: "bg-orange-50", 
      text: "text-orange-600", 
      border: "border-orange-200", 
      dot: "bg-orange-600",
      label: "Dispatched"
    },
    en_route: { 
      bg: "bg-yellow-50", 
      text: "text-yellow-700", 
      border: "border-yellow-200", 
      dot: "bg-yellow-700",
      label: "En Route"
    },
    reached: { 
      bg: "bg-purple-50", 
      text: "text-purple-600", 
      border: "border-purple-200", 
      dot: "bg-purple-600",
      label: "Reached"
    },
    served: { 
      bg: "bg-green-50", 
      text: "text-green-600", 
      border: "border-green-200", 
      dot: "bg-green-600",
      label: "Served"
    },
    resolved: { 
      bg: "bg-teal-50", 
      text: "text-teal-700", 
      border: "border-teal-200", 
      dot: "bg-teal-700",
      label: "Resolved"
    },
    false_alarm: { 
      bg: "bg-gray-50", 
      text: "text-gray-500", 
      border: "border-gray-200", 
      dot: "bg-gray-500",
      label: "False Alarm"
    },
    in_progress: { 
      bg: "bg-yellow-50", 
      text: "text-yellow-700", 
      border: "border-yellow-200", 
      dot: "bg-yellow-700",
      label: "In Progress"
    },
  };

  const config = statusConfig[s] || statusConfig.pending;
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} ${s === 'routed' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}

const CATEGORY_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  fire:    { color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200", icon: IconFlame },
  medical: { color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200", icon: IconStethoscope },
  police:  { color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200", icon: IconShield },
  crime:   { color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200", icon: IconShield },
};

function CategoryBadge({ category }: { category: string }) {
  const key = category?.toLowerCase() ?? "";
  const cfg = CATEGORY_CONFIG[key] || { 
    color: "text-gray-500", 
    bgColor: "bg-gray-50", 
    borderColor: "border-gray-200", 
    icon: IconCircleDashed
  };
  
  const Icon = cfg.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize border ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}>
      <Icon size={14} stroke={1.5} />
      {category ?? "None"}
    </span>
  );
}

function ForwardAwayBadge({ status }: { status?: string | null }) {
  const { label, variant } = formatForwardAwayBadge(status);
  const isAuto = variant === "auto";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
        isAuto
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-indigo-200 bg-indigo-50 text-indigo-700"
      }`}
    >
      <IconHistory size={14} stroke={1.5} />
      {label}
    </span>
  );
}

// ── Misc helpers ──────────────────────────────────────────────────────────────

function formatTime(raw: string) {
  try {
    return new Date(raw).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return raw; }
}

function formatTimeFull(raw: string) {
  try {
    return new Date(raw).toLocaleString(undefined, {
      weekday: "short", year: "numeric", month: "short",
      day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return raw; }
}

function latLng(incident: Incident): [number, number] | null {
  if (incident.latitude == null || incident.longitude == null) return null;
  return [Number(incident.latitude), Number(incident.longitude)];
}

// ── Stat Cards ────────────────────────────────────────────────────────────────

function StatCards({ incidents, unreadCount }: { incidents: Incident[]; unreadCount: number }) {
  const total = incidents.length;
  const active = incidents.filter(i => {
    const s = normalizeIncidentStatus(i.status);
    return s === "dispatched" || s === "en_route" || s === "reached";
  }).length;
  const closed = incidents.filter(i => {
    const s = normalizeIncidentStatus(i.status);
    return s === "resolved" || s === "served" || s === "false_alarm";
  }).length;

  const stats = [
    {
      label: "Total",
      value: total,
      icon: IconChartBar,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      borderColor: "border-blue-200",
    },
    {
      label: "Unread",
      value: unreadCount,
      icon: IconMail,
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
      borderColor: "border-indigo-200",
    },
    {
      label: "Active",
      value: active,
      icon: IconProgress,
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-700",
      borderColor: "border-yellow-200",
    },
    {
      label: "Closed",
      value: closed,
      icon: IconCircleCheck,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      borderColor: "border-green-200",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, bgColor, iconColor, borderColor }) => (
        <Card key={label} className={`border ${borderColor} shadow-sm hover:shadow-md transition-shadow`}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bgColor}`}>
              <Icon size={24} stroke={1.5} className={iconColor} />
            </div>
            <div>
              <p className="font-mono text-3xl font-bold leading-none">{value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Page Skeleton ─────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="operator" />
      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="space-y-1.5">
              <div className="h-7 w-28 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="mb-6 grid grid-cols-4 gap-3">
          {[0,1,2,3].map(i => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-6 w-8 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="mb-4 border-0 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
            <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader><div className="h-5 w-28 animate-pulse rounded bg-muted" /></CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  {[96,120,200,112,112].map((w, i) => (
                    <th key={i} className="px-4 py-3 text-left">
                      <div className="h-3 animate-pulse rounded bg-muted" style={{ width: w }} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 7 }).map((_, row) => (
                  <tr key={row} className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3.5"><div className="h-5 w-16 animate-pulse rounded-full bg-muted" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-28 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 animate-pulse rounded bg-muted" style={{ width: `${120 + (row%3)*40}px` }} /></td>
                    <td className="px-4 py-3.5"><div className="h-5 w-20 animate-pulse rounded-full bg-muted" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// ── Error / Empty states ──────────────────────────────────────────────────────

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border p-5" style={{
      borderColor: "#ef444433", backgroundColor: "#ef444408",
    }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: "#ef444415", color: "#ef4444" }}>
        <IconAlertHexagon size={20} stroke={1.5} />
      </div>
      <div className="flex-1">
        <p className="font-semibold" style={{ color: "#ef4444" }}>Failed to load incidents</p>
        <p className="mt-0.5 text-sm text-muted-foreground">Could not reach the server. Check your connection and try again.</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 gap-1.5">
        <IconRefresh size={16} stroke={1.5} />
        Retry
      </Button>
    </div>
  );
}

function EmptyState({ isFiltered, queueTab }: { isFiltered: boolean; queueTab?: QueueTab }) {
  const isForwardedAway = queueTab === "forwarded_away";
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: isFiltered || isForwardedAway ? "var(--muted)" : "rgb(220 252 231)",
        }}>
        {isFiltered
          ? <IconAdjustmentsHorizontal size={36} stroke={1.5} className="text-muted-foreground" />
          : isForwardedAway
            ? <IconHistory size={36} stroke={1.5} className="text-muted-foreground" />
            : <IconCircleCheck size={36} stroke={1.5} className="text-green-600" />}
      </div>
      <p className="text-xl font-bold mb-2">
        {isFiltered
          ? "No matching incidents"
          : isForwardedAway
            ? "No forwarded incidents"
            : "All clear"}
      </p>
      <p className="text-sm text-muted-foreground max-w-md">
        {isFiltered
          ? "Try adjusting or clearing your filters"
          : isForwardedAway
            ? "Incidents you forward away will appear here for audit"
            : "No incidents assigned to your station"}
      </p>
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailField({ icon: Icon, label, children }: {
  icon: React.ElementType; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: "color-mix(in oklch, var(--primary) 10%, transparent)", color: "var(--primary)" }}>
        <Icon size={16} stroke={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

function IncidentDetailPanel({ incident, detail, loadingDetail, perspective, onClose, onStatusUpdate, onForwardedAway, onChainUpdated, unitLiveLocation }: {
  incident: Incident;
  detail: Incident | null;
  loadingDetail: boolean;
  perspective: OperatorPerspective;
  onClose: () => void;
  onStatusUpdate: (updated: Incident) => void;
  onForwardedAway: (incidentId: string) => void;
  onChainUpdated?: (chain: Incident["forward_chain"]) => void;
  unitLiveLocation?: UnitLocationPing | null;
}) {
  const data = detail ?? incident;
  const [updating, setUpdating] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const isAuditView = perspective === "forwarded_away";

  const { success, error: toastError } = useToast();

  const cfg = CATEGORY_CONFIG[data.category?.toLowerCase()] ?? {
    color: "var(--primary)",
    bgColor: "",
    borderColor: "",
    icon: IconAlertHexagon,
  };
  const coords = latLng(data);
  const showFalseAlarm = !isAuditView && canMarkFalseAlarm(data.status);
  const autoOnly = isAutoOnlyStatus(data.status);
  const terminal = isTerminalStatus(data.status);
  const showForward = !isAuditView && canForwardIncident(data);
  const workflowHint = getOperatorWorkflowHint(data);
  const awaitingClosure = isAwaitingClosure(data.status);
  const showTracking = !isAuditView && shouldShowUnitTracking(data);
  const chain =
    data.forward_chain ?? data.forward_away_info?.forward_chain ?? null;

  async function patchStatus(status: IncidentStatus) {
    setUpdating(true);
    const res = await incidentsAPI.updateStatus(data.id, status);
    setUpdating(false);
    if (res) {
      onStatusUpdate(res);
      success("Status Updated", `Moved to "${status.replace(/_/g, " ")}"`);
    } else {
      toastError("Update Failed", "Could not update status. Try again.");
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Panel header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-base"
            style={{ backgroundColor: `${cfg.color}18`, border: `1px solid ${cfg.color}33` }}>
            <cfg.icon size={16} stroke={1.5} style={{ color: cfg.color }} />
          </div>
          <div>
            <p className="text-[10px] font-mono text-muted-foreground">#{String(data.id).slice(0, 8).toUpperCase()}</p>
            <p className="text-sm font-bold capitalize">{data.category ?? "Unknown"} Incident</p>
          </div>
        </div>
        <button onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <IconX size={16} stroke={1.5} />
        </button>
      </div>

      {/* Status strip */}
      <div className="shrink-0 flex items-center gap-2.5 px-5 py-2.5 border-b"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}>
        {isAuditView ? (
          <ForwardAwayBadge status={data.operator_display_status} />
        ) : (
          <StatusBadge status={data.status} />
        )}
        {!isAuditView && normalizeIncidentStatus(data.status) === "routed" && (
          <span className="text-xs text-red-500 font-medium">Requires immediate attention</span>
        )}
      </div>

      {isAuditView && data.operator_display_message && (
        <div className="shrink-0 border-b bg-indigo-50/60 px-5 py-3 text-sm text-indigo-900"
          style={{ borderColor: "var(--border)" }}>
          {data.operator_display_message}
        </div>
      )}

      {isAuditView && data.forward_away_info?.current_assigned_station_name && (
        <div className="shrink-0 border-b px-5 py-2.5 text-xs text-muted-foreground"
          style={{ borderColor: "var(--border)" }}>
          Currently at{" "}
          <span className="font-semibold text-foreground">
            {data.forward_away_info.current_assigned_station_name}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loadingDetail ? (
          <div className="space-y-4 p-5">
            {[0.75, 0.5, 1, 0.6].map((w, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${w * 100}%` }} />
            ))}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>

            <div className="px-5 py-4">
              <DetailField icon={IconTag} label="Emergency Category">
                <div className="flex items-center gap-2 flex-wrap">
                  <CategoryBadge category={data.category} />
                  {data.confidence != null && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {Math.round(data.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
              </DetailField>
            </div>

            <div className="px-5 py-4">
              <DetailField icon={IconClockHour4} label="Time Reported">
                <span className="font-mono text-sm">{formatTimeFull(data.created_at)}</span>
              </DetailField>
            </div>

            <div className="px-5 py-4">
              <DetailField icon={IconUser} label="Reported By">
                <p className="font-semibold">{data.reporter?.full_name ?? "Unknown"}</p>
                {data.reporter?.phone && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{data.reporter.phone}</p>
                )}
              </DetailField>
            </div>

            <div className="px-5 py-4">
              <DetailField icon={IconMapPin} label="Location">
                {coords ? (
                  <div className="space-y-2">
                    <p className="font-mono text-xs text-muted-foreground">
                      {coords[0].toFixed(6)}, {coords[1].toFixed(6)}
                    </p>
                    {data.address_line && <p className="text-sm">{data.address_line}</p>}
                    <button onClick={() => setShowMap(v => !v)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all"
                      style={{
                        backgroundColor: showMap ? `${cfg.color}12` : "var(--muted)",
                        color: showMap ? cfg.color : "var(--muted-foreground)",
                        border: `1px solid ${showMap ? `${cfg.color}30` : "var(--border)"}`,
                      }}>
                      <span className="flex items-center gap-1.5">
                        <IconMapPin size={14} stroke={1.5} />
                        {showMap ? "Hide map" : "View on map"}
                      </span>
                      <IconChevronRight size={14} stroke={1.5} className={`transition-transform duration-200 ${showMap ? "rotate-90" : ""}`} />
                    </button>
                    {showMap && (
                      <div className="overflow-hidden rounded-xl border" style={{ height: 220, borderColor: "var(--border)" }}>
                        <InlineMap lat={coords[0]} lng={coords[1]} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground">No coordinates available</p>
                )}
              </DetailField>
            </div>

            {!isAuditView && (
              <div className="px-5 py-4">
                <AssignUnitControls
                  incident={data}
                  disabled={updating}
                  onUpdated={onStatusUpdate}
                />
              </div>
            )}

            {showTracking && coords && (
              <div className="px-5 py-4">
                <DetailField icon={IconNavigation} label="Live unit tracking">
                  <UnitTrackingMap
                    incidentId={data.id}
                    incidentLat={coords[0]}
                    incidentLng={coords[1]}
                    liveLocation={unitLiveLocation}
                    enabled={showTracking}
                  />
                </DetailField>
              </div>
            )}

            {data.assigned_station && (
              <div className="px-5 py-4">
                <DetailField icon={IconBuildingHospital} label="Assigned Station">
                  <p className="font-semibold">{data.assigned_station.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                    {data.assigned_station.type_display ?? data.assigned_station.type} · {data.assigned_station.city}
                  </p>
                  {data.distance_to_station_km != null && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      <IconNavigation size={14} stroke={1.5} />
                      {data.distance_to_station_km.toFixed(1)} km away
                    </span>
                  )}
                  {coords && data.assigned_station.latitude && data.assigned_station.longitude && (
                    <div className="mt-3 space-y-2">
                      <div className="rounded-lg border px-3 py-2 text-xs"
                        style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)" }}>
                        <p className="font-semibold mb-1 text-muted-foreground">Incident Location:</p>
                        <p className="font-mono">{coords[0].toFixed(6)}, {coords[1].toFixed(6)}</p>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/${Number(data.assigned_station.latitude).toFixed(6)},${Number(data.assigned_station.longitude).toFixed(6)}/${coords[0].toFixed(6)},${coords[1].toFixed(6)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:shadow-md"
                        style={{ backgroundColor: cfg.color, color: "white" }}
                      >
                        <div className="flex items-center gap-2">
                          <IconNavigation size={16} stroke={1.5} />
                          <div className="text-left">
                            <div>Get Directions to Incident</div>
                            <div className="text-xs font-normal opacity-90">From {data.assigned_station.name}</div>
                          </div>
                        </div>
                        <IconChevronRight size={16} stroke={1.5} />
                      </a>
                      <button
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/${Number(data.assigned_station!.latitude).toFixed(6)},${Number(data.assigned_station!.longitude).toFixed(6)}/${coords[0].toFixed(6)},${coords[1].toFixed(6)}`;
                          navigator.clipboard.writeText(url);
                          success("Copied", "Directions link copied to clipboard");
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
                        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Copy Directions Link
                      </button>
                    </div>
                  )}
                </DetailField>
              </div>
            )}

            {data.audio_url && (
              <div className="px-5 py-4">
                <DetailField icon={IconVolume} label="Audio Recording">
                  <AudioPlayer url={data.audio_url} />
                </DetailField>
              </div>
            )}

            {chain && chain.length > 0 && (
              <div className="px-5 py-4">
                <ForwardChainTimeline chain={chain} />
              </div>
            )}

            <div className="px-5 py-4">
              <DetailField icon={IconFileText} label="Transcription">
                {data.amharic_text || data.english_text ? (
                  <div className="mt-1 space-y-2">
                    {data.amharic_text && (
                      <div className="rounded-xl p-3 text-sm leading-relaxed"
                        style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">Amharic</p>
                        {data.amharic_text}
                      </div>
                    )}
                    {data.english_text && (
                      <div className="rounded-xl border p-3 text-sm leading-relaxed"
                        style={{ borderColor: "var(--border)" }}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">English</p>
                        <span dangerouslySetInnerHTML={{ __html: data.english_text }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-sm italic text-muted-foreground">No transcription available</p>
                )}
              </DetailField>
            </div>

          </div>
        )}
      </div>

      {/* Footer actions */}
      {!loadingDetail && (
        <div className="shrink-0 space-y-2 border-t p-4" style={{ borderColor: "var(--border)" }}>
          {isAuditView ? (
            <div className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground"
              style={{ backgroundColor: "var(--muted)" }}>
              <IconHistory size={16} stroke={1.5} />
              Read-only audit view — no actions available
            </div>
          ) : (
            <>
          {autoOnly && !showForward && (
            <div className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground"
              style={{ backgroundColor: "var(--muted)" }}>
              <IconRadar size={16} stroke={1.5} />
              {workflowHint ?? "System is processing this incident."}
            </div>
          )}
          {terminal && (
            <div className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium"
              style={{ backgroundColor: "color-mix(in oklch, var(--chart-2) 10%, transparent)", color: "var(--chart-2)" }}>
              <IconCircleCheck size={16} stroke={1.5} />
              No further actions
            </div>
          )}
          {awaitingClosure && !terminal && (
            <div className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground"
              style={{ backgroundColor: "var(--muted)" }}>
              <IconClockHour4 size={16} stroke={1.5} />
              {workflowHint ?? "Awaiting citizen feedback or unit closure."}
            </div>
          )}
          {!autoOnly && !terminal && !awaitingClosure && (
            <>
              {workflowHint && (
                <div
                  className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground"
                  style={{ backgroundColor: "var(--muted)" }}
                >
                  {needsUnitAssignment(data) ? (
                    <IconUser size={16} stroke={1.5} />
                  ) : isFieldProgressByUnit(data) ? (
                    <IconActivity size={16} stroke={1.5} />
                  ) : (
                    <IconRadar size={16} stroke={1.5} />
                  )}
                  {workflowHint}
                </div>
              )}
              {showFalseAlarm && (
                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-xl"
                  disabled={updating}
                  onClick={() => patchStatus("false_alarm")}
                >
                  Mark False Alarm
                </Button>
              )}
            </>
          )}
          {autoOnly && showForward && workflowHint && (
            <div
              className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground"
              style={{ backgroundColor: "var(--muted)" }}
            >
              <IconRadar size={16} stroke={1.5} />
              {workflowHint}
            </div>
          )}
          {showForward && !terminal && !awaitingClosure && (
            <ForwardIncidentControls
              incident={data}
              disabled={updating}
              onForwardedAway={onForwardedAway}
              onChainUpdated={(updatedChain) => {
                onChainUpdated?.(updatedChain);
                onStatusUpdate({ ...data, forward_chain: updatedChain });
              }}
            />
          )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function IncidentsPageInner() {
  const { checking } = useAuth("operator");

  const [selected, setSelected] = useState<Incident | null>(null);
  const [detail, setDetail] = useState<Incident | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const [queueTab, setQueueTab] = useState<QueueTab>("active");
  const [forwardedAwayIncidents, setForwardedAwayIncidents] = useState<Incident[]>([]);
  const [loadingForwardedAway, setLoadingForwardedAway] = useState(false);
  const [forwardedAwayError, setForwardedAwayError] = useState(false);
  const queueTabRef = useRef<QueueTab>("active");
  const [unitLiveByIncident, setUnitLiveByIncident] = useState<
    Record<string, UnitLocationPing>
  >({});

  const fetchForwardedAway = useCallback(async () => {
    setLoadingForwardedAway(true);
    setForwardedAwayError(false);
    const res = await incidentsAPI.list({ scope: "forwarded_away" });
    if (res === null) {
      setForwardedAwayError(true);
    } else {
      setForwardedAwayIncidents(res.data ?? []);
    }
    setLoadingForwardedAway(false);
  }, []);

  useEffect(() => {
    queueTabRef.current = queueTab;
  }, [queueTab]);

  useEffect(() => {
    if (queueTab === "forwarded_away") {
      fetchForwardedAway();
    }
  }, [queueTab, fetchForwardedAway]);

  const {
    incidents,
    setIncidents,
    unreadCount,
    setUnreadCount,
    loading,
    fetchError,
    isConnected,
    refresh,
  } = useIncidentSocket({
    enabled: !checking,
    onIncidentUpdated(updated) {
      setSelected(prev => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
      setDetail(prev => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
    },
    onIncidentForwardedAway(id) {
      setSelected((prev) => (prev?.id === id ? null : prev));
      setDetail((prev) => (prev?.id === id ? null : prev));
      setUnitLiveByIncident((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (queueTabRef.current === "forwarded_away") {
        fetchForwardedAway();
      }
    },
    onUnitLocationUpdate(incidentId, location) {
      setUnitLiveByIncident((prev) => ({
        ...prev,
        [incidentId]: location,
      }));
    },
  });

  const handleForwardedAway = useCallback(
    (incidentId: string) => {
      setIncidents((prev) => prev.filter((i) => i.id !== incidentId));
      setSelected((prev) => (prev?.id === incidentId ? null : prev));
      setDetail((prev) => (prev?.id === incidentId ? null : prev));
      fetchForwardedAway();
    },
    [setIncidents, fetchForwardedAway]
  );

  const applyIncidentUpdate = useCallback((updated: Incident) => {
    setIncidents((prev) =>
      prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
    );
    setSelected((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
    setDetail((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
  }, [setIncidents]);

  function openDetail(incident: Incident, perspective: OperatorPerspective = queueTab) {
    const isActiveQueue = perspective === "active";
    const wasUnread = isActiveQueue && isUnread(incident);
    const shouldAck = isActiveQueue && shouldAcknowledgeOnOpen(incident);
    setSelected({ ...incident, operator_perspective: perspective });
    setDetail(null);
    setLoadingDetail(true);

    (async () => {
      const [detailRes, readRes] = await Promise.all([
        incidentsAPI.get(incident.id),
        shouldAck ? incidentsAPI.markRead(incident.id) : Promise.resolve(null),
      ]);

      const merged = readRes ?? detailRes;
      if (merged) {
        const withPerspective = { ...merged, operator_perspective: perspective };
        if (isActiveQueue) {
          applyIncidentUpdate(withPerspective);
        } else {
          setForwardedAwayIncidents((prev) =>
            prev.map((i) => (i.id === withPerspective.id ? { ...i, ...withPerspective } : i))
          );
          setSelected(withPerspective);
        }
        if (wasUnread) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        setDetail(withPerspective);
      } else if (detailRes) {
        const withPerspective = { ...detailRes, operator_perspective: perspective };
        if (isActiveQueue) {
          applyIncidentUpdate(withPerspective);
        }
        setDetail(withPerspective);
      }

      setLoadingDetail(false);
    })();
  }

  function closeDetail() {
    setSelected(null);
    setDetail(null);
  }

  async function handleMarkRead(e: React.MouseEvent, incident: Incident) {
    e.stopPropagation();
    if (incident.is_read) return;
    setMarkingReadId(incident.id);
    const wasUnread = isUnread(incident);
    const res = await incidentsAPI.markRead(incident.id);
    setMarkingReadId(null);
    if (res) {
      applyIncidentUpdate(res);
      if (wasUnread) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    }
  }

  function handleStatusUpdate(updated: Incident) {
    applyIncidentUpdate(updated);
  }

  const filteredActive = useMemo(() => {
    return incidents
      .filter(i => categoryFilter === "all" || i.category?.toLowerCase() === categoryFilter)
      .filter(i => statusFilter === "all" || normalizeIncidentStatus(i.status) === statusFilter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [incidents, categoryFilter, statusFilter]);

  const filteredForwardedAway = useMemo(() => {
    return forwardedAwayIncidents
      .filter(i => categoryFilter === "all" || i.category?.toLowerCase() === categoryFilter)
      .filter(i => statusFilter === "all" || normalizeIncidentStatus(i.status) === statusFilter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [forwardedAwayIncidents, categoryFilter, statusFilter]);

  const filtered = queueTab === "active" ? filteredActive : filteredForwardedAway;
  const isFiltered = categoryFilter !== "all" || statusFilter !== "all";

  function handleRefresh() {
    if (queueTab === "active") {
      refresh();
    } else {
      fetchForwardedAway();
    }
  }

  if (checking) return null;
  if (loading && queueTab === "active") return <PageSkeleton />;

  if (fetchError) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar role="operator" />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mb-6 flex items-center gap-3">
            <IconAlertHexagon size={28} stroke={1.5} className="text-primary" />
            <h1 className="text-2xl font-bold">Incidents</h1>
          </div>
          <ErrorBanner onRetry={refresh} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="operator" />
      <main className="flex-1 overflow-y-auto bg-background p-6">

        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 border border-red-200">
              <IconAlertHexagon size={24} stroke={1.5} className="text-red-600 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-muted-foreground font-mono">
                  {incidents.length} total
                  {unreadCount > 0 && (
                    <span className="ml-2 font-semibold text-indigo-600">
                      · {unreadCount} unread
                    </span>
                  )}
                </p>
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-600 animate-pulse' : 'bg-amber-600'}`} />
                  <IconRadar size={14} stroke={1.5} className={isConnected ? 'text-green-600' : 'text-amber-600'} />
                  <span className={`text-xs font-medium ${isConnected ? 'text-green-600' : 'text-amber-600'}`}>
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2 rounded-lg">
              <IconRefresh size={16} stroke={1.5} />
              Refresh
            </Button>
            <div className="flex items-center rounded-lg border bg-muted/50 p-1">
              {(["list", "map"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                    view === v 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  {v === "list" ? <IconLayoutList size={16} stroke={1.5} /> : <IconMap2 size={16} stroke={1.5} />}
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {queueTab === "active" && (
          <StatCards incidents={incidents} unreadCount={unreadCount} />
        )}

        {/* Map view — active queue only */}
        {view === "map" && queueTab === "active" && (
          <div className="overflow-hidden rounded-2xl border shadow-sm"
            style={{ height: "calc(100vh - 260px)", borderColor: "var(--border)" }}>
            <IncidentMap incidents={filtered} onSelect={openDetail} selectedId={selected?.id} />
          </div>
        )}

        {/* List view */}
        {view === "list" && (
          <div className="grid grid-cols-12 gap-4">
            <div className={selected ? "col-span-7" : "col-span-12"}>

              {/* Queue tabs */}
              <Card className="mb-4 border shadow-sm rounded-xl">
                <CardContent className="flex flex-wrap items-center gap-2 p-3">
                  {([
                    { id: "active" as const, label: "Active", count: incidents.length },
                    {
                      id: "forwarded_away" as const,
                      label: "Forwarded away",
                      count: forwardedAwayIncidents.length,
                    },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setQueueTab(tab.id);
                        setSelected(null);
                        setDetail(null);
                        if (tab.id === "active") setView("list");
                      }}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                        queueTab === tab.id
                          ? "bg-background text-foreground shadow-sm border"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                    >
                      {tab.label}
                      <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px]">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {forwardedAwayError && queueTab === "forwarded_away" && (
                <div className="mb-4">
                  <ErrorBanner onRetry={fetchForwardedAway} />
                </div>
              )}

              {/* Filter bar */}
              <Card className="mb-4 border shadow-sm rounded-xl">
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <IconAdjustmentsHorizontal size={16} stroke={1.5} className="text-muted-foreground" />
                  </div>
                  <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v as FilterCategory)}>
                    <SelectTrigger className="h-9 w-44 rounded-lg">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      {INCIDENT_CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>
                          {c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={v => setStatusFilter(v as FilterStatus)}>
                    <SelectTrigger className="h-9 w-44 rounded-lg">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {INCIDENT_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>
                          {statusFilterLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isFiltered && (
                    <button onClick={() => { setCategoryFilter("all"); setStatusFilter("all"); }}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      Clear filters
                    </button>
                  )}
                  <span className="ml-auto text-sm font-mono text-muted-foreground">
                    {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                  </span>
                </CardContent>
              </Card>

              {/* Incident table */}
              <Card className="border shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="px-6 py-4 border-b bg-muted/30">
                  <CardTitle className="text-lg font-bold">Incident List</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingForwardedAway && queueTab === "forwarded_away" ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground">
                      <IconLoader2 size={24} stroke={1.5} className="animate-spin" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <EmptyState isFiltered={isFiltered} queueTab={queueTab} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs font-bold uppercase tracking-wider">Category</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-wider">Reporter</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-wider">
                            {queueTab === "forwarded_away" ? "Destination" : "Station"}
                          </TableHead>
                          {queueTab === "active" && (
                            <TableHead className="text-xs font-bold uppercase tracking-wider">Unit</TableHead>
                          )}
                          <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-wider">Time</TableHead>
                          {queueTab === "active" && (
                            <TableHead className="w-12 text-xs font-bold uppercase tracking-wider" />
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(incident => {
                          const isForwardedAwayTab = queueTab === "forwarded_away";
                          const isRouted = !isForwardedAwayTab && normalizeIncidentStatus(incident.status) === "routed";
                          const unread = !isForwardedAwayTab && isUnread(incident);
                          const isSelected = selected?.id === incident.id;
                          const awaySubtitle =
                            incident.operator_display_message ??
                            incident.forward_away_info?.to_station_name ??
                            incident.forward_away_info?.current_assigned_station_name;
                          return (
                            <TableRow
                              key={incident.id}
                              onClick={() => openDetail(incident, queueTab)}
                              className={`cursor-pointer transition-all hover:bg-muted/50 ${
                                isSelected
                                  ? "bg-muted"
                                  : isForwardedAwayTab
                                    ? "opacity-90"
                                    : isRouted
                                      ? "bg-red-50/30"
                                      : unread
                                        ? "bg-indigo-50/40"
                                        : ""
                              } ${unread ? "font-semibold" : ""}`}
                              style={{
                                borderLeft: isRouted
                                  ? "4px solid rgb(220, 38, 38)"
                                  : unread
                                    ? "4px solid rgb(79, 70, 229)"
                                    : "4px solid transparent",
                              }}>
                              <TableCell className="py-4 pl-4">
                                <div className="flex items-center gap-2">
                                  {isRouted && <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />}
                                  {unread && !isRouted && (
                                    <span className="h-2 w-2 rounded-full bg-indigo-600" title="Unread" />
                                  )}
                                  <CategoryBadge category={incident.category} />
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <p className="text-sm font-semibold">{incident.reporter?.full_name ?? "—"}</p>
                                {incident.reporter?.phone && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{incident.reporter.phone}</p>
                                )}
                              </TableCell>
                              <TableCell className="py-4 text-sm text-muted-foreground">
                                {isForwardedAwayTab ? (
                                  <div>
                                    <p>{awaySubtitle ?? "—"}</p>
                                  </div>
                                ) : (
                                  incident.assigned_station?.name ?? "—"
                                )}
                              </TableCell>
                              {queueTab === "active" && (
                                <TableCell className="py-4 text-sm text-muted-foreground">
                                  {incident.assigned_unit?.name ?? "—"}
                                </TableCell>
                              )}
                              <TableCell className="py-4">
                                {isForwardedAwayTab ? (
                                  <ForwardAwayBadge status={incident.operator_display_status} />
                                ) : (
                                  <StatusBadge status={incident.status} />
                                )}
                              </TableCell>
                              <TableCell className="py-4 font-mono text-sm text-muted-foreground">
                                {formatTime(incident.created_at)}
                              </TableCell>
                              {queueTab === "active" && (
                                <TableCell className="py-4 pr-4">
                                  {!incident.is_read && (
                                    <button
                                      type="button"
                                      title="Mark as read"
                                      disabled={markingReadId === incident.id}
                                      onClick={(e) => handleMarkRead(e, incident)}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-50"
                                    >
                                      {markingReadId === incident.id ? (
                                        <IconLoader2 size={16} stroke={1.5} className="animate-spin" />
                                      ) : (
                                        <IconMail size={16} stroke={1.5} />
                                      )}
                                    </button>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Detail panel */}
            {selected && (
              <div className="col-span-5">
                <Card className="border-0 shadow-sm rounded-xl overflow-hidden sticky top-0"
                  style={{ maxHeight: "calc(100vh - 180px)" }}>
                  <IncidentDetailPanel
                    incident={selected}
                    detail={detail}
                    loadingDetail={loadingDetail}
                    perspective={queueTab}
                    onClose={closeDetail}
                    onStatusUpdate={handleStatusUpdate}
                    unitLiveLocation={
                      selected ? unitLiveByIncident[selected.id] ?? null : null
                    }
                    onForwardedAway={handleForwardedAway}
                  />
                </Card>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

export default function IncidentsPage() {
  return (
    <IncidentsErrorBoundary>
      <IncidentsPageInner />
    </IncidentsErrorBoundary>
  );
}
