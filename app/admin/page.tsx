"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Building2, CheckCircle, Users, Activity, Shield,
  UserCheck, ClipboardList, ArrowRight, TrendingUp, Siren, Clock,
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
import { dashboardAPI, stationsAPI } from "@/lib/api";
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
    Promise.all([
      dashboardAPI.admin(),
      stationsAPI.list(),
    ])
      .then(([dashData, stationsData]) => {
        setData(dashData);
        setStations(stationsData || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load dashboard data:", err);
        setLoading(false);
      });
  }, []);

  const donutData = [
    { name: "Police", value: data?.stations_by_type?.police ?? 0, color: "var(--station-police)" },
    { name: "Medical", value: data?.stations_by_type?.medical ?? 0, color: "var(--station-medical)" },
    { name: "Fire", value: data?.stations_by_type?.fire ?? 0, color: "var(--station-fire)" },
  ];

  const radialData = [
    {
      name: "Active Operators",
      value: data?.total_operators
        ? Math.round((data.active_operators / data.total_operators) * 100)
        : 0,
      fill: "var(--primary)",
    },
    {
      name: "Active Stations",
      value: data?.total_stations
        ? Math.round((data.active_stations / data.total_stations) * 100)
        : 0,
      fill: "var(--station-police)",
    },
  ];

  const stats = [
    { label: "Total Stations", value: data?.total_stations, icon: Building2, variant: "primary" as const },
    { label: "Active Stations", value: data?.active_stations, icon: CheckCircle, variant: "success" as const },
    { label: "Total Operators", value: data?.total_operators, icon: Users, variant: "info" as const },
    { label: "Active Operators", value: data?.active_operators, icon: Activity, variant: "success" as const },
    { label: "Total Citizens", value: data?.total_citizens, icon: Shield, variant: "danger" as const },
  ];

  const quickActions = [
    { href: "/admin/stations", label: "Manage Stations", icon: Building2, desc: "Add, edit, or remove stations", soon: false },
    { href: "/admin/operators", label: "Manage Operators", icon: Users, desc: "Create and manage operator accounts", soon: false },
    { href: "/admin/citizens", label: "View Citizens", icon: UserCheck, desc: "Browse all registered citizens", soon: false },
    { href: "/admin/kyc", label: "Review KYC", icon: ClipboardList, desc: "Review pending identity submissions", soon: false },
    { href: "#", label: "Citizens App", icon: Shield, desc: "Manage citizen mobile app", soon: true },
    { href: "#", label: "KYC Settings", icon: ClipboardList, desc: "Configure KYC requirements", soon: true },
  ];

  return (
    <AppShell role="admin">
      <PageHeader
        title="Admin Dashboard"
        subtitle="System overview and quick actions"
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
                        {data?.total_stations ?? 0}
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
              <AreaChart data={WEEKLY_TREND} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
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

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="rounded-xl border py-0 shadow-card">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="flex items-center gap-2 text-section-title">
              <Activity className="h-4 w-4 text-success" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-5 pb-5">
            {[
              { label: "API Server", uptime: "99.9%" },
              { label: "Voice AI Service", uptime: "99.7%" },
              { label: "Incident Routing", uptime: "100%" },
              { label: "Notification Push", uptime: "98.5%" },
            ].map(item => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                  <span className="text-body font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-data text-caption">{item.uptime}</span>
                  <Badge variant="success" className="text-caption">
                    Operational
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-xl border py-0 shadow-card lg:col-span-2">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-section-title">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {quickActions.map(action =>
                action.soon ? (
                  <div
                    key={action.label}
                    className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-border p-3.5 opacity-40"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <action.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-caption font-semibold">{action.label}</p>
                        <Badge variant="secondary" className="h-3.5 shrink-0 px-1 py-0 text-[9px]">
                          Soon
                        </Badge>
                      </div>
                      <p className="truncate text-caption">{action.desc}</p>
                    </div>
                  </div>
                ) : (
                  <Link key={action.label} href={action.href}>
                    <div className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3.5 transition-all hover:border-primary/30 hover:shadow-card">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <action.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-caption font-semibold">{action.label}</p>
                        <p className="truncate text-caption">{action.desc}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </Link>
                )
              )}
            </div>
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
