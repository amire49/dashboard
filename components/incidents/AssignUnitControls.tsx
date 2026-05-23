"use client";

import { useEffect, useState } from "react";
import {
  IconAmbulance,
  IconLoader2,
  IconUnlink,
  IconUsers,
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
import { incidentsAPI, unitsAPI } from "@/lib/api";
import { useToast } from "@/lib/useToast";
import {
  canAssignUnit,
  canDetachUnit,
  isTerminalStatus,
} from "@/lib/incident-workflow";
import type { Incident, ResponseUnit } from "@/types";

type Props = {
  incident: Incident;
  disabled?: boolean;
  onUpdated: (updated: Incident) => void;
};

export default function AssignUnitControls({
  incident,
  disabled,
  onUpdated,
}: Props) {
  const { success, error: toastError } = useToast();
  const [busy, setBusy] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [units, setUnits] = useState<ResponseUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const canAssign = canAssignUnit(incident);
  const canDetach = canDetachUnit(incident);
  const terminal = isTerminalStatus(incident.status);

  useEffect(() => {
    if (!assignOpen) return;
    setLoadingUnits(true);
    unitsAPI.list({ available_only: true }).then((rows) => {
      setUnits(rows);
      setSelectedUnitId(rows[0]?.id ?? "");
      setLoadingUnits(false);
    });
  }, [assignOpen]);

  async function handleAssign() {
    if (!selectedUnitId) return;
    setBusy(true);
    const { data, error } = await incidentsAPI.assignUnit(
      incident.id,
      selectedUnitId
    );
    setBusy(false);
    if (error || !data) {
      toastError("Assign failed", error ?? "Could not assign unit.");
      return;
    }
    success(
      "Unit assigned",
      `${data.assigned_unit?.name ?? "Response unit"} is on this incident.`
    );
    onUpdated(data);
    setAssignOpen(false);
  }

  async function handleDetach() {
    setBusy(true);
    const { data, error } = await incidentsAPI.detachUnit(incident.id);
    setBusy(false);
    if (error || !data) {
      toastError("Detach failed", error ?? "Could not detach unit.");
      return;
    }
    success("Unit detached", "Response unit removed from incident.");
    onUpdated(data);
  }

  if (terminal && !incident.assigned_unit) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Response unit
      </p>

      {incident.assigned_unit ? (
        <div
          className="rounded-xl border px-3 py-2.5 text-sm"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{incident.assigned_unit.name}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {incident.assigned_unit.unit_type}
                {incident.assigned_unit.is_on_assignment
                  ? " · On assignment"
                  : ""}
              </p>
              {incident.unit_assigned_at && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Assigned {new Date(incident.unit_assigned_at).toLocaleString()}
                </p>
              )}
            </div>
            <IconAmbulance size={18} stroke={1.5} className="shrink-0 text-primary" />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No unit assigned.</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {canAssign && (
          <Button
            variant="outline"
            className="flex-1 gap-2 rounded-xl"
            disabled={disabled || busy}
            onClick={() => setAssignOpen(true)}
          >
            <IconUsers size={16} stroke={1.5} />
            Assign unit
          </Button>
        )}
        {canDetach && (
          <Button
            variant="outline"
            className="flex-1 gap-2 rounded-xl"
            disabled={disabled || busy}
            onClick={handleDetach}
          >
            {busy ? (
              <IconLoader2 size={16} stroke={1.5} className="animate-spin" />
            ) : (
              <IconUnlink size={16} stroke={1.5} />
            )}
            Detach unit
          </Button>
        )}
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign response unit</DialogTitle>
            <DialogDescription>
              Only available units are listed. The unit app handles en route,
              reached, and served updates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label className="text-xs">Unit</Label>
            {loadingUnits ? (
              <div className="flex justify-center py-6 text-muted-foreground">
                <IconLoader2 size={20} stroke={1.5} className="animate-spin" />
              </div>
            ) : units.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No available units. Create one under Response units or wait
                until a unit finishes its assignment.
              </p>
            ) : (
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.unit_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setAssignOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              disabled={busy || !selectedUnitId || units.length === 0}
              onClick={handleAssign}
            >
              {busy ? (
                <IconLoader2 size={16} stroke={1.5} className="animate-spin" />
              ) : (
                "Confirm assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
