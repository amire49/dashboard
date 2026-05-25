"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Building2, CheckCircle, Users, Activity, Shield,
  TrendingUp, Siren, Clock,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  RadialBarChart, RadialBar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import StatCard from "@/components/dashboard/StatCard";
import type { AdminDashboardData, Station } from "@/types";
import { citizensAPI, dashboardAPI, operatorsAPI, stationsAPI } from "@/lib/api";
import { cn } from "@/lib/utils";

const StationsMap = dynamic(() => import("@/components/admin/EnhancedStationsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-xl bg-muted/30">
      <div className="text-center">
        <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-caption">Loading map...</p>
      </div>
    </div>
  ),
});

const WEEKLY_TREND = [
  { day: "Mon", incidents: 4 },
  { day: "Tue", incidents: 7 },
  { day: "Wed", incidents: 5 },
  { day: "Thu", incidents: 9 },
  { day: "Fri", incidents: 6 },
  { day: "Sat", incidents: 11 },
  { day: "Sun", incidents: 8 },
];

const CHART_TOOLTIP_CLASS =
  "rounded-xl border border-border bg-card px-3 py-2 text-caption shadow-card";

const STATION_LEGEND_DOT: Record<string, string> = {
  Police: "bg-station-police",
  Medical: "bg-station-medical",
  Fire: "bg-station-fire",
};

