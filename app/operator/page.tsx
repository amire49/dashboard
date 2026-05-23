"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCalendar,
  IconBuildingHospital,
  IconAlertHexagon,
  IconClockHour4,
  IconChartBar,
  IconCircleCheck,
  IconMapPin,
  IconStethoscope,
  IconShield,
  IconFlame,
  IconCircleDashed,
  IconChevronRight,
} from "@tabler/icons-react";
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
import Sidebar from "@/components/layout/Sidebar";
import { dashboardAPI } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { OperatorDashboardData, StationType, User } from "@/types";

const stationConfig: Record<StationType, { color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  fire: { 
    color: "text-red-600", 
    bgColor: "bg-red-50", 
    borderColor: "border-red-200",
    icon: IconFlame
  },
  police: { 
    color: "text-blue-600", 
    bgColor: "bg-blue-50", 
    borderColor: "border-blue-200",
    icon: IconShield
  },
  medical: { 
    color: "text-green-600", 
    bgColor: "bg-green-50", 
    borderColor: "border-green-200",
    icon: IconStethoscope
  },
};

const categoryConfig: Record<string, { color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  fire: { 
    color: "text-red-600", 
    bgColor: "bg-red-50", 
    borderColor: "border-red-200",
    icon: IconFlame
  },
  medical: { 
    color: "text-green-600", 
    bgColor: "bg-green-50", 
    borderColor: "border-green-200",
    icon: IconStethoscope
  },
  police: { 
    color: "text-blue-600", 
    bgColor: "bg-blue-50", 
    borderColor: "border-blue-200",
    icon: IconShield
  },
  crime: { 
    color: "text-blue-600", 
    bgColor: "bg-blue-50", 
    borderColor: "border-blue-200",
    icon: IconShield
  },
};

function CategoryBadge({ category }: { category: string }) {
  const key = category?.toLowerCase() ?? "";
  const cfg = categoryConfig[key] || { 
    color: "text-gray-500", 
    bgColor: "bg-gray-50", 
    borderColor: "border-gray-200",
    icon: IconCircleDashed
  };
  
  const Icon = cfg.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize border ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}>
      <Icon size={14} stroke={1.5} />
      {category ?? "None"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase().replace(/\s+/g, "_");
  
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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export default function OperatorDashboardPage() {
  const router = useRouter();
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
      <div className="flex h-screen overflow-hidden">
        <Sidebar role="operator" />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="space-y-6">
            {/* Greeting skeleton */}
            <div className="space-y-2">
              <div className="h-8 w-72 animate-pulse rounded bg-muted" />
              <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            </div>
            
            {/* Station hero skeleton */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 animate-pulse rounded-2xl bg-muted" />
                  <div className="space-y-2 flex-1">
                    <div className="h-7 w-48 animate-pulse rounded bg-muted" />
                    <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Stat cards skeleton */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
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
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 animate-pulse rounded-xl bg-muted" />
                    <div className="space-y-2">
                      <div className="h-9 w-16 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Table skeleton */}
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
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="operator" />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        {/* Greeting Header */}
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <IconCalendar size={20} stroke={1.5} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {user?.full_name ?? "Operator"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{todayLabel || "—"}</p>
          </div>
        </div>

        {/* Station Hero Card */}
        {data?.my_station && (() => {
          const cfg = stationConfig[data.my_station.type] || stationConfig.medical;
          const StationIcon = cfg.icon;
          
          return (
            <Card className={`mb-6 border-0 shadow-md hover:shadow-lg transition-shadow ${cfg.borderColor} border-l-4`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${cfg.bgColor}`}>
                      <StationIcon size={32} stroke={1.5} className={cfg.color} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">{data.my_station.name}</h2>
                      <Badge variant="secondary" className="mt-1.5 capitalize">
                        <IconBuildingHospital size={14} stroke={1.5} className="mr-1" />
                        {data.my_station.type} Station
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    onClick={() => router.push('/operator/incidents')}
                    className="gap-2"
                  >
                    View All Incidents
                    <IconChevronRight size={16} stroke={1.5} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Stat Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          {/* Pending Incidents */}
          <Card className="border-orange-200 border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Pending Incidents</p>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                  <IconAlertHexagon size={20} stroke={1.5} className="text-orange-600" />
                </div>
              </div>
              <p className="font-mono text-4xl font-bold text-orange-600">
                {data?.pending_incidents ?? "—"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Awaiting response
              </p>
            </CardContent>
          </Card>

          {/* Total Incidents Today */}
          <Card className="border-blue-200 border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Total Today</p>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <IconChartBar size={20} stroke={1.5} className="text-blue-600" />
                </div>
              </div>
              <p className="font-mono text-4xl font-bold text-blue-600">
                {data?.total_incidents_today ?? "—"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                All incidents today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Incidents Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <IconClockHour4 size={20} stroke={1.5} className="text-muted-foreground" />
              Recent Incidents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!data?.recent_incidents || data.recent_incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                  <IconCircleCheck size={32} stroke={1.5} className="text-green-600" />
                </div>
                <p className="text-lg font-bold">All clear</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No incidents assigned to your station
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_incidents.map((incident) => (
                    <TableRow 
                      key={incident.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push('/operator/incidents')}
                    >
                      <TableCell>
                        <CategoryBadge category={incident.category} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <IconMapPin size={14} stroke={1.5} className="text-muted-foreground shrink-0" />
                          <span className="text-sm">{incident.address_line || 'Location unavailable'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={incident.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <IconClockHour4 size={14} stroke={1.5} className="shrink-0" />
                          {new Date(incident.created_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <IconChevronRight size={16} stroke={1.5} className="text-muted-foreground" />
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
