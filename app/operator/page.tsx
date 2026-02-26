"use client";

import { useEffect, useState } from "react";
import {
  Siren,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Sidebar from "@/components/layout/Sidebar";
import { dashboardAPI } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { OperatorDashboardData, StationType, User } from "@/types";

const stationBorderColors: Record<StationType, string> = {
  fire: "var(--station-fire)",
  police: "var(--station-police)",
  medical: "var(--station-medical)",
};

export default function OperatorDashboardPage() {
  const [data, setData] = useState<OperatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [todayLabel, setTodayLabel] = useState("");

  useEffect(() => {
    setUser(getUser());
    setTodayLabel(
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  useEffect(() => {
    dashboardAPI.operator().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="operator" />
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="space-y-4">
            <div className="h-8 w-64 animate-pulse rounded bg-muted" />
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-28 animate-pulse rounded-lg bg-muted" />
              <div className="h-28 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="operator" />

      <main className="flex-1 overflow-auto bg-background p-6">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Welcome back, {user?.full_name ?? "Operator"}
          </h1>
          <p className="text-sm text-muted-foreground">{todayLabel || "—"}</p>
        </div>

        {/* Station Hero */}
        {data?.my_station && (
          <Card
            className="mb-6 border-l-4 rounded-l-none"
            style={{
              borderLeftColor:
                stationBorderColors[data.my_station.type] ?? "var(--primary)",
            }}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <Siren
                className="h-10 w-10"
                style={{
                  color:
                    stationBorderColors[data.my_station.type] ?? "var(--primary)",
                }}
              />
              <div>
                <h2 className="text-xl font-bold">{data.my_station.name}</h2>
                <Badge variant="secondary">
                  {data.my_station.type.charAt(0).toUpperCase() +
                    data.my_station.type.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stat Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: "color-mix(in oklch, var(--chart-4) 15%, transparent)",
                  color: "var(--chart-4)",
                }}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-mono text-2xl font-semibold">
                  {data?.pending_incidents ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pending Incidents
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: "color-mix(in oklch, var(--chart-2) 15%, transparent)",
                  color: "var(--chart-2)",
                }}
              >
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-mono text-2xl font-semibold">
                  {data?.total_incidents_today ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total Incidents Today
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Incidents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.recent_incidents || data.recent_incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="mb-3 h-12 w-12" style={{ color: "var(--chart-3)" }} />
                <p className="text-lg font-medium">All clear</p>
                <p className="text-sm text-muted-foreground">
                  No incidents assigned
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_incidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-medium">
                        {incident.type}
                      </TableCell>
                      <TableCell>{incident.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{incident.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {incident.time}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
