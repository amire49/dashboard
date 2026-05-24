"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconArrowsRightLeft,
  IconBuildingHospital,
  IconLoader2,
  IconRadar,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ForwardChainTimeline from "@/components/incidents/ForwardChainTimeline";
import { incidentsAPI } from "@/lib/api";
import { noFurtherStationsMessage } from "@/lib/forward-chain";
import { useToast } from "@/lib/useToast";
import {
  defaultNearestTargetForIncident,
  FORWARD_REASON_LABELS,
  nearestTargetOptionsForIncident,
  rankStationsForPicker,
  reasonLabelToText,
  type ForwardTarget,
} from "@/lib/incident-forward";
import type { ForwardChainStep, Incident, Station } from "@/types";

type Props = {
  incident: Incident;
  disabled?: boolean;
  onForwardedAway: (incidentId: string, meta?: { stationName?: string }) => void;
  onChainUpdated?: (chain: ForwardChainStep[]) => void;
};

function nearestTargetsForServiceType(serviceType?: string): ForwardTarget[] {
  const t = serviceType?.toLowerCase() ?? "";
  if (t === "police") return ["nearest_police", "nearest_same"];
  if (t === "medical") return ["nearest_medical", "nearest_same"];
  if (t === "fire") return ["nearest_fire", "nearest_same"];
  return ["nearest_same"];
}