const RADIAL_LEGEND_DOT: Record<string, string> = {
  "Active Operators": "bg-primary",
  "Active Stations": "bg-station-police",
};

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-data text-base font-semibold">
          {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
        <p className="text-caption">
          {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Try the lightweight aggregate endpoint first, in parallel with the
      // stations list (which we need anyway for the map).
      const [dashData, stationsData] = await Promise.all([
        dashboardAPI.admin(),
        stationsAPI.list(),
      ]);

      if (cancelled) return;

      const stationRows = stationsData ?? [];
      setStations(stationRows);

      if (dashData) {
        setData(dashData);
        setLoading(false);
        return;
      }

      // Fallback: the aggregate endpoint returned null (network error, server
      // hiccup, etc.). Compute the same totals client-side from the list
      // endpoints so the cards never get stuck on "—".
      const [operatorsRes, citizensRes] = await Promise.all([
        operatorsAPI.list(),
        citizensAPI.list(),
      ]);

      if (cancelled) return;

      const operators = operatorsRes?.data ?? [];
      const citizens = citizensRes ?? [];

      setData({
        totals: {
          stations_total: stationRows.length,
          stations_active: stationRows.filter((s) => s.is_active).length,
          stations_by_type: {
            police: stationRows.filter((s) => s.type === "police").length,
            medical: stationRows.filter((s) => s.type === "medical").length,
            fire: stationRows.filter((s) => s.type === "fire").length,
          },
          operators_total: operators.length,
          operators_active: operators.filter((o) => o.is_active).length,
          citizens_total: citizens.length,
        },
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const totals = data?.totals;
  const stationsByType = totals?.stations_by_type ?? {};

  const donutData = [
    { name: "Police", value: stationsByType.police ?? 0, color: "var(--station-police)" },
    { name: "Medical", value: stationsByType.medical ?? 0, color: "var(--station-medical)" },
    { name: "Fire", value: stationsByType.fire ?? 0, color: "var(--station-fire)" },
  ];

  const radialData = [
    {
      name: "Active Operators",
      value: totals?.operators_total
        ? Math.round((totals.operators_active / totals.operators_total) * 100)
        : 0,
      fill: "var(--primary)",
    },
    {
      name: "Active Stations",
      value: totals?.stations_total
        ? Math.round((totals.stations_active / totals.stations_total) * 100)
        : 0,
      fill: "var(--station-police)",
    },
  ];

  const stats = [
    { label: "Total Stations", value: totals?.stations_total, icon: Building2, variant: "primary" as const },
    { label: "Active Stations", value: totals?.stations_active, icon: CheckCircle, variant: "success" as const },
    { label: "Total Operators", value: totals?.operators_total, icon: Users, variant: "info" as const },
    { label: "Active Operators", value: totals?.operators_active, icon: Activity, variant: "success" as const },
    { label: "Total Citizens", value: totals?.citizens_total, icon: Shield, variant: "danger" as const },
  ];

  // Build the weekly trend from the backend's daily series when present, so
  // the chart reflects real incident volume instead of the mock fixture.
  const weeklyTrend = (() => {
    const series = data?.trends?.daily_last_7;
    if (!series || series.length === 0) return WEEKLY_TREND;
    return series.map((point) => ({
      day: new Date(point.date).toLocaleDateString(undefined, {
        weekday: "short",
      }),
      incidents: point.total,
    }));
  })();

  return (
    <AppShell role="admin">
      <PageHeader
        title="Admin Dashboard"
        subtitle="System overview"
        actions={<LiveClock />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="rounded-xl border py-0 shadow-card">
                <CardContent className="p-5">
                  <Skeleton className="mb-2 h-12 w-12" />
                  <Skeleton className="mb-1 h-8 w-10" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))
          : stats.map(s => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value ?? "—"}
                icon={s.icon}
                variant={s.variant}
              />
            ))}
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card className="rounded-xl border py-0 shadow-card">
          <CardHeader className="px-5 pt-5 pb-0">
            <CardTitle className="flex items-center gap-2 text-section-title">
              <Siren className="h-4 w-4 text-primary" />
              Stations by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "transparent", border: "none", padding: 0 }}
                      wrapperClassName={CHART_TOOLTIP_CLASS}
                      formatter={(v, name) => [`${v} stations`, name]}
                    />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                      <tspan x="50%" dy="-6" fontSize="22" fontWeight="700" fill="var(--foreground)">
                        {totals?.stations_total ?? 0}
                      </tspan>
                      <tspan x="50%" dy="20" fontSize="11" fill="var(--muted-foreground)">
                        stations
                      </tspan>
                    </text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-1 flex justify-center gap-4">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          STATION_LEGEND_DOT[d.name] ?? "bg-muted-foreground"
                        )}
                      />
                      <span className="text-caption">{d.name}</span>
                      <span className="text-data text-caption font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border py-0 shadow-card">
          <CardHeader className="px-5 pt-5 pb-0">
            <CardTitle className="flex items-center gap-2 text-section-title">
              <Activity className="h-4 w-4 text-success" />
              Active Ratios
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={80}
                    barSize={14}
                    data={radialData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar background={{ fill: "var(--muted)" }} dataKey="value" cornerRadius={8} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "transparent", border: "none", padding: 0 }}
                      wrapperClassName={CHART_TOOLTIP_CLASS}
                      formatter={(v, name) => [`${v}%`, name]}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="mt-1 space-y-2">
                  {radialData.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            RADIAL_LEGEND_DOT[d.name] ?? "bg-muted-foreground"
                          )}
                        />
                        <span className="text-caption">{d.name}</span>
                      </div>
                      <span className="text-data text-caption font-bold">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border py-0 shadow-card">
          <CardHeader className="px-5 pt-5 pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-section-title">
                <TrendingUp className="h-4 w-4 text-primary" />
                Weekly Incidents
              </CardTitle>
              <Badge variant="secondary" className="text-caption">
                This week
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weeklyTrend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incidentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "transparent", border: "none", padding: 0 }}
                  wrapperClassName={CHART_TOOLTIP_CLASS}
                  formatter={(v) => [v, "Incidents"]}
                />
                <Area
                  type="monotone"
                  dataKey="incidents"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#incidentGrad)"
                  dot={{ fill: "var(--primary)", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "var(--primary)", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <PageSection
        title="Emergency Response Network"
        className="mt-6"
      >
        <Card className="overflow-hidden rounded-xl border py-0 shadow-card">
          <div className="h-[600px]">
            <StationsMap stations={stations} />
          </div>
        </Card>
      </PageSection>
    </AppShell>
  );
}
