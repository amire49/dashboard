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
import Sidebar from "@/components/layout/Sidebar";
import IncidentForwardingAdmin from "@/components/admin/IncidentForwardingAdmin";
import type { AdminDashboardData, Station } from "@/types";
import { dashboardAPI, stationsAPI } from "@/lib/api";

const StationsMap = dynamic(() => import("@/components/admin/EnhancedStationsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-xl bg-muted/30">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

// ── Mock weekly incident trend (replace with real API when available) ─────────
const WEEKLY_TREND = [
  { day: "Mon", incidents: 4 },
  { day: "Tue", incidents: 7 },
  { day: "Wed", incidents: 5 },
  { day: "Thu", incidents: 9 },
  { day: "Fri", incidents: 6 },
  { day: "Sat", incidents: 11 },
  { day: "Sun", incidents: 8 },
];

// ── Live clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
      <Clock className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="font-mono text-base font-semibold" style={{ letterSpacing: "-0.01em" }}>
          {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>
    </div>
  );
}

// ── Custom donut label ────────────────────────────────────────────────────────
function DonutLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-6" fontSize="22" fontWeight="700" fill="var(--foreground)">{total}</tspan>
      <tspan x={cx} dy="20" fontSize="11" fill="var(--muted-foreground)">stations</tspan>
    </text>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardAPI.admin(),
      stationsAPI.list()
    ]).then(([dashData, stationsData]) => {
      setData(dashData);
      setStations(stationsData || []);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load dashboard data:", err);
      setLoading(false);
    });
  }, []);

  // Donut data
  const donutData = [
    { name: "Police",  value: data?.stations_by_type?.police  ?? 0, color: "#8b5cf6" },
    { name: "Medical", value: data?.stations_by_type?.medical ?? 0, color: "#22c55e" },
    { name: "Fire",    value: data?.stations_by_type?.fire    ?? 0, color: "#ef4444" },
  ];

  // Radial bar data — operators active ratio
  const radialData = [
    {
      name: "Active Operators",
      value: data?.total_operators
        ? Math.round((data.active_operators / data.total_operators) * 100)
        : 0,
      fill: "#ef4444",
    },
    {
      name: "Active Stations",
      value: data?.total_stations
        ? Math.round((data.active_stations / data.total_stations) * 100)
        : 0,
      fill: "#8b5cf6",
    },
  ];

  const stats = [
    { label: "Total Stations",   value: data?.total_stations,   icon: Building2,   color: "#8b5cf6" },
    { label: "Active Stations",  value: data?.active_stations,  icon: CheckCircle, color: "#22c55e" },
    { label: "Total Operators",  value: data?.total_operators,  icon: Users,       color: "#3b82f6" },
    { label: "Active Operators", value: data?.active_operators, icon: Activity,    color: "#22c55e" },
    { label: "Total Citizens",   value: data?.total_citizens,   icon: Shield,      color: "#ef4444" },
  ];

  const quickActions = [
    { href: "/admin/stations",  label: "Manage Stations",  icon: Building2,     desc: "Add, edit, or remove stations",       soon: false, external: false },
    { href: "/admin/operators", label: "Manage Operators", icon: Users,         desc: "Create and manage operator accounts", soon: false, external: false },
    { href: "/admin/citizens",  label: "View Citizens",    icon: UserCheck,     desc: "Browse all registered citizens",      soon: false, external: false },
    { href: "https://kyc-micro-service.onrender.com/admin/dashboard/", label: "Review KYC", icon: ClipboardList, desc: "Review pending identity submissions", soon: false, external: true },
    { href: "#",                label: "Citizens App",     icon: Shield,        desc: "Manage citizen mobile app",           soon: true, external: false },
    { href: "#",                label: "KYC Settings",     icon: ClipboardList, desc: "Configure KYC requirements",          soon: true, external: false },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-y-auto bg-background p-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ letterSpacing: "-0.03em" }}>Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">System overview and quick actions</p>
          </div>
          <LiveClock />
        </div>

        {/* ── Stat cards ── */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <Skeleton className="mb-2 h-9 w-9" />
                    <Skeleton className="mb-1 h-6 w-10" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))
            : stats.map(s => (
                <Card key={s.label} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${s.color}18`, color: s.color }}>
                      <s.icon className="h-4 w-4" />
                    </div>
                    <p className="font-mono text-2xl font-bold leading-none">{s.value ?? "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* ── Row 2: Donut + Radial + Trend ── */}
        <div className="mb-5 grid gap-5 lg:grid-cols-3">

          {/* Donut — stations by type */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-0 pt-5 px-5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Siren className="h-4 w-4" style={{ color: "var(--primary)" }} />
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
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                          fontSize: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,.08)",
                        }}
                        formatter={(v, name) => [`${v} stations`, name]}
                      />
                      {/* Center label */}
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
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-muted-foreground">{d.name}</span>
                        <span className="font-mono text-xs font-semibold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Radial — active ratios */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-0 pt-5 px-5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4" style={{ color: "#22c55e" }} />
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
                      <RadialBar
                        background={{ fill: "var(--muted)" }}
                        dataKey="value"
                        cornerRadius={8}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                          fontSize: "12px",
                        }}
                        formatter={(v, name) => [`${v}%`, name]}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="mt-1 space-y-2">
                    {radialData.map(d => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                          <span className="text-xs text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="font-mono text-xs font-bold">{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Area — weekly incident trend */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-0 pt-5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="h-4 w-4" style={{ color: "#ef4444" }} />
                  Weekly Incidents
                </CardTitle>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: "#ef444412", color: "#ef4444" }}>
                  This week
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={WEEKLY_TREND} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incidentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,.08)",
                    }}
                    formatter={(v) => [v, "Incidents"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="incidents"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#incidentGrad)"
                    dot={{ fill: "#ef4444", r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#ef4444", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ── Row 3: System status + Quick actions ── */}
        <div className="grid gap-5 lg:grid-cols-3">

          {/* System status */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4" style={{ color: "#22c55e" }} />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              {[
                { label: "API Server",        uptime: "99.9%" },
                { label: "Voice AI Service",  uptime: "99.7%" },
                { label: "Incident Routing",  uptime: "100%" },
                { label: "Notification Push", uptime: "98.5%" },
              ].map(item => (
                <div key={item.label}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5"
                  style={{ backgroundColor: "var(--muted)" }}>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#22c55e" }} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{item.uptime}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: "#22c55e18", color: "#22c55e" }}>
                      Operational
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {quickActions.map(action =>
                  action.soon ? (
                    <div key={action.label}
                      className="flex items-center gap-3 rounded-xl border p-3.5 opacity-40 cursor-not-allowed"
                      style={{ borderColor: "var(--border)" }}>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <action.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold truncate">{action.label}</p>
                          <Badge className="shrink-0 text-[9px] px-1 py-0 h-3.5" variant="secondary">Soon</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{action.desc}</p>
                      </div>
                    </div>
                  ) : (
                    <Link key={action.label} href={action.href}>
                      <div className="group flex items-center gap-3 rounded-xl border p-3.5 transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer"
                        style={{ borderColor: "var(--border)" }}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: "color-mix(in oklch, var(--primary) 10%, transparent)", color: "var(--primary)" }}>
                          <action.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold">{action.label}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{action.desc}</p>
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

        {/* ── Incident forwarding (admin) ── */}
        <div className="mt-6">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Incident forwarding
          </p>
          <IncidentForwardingAdmin />
        </div>

        {/* ── Stations Map ── */}
        <div className="mt-6">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Emergency Response Network
          </p>
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="h-[600px]">
              <StationsMap stations={stations} />
            </div>
          </Card>
        </div>

      </main>
    </div>
  );
}