export default function ForwardIncidentControls({
  incident,
  disabled,
  onForwardedAway,
  onChainUpdated,
}: Props) {
  const { success, error: toastError } = useToast();
  const [busy, setBusy] = useState(false);
  const [nearestOpen, setNearestOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [reasonKey, setReasonKey] = useState("wrong_location");
  const [nearestTarget, setNearestTarget] = useState<ForwardTarget>(() =>
    defaultNearestTargetForIncident(incident)
  );
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState("");
  const [loadingStations, setLoadingStations] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [errorChain, setErrorChain] = useState<ForwardChainStep[] | null>(null);
  const [blockedNearestTargets, setBlockedNearestTargets] = useState<
    Set<ForwardTarget>
  >(() => new Set());

  const effectiveIncident = useMemo(
    () =>
      errorChain ? { ...incident, forward_chain: errorChain } : incident,
    [incident, errorChain]
  );

  const nearestOptions = useMemo(() => {
    const base = nearestTargetOptionsForIncident(effectiveIncident);
    if (blockedNearestTargets.size === 0) return base;
    return base.filter((opt) => !blockedNearestTargets.has(opt.value));
  }, [effectiveIncident, blockedNearestTargets]);

  const rankedStations = useMemo(
    () => rankStationsForPicker(effectiveIncident, stations),
    [effectiveIncident, stations]
  );

  useEffect(() => {
    if (!nearestOpen) return;
    if (!nearestOptions.some((o) => o.value === nearestTarget)) {
      setNearestTarget(nearestOptions[0]?.value ?? "nearest_same");
    }
  }, [nearestOpen, nearestOptions, nearestTarget]);

  useEffect(() => {
    if (!selectOpen) return;
    setLoadingStations(true);
    incidentsAPI.listOperatorStations().then((rows) => {
      setStations(rows);
      const ranked = rankStationsForPicker(effectiveIncident, rows);
      setSelectedStationId(ranked[0]?.id ?? "");
      setLoadingStations(false);
    });
  }, [selectOpen, effectiveIncident]);

  function resetDialogState() {
    setInlineError(null);
    setErrorChain(null);
  }

  function handleForwardError(
    error: string | null,
    errorBody: {
      code?: string;
      service_type?: string;
      forward_chain?: ForwardChainStep[];
    } | null
  ) {
    if (errorBody?.forward_chain?.length) {
      setErrorChain(errorBody.forward_chain);
      onChainUpdated?.(errorBody.forward_chain);
    }

    if (errorBody?.code === "station_in_chain") {
      toastError(
        "Station already in chain",
        "This station already handled this incident."
      );
      setInlineError("This station already handled this incident.");
      return;
    }

    if (errorBody?.code === "no_further_stations") {
      const msg = noFurtherStationsMessage(errorBody.service_type);
      toastError("No further stations", msg);
      setInlineError(msg);
      const blocked = nearestTargetsForServiceType(errorBody.service_type);
      setBlockedNearestTargets((prev) => {
        const next = new Set(prev);
        blocked.forEach((t) => next.add(t));
        return next;
      });
      return;
    }

    toastError("Forward failed", error ?? "Could not forward incident.");
    setInlineError(error ?? "Could not forward incident.");
  }

  async function submitForward(target: ForwardTarget, stationId?: string) {
    const reason = reasonLabelToText(reasonKey);
    setBusy(true);
    setInlineError(null);
    const { data, error, errorBody } = await incidentsAPI.forward(incident.id, {
      target,
      ...(target === "station" && stationId ? { station_id: stationId } : {}),
      ...(reason ? { reason } : {}),
    });
    setBusy(false);

    if (error || !data) {
      handleForwardError(error, errorBody);
      return;
    }

    if (data.forward_chain?.length) {
      onChainUpdated?.(data.forward_chain);
    }

    const stationName =
      data.forward?.to_station_name ?? data.assigned_station?.name ?? "new station";
    success(
      "Incident forwarded",
      `Routed to ${stationName}. It will leave your station queue.`
    );
    onForwardedAway(incident.id, { stationName });
    setNearestOpen(false);
    setSelectOpen(false);
    resetDialogState();
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Forward to another station
      </p>
      <p className="text-xs text-muted-foreground">
        Forward while <span className="font-medium">routed</span> or{" "}
        <span className="font-medium">dispatched</span> with no unit assigned. Not
        available after a unit is en route. Target station receives it as{" "}
        <span className="font-medium">routed</span>.
      </p>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 rounded-xl border-indigo-200 bg-indigo-50/50 text-indigo-900 hover:bg-indigo-50"
        disabled={disabled || busy || nearestOptions.length === 0}
        onClick={() => {
          resetDialogState();
          setReasonKey("wrong_location");
          setNearestTarget(defaultNearestTargetForIncident(incident));
          setNearestOpen(true);
        }}
      >
        <IconRadar size={16} stroke={1.5} />
        Forward to nearest station
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 rounded-xl"
        disabled={disabled || busy}
        onClick={() => {
          resetDialogState();
          setReasonKey("other");
          setSelectedStationId("");
          setSelectOpen(true);
        }}
      >
        <IconArrowsRightLeft size={16} stroke={1.5} />
        Forward to selected location
      </Button>

      <Dialog
        open={nearestOpen}
        onOpenChange={(open) => {
          setNearestOpen(open);
          if (!open) resetDialogState();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forward to nearest station</DialogTitle>
            <DialogDescription>
              The server assigns the nearest active station for your chosen type.
              Status becomes <span className="font-medium">routed</span> at the new
              station.
            </DialogDescription>
          </DialogHeader>

          {inlineError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {inlineError}
            </div>
          )}

          {errorChain && errorChain.length > 0 && (
            <ForwardChainTimeline chain={errorChain} compact title="Current chain" />
          )}

          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <IconBuildingHospital size={20} stroke={1.5} />
              </div>
              <div className="text-sm text-muted-foreground">
                Current:{" "}
                <span className="font-medium text-foreground">
                  {incident.assigned_station?.name ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Nearest target</Label>
            {nearestOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No nearest targets available for this service type.
              </p>
            ) : (
              <Select
                value={nearestTarget}
                onValueChange={(v) => setNearestTarget(v as ForwardTarget)}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {nearestOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Reason (optional)</Label>
            <Select value={reasonKey} onValueChange={setReasonKey}>
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(FORWARD_REASON_LABELS).map((key) => (
                  <SelectItem key={key} value={key}>
                    {FORWARD_REASON_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setNearestOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={() => submitForward(nearestTarget)}
              disabled={busy || nearestOptions.length === 0}
            >
              {busy ? (
                <IconLoader2 size={16} stroke={1.5} className="animate-spin" />
              ) : (
                "Confirm forward"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectOpen}
        onOpenChange={(open) => {
          setSelectOpen(open);
          if (!open) resetDialogState();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forward to selected location</DialogTitle>
            <DialogDescription>
              Pick any active station. The incident will be reassigned and removed from
              your queue.
            </DialogDescription>
          </DialogHeader>

          {inlineError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {inlineError}
            </div>
          )}

          {errorChain && errorChain.length > 0 && (
            <ForwardChainTimeline chain={errorChain} compact title="Current chain" />
          )}

          <div className="space-y-2">
            <Label className="text-xs">Reason (optional)</Label>
            <Select value={reasonKey} onValueChange={setReasonKey}>
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(FORWARD_REASON_LABELS).map((key) => (
                  <SelectItem key={key} value={key}>
                    {FORWARD_REASON_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Destination station</Label>
            {loadingStations ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <IconLoader2 size={20} stroke={1.5} className="animate-spin" />
              </div>
            ) : rankedStations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stations available.</p>
            ) : (
              <Select value={selectedStationId} onValueChange={setSelectedStationId}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {rankedStations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex flex-col">
                        <span>{s.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {s.type}
                          {s.distance_km < 900
                            ? ` · ~${s.distance_km.toFixed(1)} km`
                            : ""}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={() => submitForward("station", selectedStationId)}
              disabled={busy || !selectedStationId}
            >
              {busy ? (
                <IconLoader2 size={16} stroke={1.5} className="animate-spin" />
              ) : (
                "Confirm forward"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
