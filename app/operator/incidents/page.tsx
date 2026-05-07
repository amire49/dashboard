"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Siren, AlertTriangle, CheckCircle, Clock, Filter,
  X, MapPin, User, FileText, Tag, ChevronRight,
  ArrowRight, Loader2, List, Map, Volume2, Building2,
  Navigation, RefreshCw, Activity, TrendingUp, Play, Pause, Wifi, WifiOff,
} from "lucide-react";
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
import { useAuth } from "@/lib/useAuth";
import { useWebSocket } from "@/lib/useWebSocket";
import type { Incident } from "@/types";

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
const INCIDENT_STATUSES   = ["all", "routed", "in_progress", "resolved"] as const;

type FilterCategory = (typeof INCIDENT_CATEGORIES)[number];
type FilterStatus   = (typeof INCIDENT_STATUSES)[number];

// ── Audio Player Component ────────────────────────────────────────────────────
function AudioPlayer({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audio.preload = "metadata";
    
    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });
    
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });
    
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    
    audio.addEventListener("error", () => {
      // Silently handle audio loading errors - show user-friendly message instead
      setError("Unable to load audio file. Please check the file format or URL.");
    });
    
    setAudioRef(audio);
    
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef) return;
    
    if (isPlaying) {
      audioRef.pause();
    } else {
      audioRef.play().catch(err => {
        console.error("Playback error:", err);
        setError("Playback failed. The audio format may not be supported.");
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef) return;
    const time = parseFloat(e.target.value);
    audioRef.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div className="mt-1 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
        <p className="text-xs text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-3 rounded-lg border border-border bg-muted/5 px-3 py-2">
      <button
        onClick={togglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary/90"
        disabled={!audioRef || duration === 0}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      
      <div className="flex-1">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
          disabled={!audioRef || duration === 0}
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function normalizeStatus(s: string) {
  return s.toLowerCase().replace(/\s+/g, "_");
}

function nextStatus(current: string): "in_progress" | "resolved" | null {
  const s = normalizeStatus(current);
  if (s === "routed")      return "in_progress";
  if (s === "in_progress") return "resolved";
  return null;
}

function nextStatusLabel(current: string) {
  const n = nextStatus(current);
  if (n === "in_progress") return "Mark In Progress";
  if (n === "resolved")    return "Mark Resolved";
  return "";
}

// ── Badges ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);
  if (s === "routed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-500 ring-1 ring-red-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        Routed
      </span>
    );
  if (s === "in_progress")
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset"
        style={{
          backgroundColor: "color-mix(in oklch, var(--chart-4) 12%, transparent)",
          color: "var(--chart-4)",
        }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--chart-4)" }} />
        In Progress
      </span>
    );
  if (s === "resolved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset"
        style={{
          backgroundColor: "color-mix(in oklch, var(--chart-2) 12%, transparent)",
          color: "var(--chart-2)",
        }}>
        <CheckCircle className="h-3 w-3" />
        Resolved
      </span>
    );
  return <Badge variant="outline">{status}</Badge>;
}

const CATEGORY_CONFIG: Record<string, { color: string; icon: string }> = {
  fire:    { color: "#ef4444", icon: "🔥" },
  medical: { color: "#3b82f6", icon: "🏥" },
  police:  { color: "#8b5cf6", icon: "🚔" },
  crime:   { color: "#8b5cf6", icon: "⚠️" },
};

function CategoryBadge({ category }: { category: string }) {
  const key = category?.toLowerCase() ?? "";
  const cfg = CATEGORY_CONFIG[key];
  const color = cfg?.color ?? "#6b7280";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
      style={{
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}33`,
      }}>
      {cfg?.icon && <span className="text-[10px]">{cfg.icon}</span>}
      {category ?? "Unknown"}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function StatCards({ incidents }: { incidents: Incident[] }) {
  const total      = incidents.length;
  const routed     = incidents.filter(i => normalizeStatus(i.status) === "routed").length;
  const inProgress = incidents.filter(i => normalizeStatus(i.status) === "in_progress").length;
  const resolved   = incidents.filter(i => normalizeStatus(i.status) === "resolved").length;

  const stats = [
    { label: "Total",       value: total,      icon: Activity,    color: "var(--primary)" },
    { label: "Routed",      value: routed,      icon: AlertTriangle, color: "#ef4444" },
    { label: "In Progress", value: inProgress,  icon: TrendingUp,  color: "var(--chart-4)" },
    { label: "Resolved",    value: resolved,    icon: CheckCircle, color: "var(--chart-2)" },
  ];

  return (
    <div className="mb-6 grid grid-cols-4 gap-3">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`, color }}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-mono text-xl font-bold leading-none">{value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="operator" />
      <main className="flex-1 overflow-y-auto bg-background p-6">
        {/* header */}
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
        {/* stat cards */}
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
        {/* filter bar */}
        <Card className="mb-4 border-0 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
            <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
        {/* table */}
        <Card className="border-0 shadow-sm">
          <CardHeader><div className="h-5 w-28 animate-pulse rounded bg-muted" /></CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  {[96, 120, 200, 112, 112].map((w, i) => (
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
                    <td className="px-4 py-3.5"><div className="h-4 animate-pulse rounded bg-muted" style={{ width: `${120 + (row % 3) * 40}px` }} /></td>
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

// ── Error / Empty ─────────────────────────────────────────────────────────────

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border p-5" style={{
      borderColor: "#ef444433",
      backgroundColor: "#ef444408",
    }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: "#ef444415", color: "#ef4444" }}>
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold" style={{ color: "#ef4444" }}>Failed to load incidents</p>
        <p className="mt-0.5 text-sm text-muted-foreground">Could not reach the server. Check your connection and try again.</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: isFiltered ? "var(--muted)" : "color-mix(in oklch, var(--chart-2) 12%, transparent)" }}>
        {isFiltered
          ? <Filter className="h-7 w-7 text-muted-foreground" />
          : <CheckCircle className="h-7 w-7" style={{ color: "var(--chart-2)" }} />}
      </div>
      <p className="text-base font-semibold">{isFiltered ? "No matching incidents" : "All clear"}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {isFiltered ? "Try adjusting or clearing your filters" : "No incidents have been routed to your station yet"}
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
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

