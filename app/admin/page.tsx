"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle,
  Users,
  Activity,
  Shield,
  Flame,
  Cross,
  Siren,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/layout/Sidebar";
import type { AdminDashboardData } from "@/types";
import { dashboardAPI } from "@/lib/api";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState<Date | null>(null);

  useEffect(() => {
    setClock(new Date());
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    dashboardAPI.admin().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  const stats = [
    {
      label: "Total Stations",
      value: data?.total_stations,
      icon: Building2,
      colorVar: "var(--chart-2)",
    },
    {
      label: "Active Stations",
      value: data?.active_stations,
      icon: CheckCircle,
      colorVar: "var(--chart-3)",
    },
    {
      label: "Total Operators",
      value: data?.total_operators,
      icon: Users,
      colorVar: "var(--chart-5)",
    },
    {
      label: "Active Operators",
      value: data?.active_operators,
      icon: Activity,
      colorVar: "var(--chart-3)",
    },
    {
      label: "Total Citizens",
      value: data?.total_citizens,
      icon: Shield,
      colorVar: "var(--chart-1)",
    },
  ];

  const stationTypes = [
    {
      type: "Police",
      count: data?.stations_by_type?.police ?? 0,
      total: data?.total_stations ?? 1,
      icon: Shield,
      colorVar: "var(--station-police)",
    },
    {
      type: "Medical",
      count: data?.stations_by_type?.medical ?? 0,
      total: data?.total_stations ?? 1,
      icon: Cross,
      colorVar: "var(--station-medical)",
    },
    {
      type: "Fire",
      count: data?.stations_by_type?.fire ?? 0,
      total: data?.total_stations ?? 1,
      icon: Flame,
      colorVar: "var(--station-fire)",
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto bg-background p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              System overview and quick actions
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-medium">
              {clock ? clock.toLocaleTimeString() : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {clock
                ? clock.toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>

        {/* Stat Cards */}
        {loading ? (
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `color-mix(in oklch, ${stat.colorVar} 15%, transparent)`,
                      color: stat.colorVar,
                    }}
                  >
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-semibold">
                      {stat.value ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Stations by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Siren className="h-5 w-5" style={{ color: "var(--primary)" }} />
                Stations by Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded bg-muted"
                    />
                  ))
                : stationTypes.map((st) => (
                    <div key={st.type} className="flex items-center gap-4">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                        style={{
                          backgroundColor: `color-mix(in oklch, ${st.colorVar} 15%, transparent)`,
                          color: st.colorVar,
                        }}
                      >
                        <st.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{st.type}</span>
                          <span className="font-mono">{st.count}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${st.total > 0 ? (st.count / st.total) * 100 : 0}%`,
                              backgroundColor: st.colorVar,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/stations" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Building2 className="h-4 w-4" />
                  Manage Stations
                </Button>
              </Link>
              <Link href="/admin/operators" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Users className="h-4 w-4" />
                  Manage Operators
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
