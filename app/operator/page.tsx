"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Hospital,
  AlertOctagon,
  Clock,
  BarChart3,
  CircleCheck,
  Loader2,
  MapPin,
  Radar,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import StatCard from "@/components/dashboard/StatCard";
import EmptyState from "@/components/dashboard/EmptyState";
import StatusBadge from "@/components/incidents/StatusBadge";
import CategoryBadge from "@/components/incidents/CategoryBadge";
import { stationTypeStyle } from "@/lib/status-styles";
import { cn } from "@/lib/utils";
import { dashboardAPI } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { useIncidentSocket } from "@/lib/useIncidentSocket";
import type { OperatorDashboardData, User } from "@/types";

const IncidentMap = dynamic(() => import("@/components/incidents/IncidentMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-xl bg-muted/30">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

function DashboardSkeleton() {
  return (
    <AppShell role="operator">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-72 animate-pulse rounded bg-muted" />
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 animate-pulse rounded-2xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-7 w-48 animate-pulse rounded bg-muted" />
                <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 animate-pulse rounded-xl bg-muted" />
                  <div className="space-y-2">
                    <div className="h-9 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="h-6 w-36 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default function OperatorDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<OperatorDashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [todayLabel, setTodayLabel] = useState("");
  const {
    incidents: activeIncidents,
    loading: queueLoading,
    fetchError: queueFetchError,
    isConnected,
  } = useIncidentSocket();

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
      setDashboardLoading(false);
    });
  }, []);

  if (dashboardLoading) {
    return <DashboardSkeleton />;
  }

  const stationStyle = data?.my_station
    ? stationTypeStyle(data.my_station.type)
    : null;
  const StationIcon = stationStyle?.icon;
  const mappableActiveIncidents = activeIncidents.filter(
    (incident) => incident.latitude != null && incident.longitude != null
  );

  return (
    <AppShell role="operator">
      <PageHeader
        icon={Calendar}
        title={`Welcome back, ${user?.full_name ?? "Operator"}`}
        subtitle={todayLabel || "—"}
      />

      {data?.my_station && stationStyle && StationIcon && (
        <Card
          className={cn(
            "mb-6 border-0 border-l-4 shadow-md transition-shadow hover:shadow-lg",
            stationStyle.border
          )}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl",
                    stationStyle.bg
                  )}
                >
                  <StationIcon
                    className={cn("h-8 w-8", stationStyle.text)}
                    strokeWidth={1.75}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {data.my_station.name}
                  </h2>
                  <Badge variant="secondary" className="mt-1.5 capitalize">
                    <Hospital className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
                    {data.my_station.type} Station
                  </Badge>
                </div>
              </div>
              <Button
                onClick={() => router.push("/operator/incidents")}
                className="gap-2"
              >
                View All Incidents
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4">
        <StatCard
          label="Pending Incidents"
          value={data?.kpis?.active ?? "—"}
          icon={AlertOctagon}
          variant="warning"
        />
        <StatCard
          label="Total Today"
          value={data?.incidents?.windowed?.today?.total ?? "—"}
          icon={BarChart3}
          variant="info"
        />
      </div>

      <PageSection
        title="Active Incident Map"
        description="Live map of your station's active incident queue."
        action={
          <div className="flex items-center gap-2">
            <Badge
              variant={isConnected ? "success" : "warning"}
              className="gap-1.5"
            >
              <Radar className="h-3 w-3" strokeWidth={1.75} />
              {isConnected ? "Live" : "Offline"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => router.push("/operator/incidents")}
            >
              View Incident Queue
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>
        }
      >
        <Card className="overflow-hidden border-0 py-0 shadow-sm">
          {queueLoading ? (
            <div className="flex h-[420px] items-center justify-center bg-muted/20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : queueFetchError ? (
            <div className="flex h-[420px] items-center justify-center p-6">
              <EmptyState
                icon={AlertOctagon}
                title="Could not load live incidents"
                description="Please refresh the page or open the incidents queue."
                action={
                  <Button
                    variant="outline"
                    onClick={() => router.push("/operator/incidents")}
                  >
                    Open Incidents
                  </Button>
                }
              />
            </div>
          ) : mappableActiveIncidents.length === 0 ? (
            <div className="flex h-[420px] items-center justify-center p-6">
              <EmptyState
                icon={MapPin}
                title={
                  activeIncidents.length === 0
                    ? "No active incidents"
                    : "No incident coordinates yet"
                }
                description={
                  activeIncidents.length === 0
                    ? "New incidents assigned to your station will appear here."
                    : "Active incidents exist, but their locations are not available for mapping yet."
                }
              />
            </div>
          ) : (
            <div className="h-[420px]">
              <IncidentMap
                incidents={activeIncidents}
                onSelect={() => router.push("/operator/incidents")}
              />
            </div>
          )}
        </Card>
      </PageSection>

      <PageSection title="Recent Incidents">
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              Recent Incidents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!data?.active_queue?.recent || data.active_queue.recent.length === 0 ? (
              <EmptyState
                icon={CircleCheck}
                title="All clear"
                description="No incidents assigned to your station"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.active_queue.recent.map((incident) => (
                    <TableRow
                      key={incident.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => router.push("/operator/incidents")}
                    >
                      <TableCell>
                        <CategoryBadge category={incident.category} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            strokeWidth={1.75}
                          />
                          <span className="text-sm">
                            {incident.address_line ||
                              incident.reporter_name ||
                              "Location unavailable"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={incident.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                          {new Date(incident.created_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ChevronRight
                          className="h-4 w-4 text-muted-foreground"
                          strokeWidth={1.75}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageSection>
    </AppShell>
  );
}