function IncidentDetailPanel({ incident, detail, loadingDetail, onClose, onStatusUpdate }: {
  incident: Incident;
  detail: Incident | null;
  loadingDetail: boolean;
  onClose: () => void;
  onStatusUpdate: (updated: Incident) => void;
}) {
  const data = detail ?? incident;
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showMap, setShowMap] = useState(false);

  const cfg = CATEGORY_CONFIG[data.category?.toLowerCase()] ?? { color: "var(--primary)", icon: "" };
  const coords = latLng(data);
  const next = nextStatus(data.status);

  async function handleStatusUpdate() {
    if (!next) return;
    setUpdating(true);
    const res = await incidentsAPI.updateStatus(data.id, next);
    setUpdating(false);
    if (res) {
      onStatusUpdate(res);
      setToast({ ok: true, msg: `Moved to "${next.replace("_", " ")}"` });
    } else {
      setToast({ ok: false, msg: "Update failed. Try again." });
    }
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Panel header ── */}
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-base"
            style={{ backgroundColor: `${cfg.color}18`, border: `1px solid ${cfg.color}33` }}>
            {cfg.icon || <Siren className="h-4 w-4" style={{ color: cfg.color }} />}
          </div>
          <div>
            <p className="text-[10px] font-mono text-muted-foreground">#{String(data.id).slice(0, 8).toUpperCase()}</p>
            <p className="text-sm font-bold capitalize">{data.category ?? "Unknown"} Incident</p>
          </div>
        </div>
        <button onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Status strip ── */}
      <div className="shrink-0 flex items-center gap-2.5 px-5 py-2.5 border-b"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}>
        <StatusBadge status={data.status} />
        {normalizeStatus(data.status) === "routed" && (
          <span className="text-xs text-red-500 font-medium">Requires immediate attention</span>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loadingDetail ? (
          <div className="space-y-4 p-5">
            {[0.75, 0.5, 1, 0.6].map((w, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${w * 100}%` }} />
            ))}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>

            {/* Category + confidence */}
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

            {/* Time */}
            <div className="px-5 py-4">
              <DetailField icon={Clock} label="Time Reported">
                <span className="font-mono text-sm">{formatTimeFull(data.created_at)}</span>
              </DetailField>
            </div>

            {/* Reporter */}
            <div className="px-5 py-4">
              <DetailField icon={User} label="Reported By">
                <p className="font-semibold">{data.reporter?.full_name ?? "Unknown"}</p>
                {data.reporter?.phone && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{data.reporter.phone}</p>
                )}
              </DetailField>
            </div>

            {/* Location */}
            <div className="px-5 py-4">
              <DetailField icon={MapPin} label="Location">
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
                        <MapPin className="h-3 w-3" />
                        {showMap ? "Hide map" : "View on map"}
                      </span>
                      <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${showMap ? "rotate-90" : ""}`} />
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

            {/* Assigned station */}
            {data.assigned_station && (
              <div className="px-5 py-4">
                <DetailField icon={Building2} label="Assigned Station">
                  <p className="font-semibold">{data.assigned_station.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                    {data.assigned_station.type_display ?? data.assigned_station.type} · {data.assigned_station.city}
                  </p>
                  {data.distance_to_station_km != null && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      <Navigation className="h-3 w-3" />
                      {data.distance_to_station_km.toFixed(1)} km away
                    </span>
                  )}
                  
                  {/* Directions button */}
                  {coords && data.assigned_station.latitude && data.assigned_station.longitude && (
                    <div className="mt-3 space-y-2">
                      {/* Show exact coordinates */}
                      <div className="rounded-lg border px-3 py-2 text-xs"
                        style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)" }}>
                        <p className="font-semibold mb-1 text-muted-foreground">Incident Location:</p>
                        <p className="font-mono">{coords[0].toFixed(6)}, {coords[1].toFixed(6)}</p>
                      </div>
                      
                      <a
                        href={`https://www.google.com/maps/dir/${Number(data.assigned_station.latitude).toFixed(6)},${Number(data.assigned_station.longitude).toFixed(6)}/${coords[0].toFixed(6)},${coords[1].toFixed(6)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:shadow-md"
                        style={{
                          backgroundColor: cfg.color,
                          color: "white",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Navigation className="h-4 w-4" />
                          <div className="text-left">
                            <div>Get Directions to Incident</div>
                            <div className="text-xs font-normal opacity-90">
                              From {data.assigned_station.name}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </a>
                      
                      <button
                        onClick={() => {
                          const directionsUrl = `https://www.google.com/maps/dir/${Number(data.assigned_station!.latitude).toFixed(6)},${Number(data.assigned_station!.longitude).toFixed(6)}/${coords[0].toFixed(6)},${coords[1].toFixed(6)}`;
                          navigator.clipboard.writeText(directionsUrl);
                          console.log("Directions URL:", directionsUrl);
                          setToast({ ok: true, msg: "Directions link copied to clipboard" });
                          setTimeout(() => setToast(null), 2000);
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

            {/* Audio */}
            {data.audio_url && (
              <div className="px-5 py-4">
                <DetailField icon={Volume2} label="Audio Recording">
                  <AudioPlayer url={data.audio_url} />
                </DetailField>
              </div>
            )}

            {/* Transcription */}
            <div className="px-5 py-4">
              <DetailField icon={FileText} label="Transcription">
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

      {/* ── Footer action ── */}
      {!loadingDetail && (
        <div className="shrink-0 border-t p-4 space-y-2.5" style={{ borderColor: "var(--border)" }}>
          {toast && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
              style={{
                backgroundColor: toast.ok ? "color-mix(in oklch, var(--chart-2) 12%, transparent)" : "#ef444412",
                color: toast.ok ? "var(--chart-2)" : "#ef4444",
                border: `1px solid ${toast.ok ? "color-mix(in oklch, var(--chart-2) 30%, transparent)" : "#ef444430"}`,
              }}>
              {toast.ok
                ? <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
              {toast.msg}
            </div>
          )}
          {next ? (
            <Button className="w-full gap-2 rounded-xl" disabled={updating} onClick={handleStatusUpdate}
              style={next === "resolved"
                ? { backgroundColor: "color-mix(in oklch, var(--chart-2) 85%, transparent)", color: "white" }
                : undefined}>
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {updating ? "Updating..." : nextStatusLabel(data.status)}
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium"
              style={{ backgroundColor: "color-mix(in oklch, var(--chart-2) 10%, transparent)", color: "var(--chart-2)" }}>
              <CheckCircle className="h-3.5 w-3.5" />
              Incident resolved — no further actions
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IncidentsPage() {
  const { checking } = useAuth("operator");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [view, setView]           = useState<"list" | "map">("list");
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>("all");
  const [statusFilter, setStatusFilter]     = useState<FilterStatus>("all");
  const [selected, setSelected]   = useState<Incident | null>(null);
  const [detail, setDetail]       = useState<Incident | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: "new" | "update" }>({ 
    show: false, message: "", type: "new" 
  });

  // WebSocket connection for real-time updates
  // NOTE: Set enabled to false if backend WebSocket is not ready yet
  const { isConnected, lastMessage, connectionError } = useWebSocket("/ws/operator/incidents/", {
    enabled: false, // TODO: Set to true once backend WebSocket endpoint is confirmed
    onMessage: (message) => {
      console.log("Received WebSocket message:", message);
      
      if (message.type === "incident_created") {
        // New incident created
        const newIncident = message.incident as Incident;
        setIncidents(prev => [newIncident, ...prev]);
        
        // Show notification
        setNotification({
          show: true,
          message: `New ${newIncident.category} incident reported!`,
          type: "new"
        });
        
        // Play notification sound (optional)
        if (typeof window !== "undefined" && "Audio" in window) {
          try {
            const audio = new Audio("/notification.mp3");
            audio.play().catch(() => console.log("Could not play notification sound"));
          } catch (e) {
            console.log("Audio not available");
          }
        }
        
        // Auto-hide notification after 5 seconds
        setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
      } else if (message.type === "incident_updated" || message.type === "incident_status_changed") {
        // Incident updated
        const updatedIncident = message.incident as Incident;
        setIncidents(prev => prev.map(i => i.id === updatedIncident.id ? updatedIncident : i));
        
        // Update detail view if this incident is currently selected
        if (selected?.id === updatedIncident.id) {
          setDetail(updatedIncident);
          setSelected(updatedIncident);
        }
        
        // Show notification
        setNotification({
          show: true,
          message: `Incident status updated to ${updatedIncident.status}`,
          type: "update"
        });
        
        setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
      }
    },
    onConnect: () => {
      console.log("Connected to incident notifications");
    },
    onDisconnect: () => {
      console.log("Disconnected from incident notifications");
    },
    autoReconnect: true,
    reconnectInterval: 5000,
  });

  async function fetchIncidents() {
    setLoading(true);
    setError(false);
    const res = await incidentsAPI.list();
    if (res === null) {
      setError(true);
    } else {
      setIncidents(res.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (checking) return;
    fetchIncidents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking]);

  function openDetail(incident: Incident) {
    setSelected(incident);
    setDetail(null);
    setLoadingDetail(true);
    incidentsAPI.get(incident.id).then((res) => {
      setDetail(res);
      setLoadingDetail(false);
    });
  }

  function closeDetail() {
    setSelected(null);
    setDetail(null);
  }

  function handleStatusUpdate(updated: Incident) {
    setIncidents(prev => prev.map(i => i.id === updated.id ? { ...i, status: updated.status } : i));
    setSelected(prev => prev ? { ...prev, status: updated.status } : prev);
    setDetail(prev => prev ? { ...prev, ...updated } : updated);
  }

  const filtered = useMemo(() => {
    return incidents
      .filter(i => categoryFilter === "all" || i.category?.toLowerCase() === categoryFilter)
      .filter(i => statusFilter === "all" || normalizeStatus(i.status) === statusFilter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [incidents, categoryFilter, statusFilter]);

  const isFiltered = categoryFilter !== "all" || statusFilter !== "all";

  if (checking) return null;
  if (loading)  return <PageSkeleton />;

  if (error) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar role="operator" />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mb-6 flex items-center gap-3">
            <Siren className="h-7 w-7" style={{ color: "var(--primary)" }} />
            <h1 className="text-2xl font-bold">Incidents</h1>
          </div>
          <ErrorBanner onRetry={fetchIncidents} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="operator" />
      <main className="flex-1 overflow-y-auto bg-background p-6">

        {/* ── Page header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: "color-mix(in oklch, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
              <Siren className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{incidents.length} total incidents</p>
                {/* WebSocket connection indicator */}
                <span className="flex items-center gap-1 text-xs">
                  {isConnected ? (
                    <>
                      <Wifi className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">Live</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Offline</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchIncidents} className="gap-1.5 rounded-lg">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            {/* View toggle */}
            <div className="flex items-center rounded-xl p-1 gap-0.5"
              style={{ backgroundColor: "var(--muted)" }}>
              {(["list", "map"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
                  style={view === v
                    ? { backgroundColor: "var(--card)", color: "var(--foreground)", boxShadow: "0 1px 3px rgba(0,0,0,.12)" }
                    : { color: "var(--muted-foreground)" }}>
                  {v === "list" ? <List className="h-3.5 w-3.5" /> : <Map className="h-3.5 w-3.5" />}
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time notification banner */}
        {notification.show && (
          <div className="mb-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 rounded-xl border px-4 py-3"
              style={{
                backgroundColor: notification.type === "new" ? "#ef444408" : "color-mix(in oklch, var(--chart-4) 8%, transparent)",
                borderColor: notification.type === "new" ? "#ef444433" : "color-mix(in oklch, var(--chart-4) 30%, transparent)",
              }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: notification.type === "new" ? "#ef444415" : "color-mix(in oklch, var(--chart-4) 15%, transparent)",
                  color: notification.type === "new" ? "#ef4444" : "var(--chart-4)",
                }}>
                {notification.type === "new" ? <Siren className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
              </div>
              <p className="flex-1 text-sm font-medium">{notification.message}</p>
              <button onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Stat cards ── */}
        <StatCards incidents={incidents} />

        {/* ── MAP VIEW ── */}
        {view === "map" && (
          <div className="overflow-hidden rounded-2xl border shadow-sm"
            style={{ height: "calc(100vh - 260px)", borderColor: "var(--border)" }}>
            <IncidentMap incidents={filtered} onSelect={openDetail} selectedId={selected?.id} />
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <div className="grid grid-cols-12 gap-4">
            {/* Left column - List */}
            <div className={selected ? "col-span-7" : "col-span-12"}>

              {/* Filter bar */}
              <Card className="mb-4 border-0 shadow-sm rounded-xl">
                <CardContent className="flex flex-wrap items-center gap-2.5 p-3.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: "var(--muted)" }}>
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v as FilterCategory)}>
                    <SelectTrigger className="h-8 w-36 rounded-lg text-xs">
                      <SelectValue placeholder="Category" />
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
                    <SelectTrigger className="h-8 w-40 rounded-lg text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {INCIDENT_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>
                          {s === "all" ? "All Statuses" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isFiltered && (
                    <button onClick={() => { setCategoryFilter("all"); setStatusFilter("all"); }}
                      className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      Clear filters
                    </button>
                  )}

                  <span className="ml-auto text-xs text-muted-foreground">
                    {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                  </span>
                </CardContent>
              </Card>

              {/* Table */}
              <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                  <CardTitle className="text-base">Incident List</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {filtered.length === 0 ? (
                    <EmptyState isFiltered={isFiltered} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow style={{ backgroundColor: "var(--muted)" }}>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">Category</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">Reporter</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">Station</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />Time
                            </span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(incident => {
                          const isRouted = normalizeStatus(incident.status) === "routed";
                          const isSelected = selected?.id === incident.id;
                          return (
                            <TableRow key={incident.id} onClick={() => openDetail(incident)}
                              className="cursor-pointer transition-colors"
                              style={{
                                backgroundColor: isSelected ? "var(--muted)" : isRouted ? "#ef444406" : undefined,
                                borderLeft: isRouted ? "3px solid #ef4444" : "3px solid transparent",
                              }}>
                              <TableCell className="py-3.5">
                                <CategoryBadge category={incident.category} />
                              </TableCell>
                              <TableCell className="py-3.5">
                                <p className="text-sm font-medium">{incident.reporter?.full_name ?? "—"}</p>
                                {incident.reporter?.phone && (
                                  <p className="text-xs text-muted-foreground">{incident.reporter.phone}</p>
                                )}
                              </TableCell>
                              <TableCell className="py-3.5 text-sm text-muted-foreground">
                                {incident.assigned_station?.name ?? "—"}
                              </TableCell>
                              <TableCell className="py-3.5">
                                <StatusBadge status={incident.status} />
                              </TableCell>
                              <TableCell className="py-3.5 font-mono text-xs text-muted-foreground">
                                {formatTime(incident.created_at)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column - Detail Panel */}
            {selected && (
              <div className="col-span-5">
                <Card className="border-0 shadow-sm rounded-xl overflow-hidden sticky top-0" style={{ maxHeight: "calc(100vh - 180px)" }}>
                  <IncidentDetailPanel
                    incident={selected} detail={detail} loadingDetail={loadingDetail}
                    onClose={closeDetail} onStatusUpdate={handleStatusUpdate}
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

