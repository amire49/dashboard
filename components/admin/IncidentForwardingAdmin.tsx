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
      <Card className="border-0 shadow-sm">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-primary" />
            Auto-forward timeout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If an incident stays <span className="font-medium">routed</span> or{" "}
            <span className="font-medium">pending</span> and no operator at the assigned
            station opens it within this time, the system forwards it to the nearest
            same-type station.
          </p>
          <div className="space-y-2">
            <Label htmlFor="forward-minutes">Minutes (min 1)</Label>
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
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save settings
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            Station non-response ({totalNonResponses})
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {stats.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">
              No non-response events recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats
                  .filter((s) => s.non_response_count > 0)
                  .sort((a, b) => b.non_response_count - a.non_response_count)
                  .map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {s.type_display ?? s.type}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {s.non_response_count}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
