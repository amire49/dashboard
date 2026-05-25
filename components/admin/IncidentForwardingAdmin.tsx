"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CategoryBadge from "@/components/incidents/CategoryBadge";
import EmptyState from "@/components/dashboard/EmptyState";
import PageSection from "@/components/layout/PageSection";
import { incidentForwardingAdminAPI } from "@/lib/api";
import { useToast } from "@/lib/useToast";
import type { StationNonResponseStat } from "@/types";

export default function IncidentForwardingAdmin() {
  const { success, error: toastError } = useToast();
  const [minutes, setMinutes] = useState("30");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<StationNonResponseStat[]>([]);
  const [totalNonResponses, setTotalNonResponses] = useState(0);

  async function load() {
    setLoading(true);
    const [settings, statRes] = await Promise.all([
      incidentForwardingAdminAPI.getSettings(),
      incidentForwardingAdminAPI.getNonResponseStats(),
    ]);
    if (settings) {
      setMinutes(String(settings.undispatched_forward_minutes));
    }
    if (statRes) {
      setStats(statRes.data ?? []);
      setTotalNonResponses(statRes.total_non_responses ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings() {
    const n = parseInt(minutes, 10);
    if (Number.isNaN(n) || n < 1) {
      toastError("Invalid value", "Timeout must be at least 1 minute.");
      return;
    }
    setSaving(true);
    const { data, error } =
      await incidentForwardingAdminAPI.updateSettings(n);
    setSaving(false);
    if (error || !data) {
      toastError("Save failed", error ?? "Could not update settings.");
      return;
    }
    setMinutes(String(data.undispatched_forward_minutes));
    success("Settings saved", `Auto-forward after ${n} minutes without dispatch.`);
    load();
  }

  if (loading) {
    return (
      <Card className="rounded-xl border py-0 shadow-card">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const rankedStats = stats
    .filter((s) => s.non_response_count > 0)
    .sort((a, b) => b.non_response_count - a.non_response_count);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PageSection title="Auto-forward timeout">
        <Card className="rounded-xl border py-0 shadow-card">
          <CardHeader className="px-5 pt-5 pb-0">
            <CardTitle className="flex items-center gap-2 text-section-title">
              <Clock className="h-4 w-4 text-primary" />
              Timeout settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <p className="text-caption">
              If an incident stays <span className="font-medium text-foreground">routed</span> or{" "}
              <span className="font-medium text-foreground">pending</span> and no operator at the
              assigned station opens it within this time, the system forwards it to the nearest
              same-type station.
            </p>
            <div className="space-y-2">
              <Label htmlFor="forward-minutes" className="text-label">
                Minutes (min 1)
              </Label>
              <Input
                id="forward-minutes"
                type="number"
                min={1}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="max-w-[140px]"
              />
            </div>
            <Button onClick={saveSettings} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save settings
            </Button>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection
        title={`Station non-response (${totalNonResponses})`}
        action={
          <Button variant="ghost" size="sm" onClick={load} className="gap-1.5 text-caption">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      >
        <Card className="overflow-hidden rounded-xl border py-0 shadow-card">
          <CardHeader className="sr-only">
            <CardTitle className="flex items-center gap-2 text-section-title">
              <ShieldAlert className="h-4 w-4 text-warning-foreground" />
              Non-response stats
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rankedStats.length === 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title="No non-response events"
                description="Stations with missed dispatch windows will appear here."
                className="py-12"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-label">Station</TableHead>
                    <TableHead className="text-label">Type</TableHead>
                    <TableHead className="text-right text-label">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankedStats.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-body font-medium">{s.name}</TableCell>
                      <TableCell>
                        <CategoryBadge category={s.type_display ?? s.type} />
                      </TableCell>
                      <TableCell className="text-right text-data font-semibold">
                        {s.non_response_count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageSection>
    </div>
  );
}
