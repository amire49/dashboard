"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  AlertOctagon,
  Radar,
  RefreshCw,
  LayoutList,
  Map,
  BarChart3,
  Loader,
  CircleCheck,
  SlidersHorizontal,
  Tag,
  User,
  Hospital,
  Activity,
  Clock,
  X,
  ChevronRight,
  MapPin,
  FileText,
  Volume2,
  Navigation,
  Play,
  Pause,
  Loader2,
  Mail,
  History,
  Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import EmptyState from "@/components/dashboard/EmptyState";
import FilterBar from "@/components/dashboard/FilterBar";
import StatusBadge from "@/components/incidents/StatusBadge";
import CategoryBadge from "@/components/incidents/CategoryBadge";
import { statusFilterLabel, categoryStyle } from "@/lib/status-styles";
import { cn } from "@/lib/utils";
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
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

const InlineMap = dynamic(() => import("@/components/incidents/InlineMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-muted/30">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
        <AppShell role="operator">
          <div className="flex items-center gap-4 rounded-xl border border-destructive/25 bg-destructive/5 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <AlertOctagon className="h-5 w-5 text-destructive" strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-destructive">Something went wrong</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                An unexpected error occurred. Please refresh the page.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Reload
            </Button>
          </div>
        </AppShell>
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
        {isPlaying ? <Pause className="h-4 w-4" strokeWidth={1.75} /> : <Play className="h-4 w-4 ml-0.5" strokeWidth={1.75} />}
      </button>
      <div className="flex-1">
        <input
          type="range" min="0" max={duration || 0} value={currentTime}
          onChange={handleSeek}
          disabled={!ready}
          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
        />
        <div className="text-data mt-1 flex justify-between text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Forward away badge ────────────────────────────────────────────────────────

function ForwardAwayBadge({ status }: { status?: string | null }) {
  const { label, variant } = formatForwardAwayBadge(status);
  const isAuto = variant === "auto";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        isAuto
          ? "border-info/30 bg-info-muted text-info"
          : "border-primary/30 bg-primary/10 text-primary"
      )}
    >
      <History className="h-3.5 w-3.5" strokeWidth={1.75} />
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

function IncidentStatGrid({ incidents, unreadCount }: { incidents: Incident[]; unreadCount: number }) {
  const total = incidents.length;
  const active = incidents.filter(i => {
    const s = normalizeIncidentStatus(i.status);
    return s === "dispatched" || s === "en_route" || s === "reached";
  }).length;
  const closed = incidents.filter(i => {
    const s = normalizeIncidentStatus(i.status);
    return s === "resolved" || s === "served" || s === "false_alarm";
  }).length;

  return (
    <div className="mb-6 grid grid-cols-4 gap-4">
      <StatCard label="Total" value={total} icon={BarChart3} variant="info" />
      <StatCard label="Unread" value={unreadCount} icon={Mail} variant="primary" />
      <StatCard label="Active" value={active} icon={Loader} variant="warning" />
      <StatCard label="Closed" value={closed} icon={CircleCheck} variant="success" />
    </div>
  );
}

// ── Page Skeleton ─────────────────────────────────────────────────────────────

function PageSkeleton() {
  const headerWidths = ["w-24", "w-30", "w-50", "w-28", "w-28"];
  const rowWidths = ["w-[120px]", "w-[160px]", "w-[200px]"];

  return (
    <AppShell role="operator">
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
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
                <tr className="border-b border-border">
                  {headerWidths.map((width, i) => (
                    <th key={i} className="px-4 py-3 text-left">
                      <div className={cn("h-3 animate-pulse rounded bg-muted", width)} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 7 }).map((_, row) => (
                  <tr key={row} className="border-b border-border">
                    <td className="px-4 py-3.5"><div className="h-5 w-16 animate-pulse rounded-full bg-muted" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-28 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3.5"><div className={cn("h-4 animate-pulse rounded bg-muted", rowWidths[row % rowWidths.length])} /></td>
                    <td className="px-4 py-3.5"><div className="h-5 w-20 animate-pulse rounded-full bg-muted" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
    </AppShell>
  );
}

// ── Error / Empty states ──────────────────────────────────────────────────────

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-destructive/25 bg-destructive/5 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
        <AlertOctagon className="h-5 w-5 text-destructive" strokeWidth={1.75} />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-destructive">Failed to load incidents</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Could not reach the server. Check your connection and try again.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 gap-1.5">
        <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
        Retry
      </Button>
    </div>
  );
}

function IncidentListEmpty({ isFiltered, queueTab }: { isFiltered: boolean; queueTab?: QueueTab }) {
  const isForwardedAway = queueTab === "forwarded_away";

  if (isFiltered) {
    return (
      <EmptyState
        icon={SlidersHorizontal}
        title="No matching incidents"
        description="Try adjusting or clearing your filters"
      />
    );
  }

  if (isForwardedAway) {
    return (
      <EmptyState
        icon={History}
        title="No forwarded incidents"
        description="Incidents you forward away will appear here for audit"
      />
    );
  }

  return (
    <EmptyState
      icon={CircleCheck}
      title="All clear"
      description="No incidents assigned to your station"
    />
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailField({ icon: Icon, label, children }: {
  icon: React.ElementType; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-label mb-1">{label}</p>
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

  const cfg = categoryStyle(data.category);
  const CategoryIcon = cfg.icon;
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
      <div className="shrink-0 flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border",
              cfg.bg,
              cfg.border
            )}
          >
            <CategoryIcon className={cn("h-4 w-4", cfg.text)} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-data text-muted-foreground">#{String(data.id).slice(0, 8).toUpperCase()}</p>
            <p className="text-sm font-bold capitalize">{data.category ?? "Unknown"} Incident</p>
          </div>
        </div>
        <button onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Status strip */}
      <div className="shrink-0 flex items-center gap-2.5 border-b border-border bg-muted px-5 py-2.5">
        {isAuditView ? (
          <ForwardAwayBadge status={data.operator_display_status} />
        ) : (
          <StatusBadge status={data.status} />
        )}
        {!isAuditView && normalizeIncidentStatus(data.status) === "routed" && (
          <span className="text-xs font-medium text-status-routed">Requires immediate attention</span>
        )}
      </div>

      {isAuditView && data.operator_display_message && (
        <div className="shrink-0 border-b border-border bg-info-muted px-5 py-3 text-sm text-info">
          {data.operator_display_message}
        </div>
      )}

      {isAuditView && data.forward_away_info?.current_assigned_station_name && (
        <div className="shrink-0 border-b border-border px-5 py-2.5 text-xs text-muted-foreground">
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
            {["w-3/4", "w-1/2", "w-full", "w-3/5"].map((width, i) => (
              <div key={i} className={cn("h-4 animate-pulse rounded bg-muted", width)} />
            ))}
          </div>
        ) : (
          <div className="divide-y border-border">

            <div className="px-5 py-4">
              <DetailField icon={Tag} label="Emergency Category">
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
              <DetailField icon={Clock} label="Time Reported">
                <span className="font-mono text-sm">{formatTimeFull(data.created_at)}</span>
              </DetailField>
            </div>

            <div className="px-5 py-4">
              <DetailField icon={User} label="Reported By">
                <p className="font-semibold">{data.reporter?.full_name ?? "Unknown"}</p>
                {data.reporter?.phone && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{data.reporter.phone}</p>
                )}
              </DetailField>
            </div>

            <div className="px-5 py-4">
              <DetailField icon={MapPin} label="Location">
                {coords ? (
                  <div className="space-y-2">
                    <p className="font-mono text-xs text-muted-foreground">
                      {coords[0].toFixed(6)}, {coords[1].toFixed(6)}
                    </p>
                    {data.address_line && <p className="text-sm">{data.address_line}</p>}
                    <button
                      onClick={() => setShowMap(v => !v)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                        showMap
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {showMap ? "Hide map" : "View on map"}
                      </span>
                      <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", showMap && "rotate-90")} strokeWidth={1.75} />
                    </button>
                    {showMap && (
                      <div className="overflow-hidden rounded-xl border border-border" style={{ height: 220 }}>
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
                <DetailField icon={Navigation} label="Live unit tracking">
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
                <DetailField icon={Hospital} label="Assigned Station">
                  <p className="font-semibold">{data.assigned_station.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                    {data.assigned_station.type_display ?? data.assigned_station.type} · {data.assigned_station.city}
                  </p>
                  {data.distance_to_station_km != null && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      <Navigation className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {data.distance_to_station_km.toFixed(1)} km away
                    </span>
                  )}
                  {coords && data.assigned_station.latitude && data.assigned_station.longitude && (
                    <div className="mt-3 space-y-2">
                      <div className="rounded-lg border border-border bg-muted px-3 py-2 text-xs">
                        <p className="font-semibold mb-1 text-muted-foreground">Incident Location:</p>
                        <p className="font-mono">{coords[0].toFixed(6)}, {coords[1].toFixed(6)}</p>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/${Number(data.assigned_station.latitude).toFixed(6)},${Number(data.assigned_station.longitude).toFixed(6)}/${coords[0].toFixed(6)},${coords[1].toFixed(6)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md"
                      >
                        <div className="flex items-center gap-2">
                          <Navigation className="h-4 w-4" strokeWidth={1.75} />
                          <div className="text-left">
                            <div>Get Directions to Incident</div>
                            <div className="text-xs font-normal opacity-90">From {data.assigned_station.name}</div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                      </a>
                      <button
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/${Number(data.assigned_station!.latitude).toFixed(6)},${Number(data.assigned_station!.longitude).toFixed(6)}/${coords[0].toFixed(6)},${coords[1].toFixed(6)}`;
                          navigator.clipboard.writeText(url);
                          success("Copied", "Directions link copied to clipboard");
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Copy Directions Link
                      </button>
                    </div>
                  )}
                </DetailField>
              </div>
            )}

            {data.audio_url && (
              <div className="px-5 py-4">
                <DetailField icon={Volume2} label="Audio Recording">
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
              <DetailField icon={FileText} label="Transcription">
                {data.amharic_text || data.english_text ? (
                  <div className="mt-1 space-y-2">
                    {data.amharic_text && (
                      <div className="rounded-xl bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
                        <p className="text-label mb-1 opacity-60">Amharic</p>
                        {data.amharic_text}
                      </div>
                    )}
                    {data.english_text && (
                      <div className="rounded-xl border border-border p-3 text-sm leading-relaxed">
                        <p className="text-label mb-1">English</p>
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
        <div className="shrink-0 space-y-2 border-t border-border p-4">
          {isAuditView ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs font-medium text-muted-foreground">
              <History className="h-4 w-4" strokeWidth={1.75} />
              Read-only audit view — no actions available
            </div>
          ) : (
            <>
          {autoOnly && !showForward && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs font-medium text-muted-foreground">
              <Radar className="h-4 w-4" strokeWidth={1.75} />
              {workflowHint ?? "System is processing this incident."}
            </div>
          )}
          {terminal && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-info-muted px-3 py-2.5 text-xs font-medium text-info">
              <CircleCheck className="h-4 w-4" strokeWidth={1.75} />
              No further actions
            </div>
          )}
          {awaitingClosure && !terminal && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-4 w-4" strokeWidth={1.75} />
              {workflowHint ?? "Awaiting citizen feedback or unit closure."}
            </div>
          )}
          {!autoOnly && !terminal && !awaitingClosure && (
            <>
              {workflowHint && (
                <div
                  className="flex items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs font-medium text-muted-foreground"
                >
                  {needsUnitAssignment(data) ? (
                    <User className="h-4 w-4" strokeWidth={1.75} />
                  ) : isFieldProgressByUnit(data) ? (
                    <Activity className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Radar className="h-4 w-4" strokeWidth={1.75} />
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
              className="flex items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs font-medium text-muted-foreground"
            >
              <Radar className="h-4 w-4" strokeWidth={1.75} />
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
      <AppShell role="operator">
        <PageHeader icon={AlertOctagon} title="Incidents" />
        <ErrorBanner onRetry={refresh} />
      </AppShell>
    );
  }

  return (
    <AppShell role="operator">

        {queueTab === "active" && (
          <IncidentStatGrid incidents={incidents} unreadCount={unreadCount} />
        )}

        <PageHeader
          icon={AlertOctagon}
          title="Incidents"
          subtitle={
            <>
              <span className="font-mono">
                {incidents.length} total
                {unreadCount > 0 && (
                  <span className="ml-2 font-semibold text-info">
                    · {unreadCount} unread
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isConnected ? "animate-pulse bg-success" : "bg-warning"
                  )}
                />
                <Radar
                  className={cn("h-3.5 w-3.5", isConnected ? "text-success" : "text-warning")}
                  strokeWidth={1.75}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    isConnected ? "text-success" : "text-warning"
                  )}
                >
                  {isConnected ? "Live" : "Offline"}
                </span>
              </span>
            </>
          }
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2 rounded-lg">
                <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
                Refresh
              </Button>
              <div className="flex items-center rounded-lg border bg-muted/50 p-1">
                {(["list", "map"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
                      view === v
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {v === "list" ? (
                      <LayoutList className="h-4 w-4" strokeWidth={1.75} />
                    ) : (
                      <Map className="h-4 w-4" strokeWidth={1.75} />
                    )}
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </>
          }
          className="mb-0"
        />

        {/* Map view — active queue only */}
        {view === "map" && queueTab === "active" && (
          <div
            className="overflow-hidden rounded-2xl border border-border shadow-sm"
            style={{ height: "calc(100vh - 260px)" }}
          >
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
                      <span className="text-data rounded-full bg-muted px-2 py-0.5">
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
              <FilterBar
                trailing={
                  <span className="text-sm font-mono text-muted-foreground">
                    {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                  </span>
                }
              >
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
                  <button
                    onClick={() => { setCategoryFilter("all"); setStatusFilter("all"); }}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Clear filters
                  </button>
                )}
              </FilterBar>

              {/* Incident table */}
              <Card className="border shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="px-6 py-4 border-b bg-muted/30">
                  <CardTitle className="text-lg font-bold">Incident List</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingForwardedAway && queueTab === "forwarded_away" ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.75} />
                    </div>
                  ) : filtered.length === 0 ? (
                    <IncidentListEmpty isFiltered={isFiltered} queueTab={queueTab} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs font-bold uppercase tracking-wider">Category</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-wider">Reporter</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-wider">
                            {queueTab === "forwarded_away" ? "Destination" : "Station"}
                          </TableHead>
                          {queueTab === "forwarded_away" && (
                            <TableHead className="w-[22rem] text-xs font-bold uppercase tracking-wider">
                              Reason
                            </TableHead>
                          )}
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
                          const awayChain = incident.forward_away_info?.forward_chain;
                          const awayDestination =
                            incident.forward_away_info?.to_station_name ??
                            incident.forward_away_info?.current_assigned_station_name;
                          const awayReason =
                            incident.operator_display_message ??
                            awayChain?.find((step) => step.is_current)?.reason ??
                            awayChain?.[awayChain.length - 1]?.reason;
                          return (
                            <TableRow
                              key={incident.id}
                              onClick={() => openDetail(incident, queueTab)}
                              className={`cursor-pointer border-l-4 transition-all hover:bg-muted/50 ${
                                isSelected
                                  ? "bg-muted"
                                  : isForwardedAwayTab
                                    ? "opacity-90"
                                    : isRouted
                                      ? "border-status-routed bg-status-routed-muted/40"
                                      : unread
                                        ? "border-info bg-info-muted/50"
                                        : "border-transparent"
                              } ${unread ? "font-semibold" : ""}`}>
                              <TableCell className="py-4 pl-4">
                                <div className="flex items-center gap-2">
                                  {isRouted && <span className="h-2 w-2 animate-pulse rounded-full bg-status-routed" />}
                                  {unread && !isRouted && (
                                    <span className="h-2 w-2 rounded-full bg-info" title="Unread" />
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
                                    <p>{awayDestination ?? "—"}</p>
                                  </div>
                                ) : (
                                  incident.assigned_station?.name ?? "—"
                                )}
                              </TableCell>
                              {queueTab === "forwarded_away" && (
                                <TableCell className="w-[22rem] py-4 text-sm text-muted-foreground">
                                  <div className="max-w-[22rem] overflow-hidden">
                                    <p className="truncate whitespace-nowrap" title={awayReason ?? undefined}>
                                      {awayReason ?? "—"}
                                    </p>
                                  </div>
                                </TableCell>
                              )}
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
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-info transition-colors hover:bg-info-muted disabled:opacity-50"
                                    >
                                      {markingReadId === incident.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                                      ) : (
                                        <Mail className="h-4 w-4" strokeWidth={1.75} />
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
                <Card className="sticky top-0 max-h-[calc(100vh-180px)] overflow-hidden rounded-xl border-0 shadow-sm">
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

    </AppShell>
  );
}

export default function IncidentsPage() {
  return (
    <IncidentsErrorBoundary>
      <IncidentsPageInner />
    </IncidentsErrorBoundary>
  );
}
