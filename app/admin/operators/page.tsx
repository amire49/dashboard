"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, Plus, Trash2, KeyRound, Copy, Check, AlertTriangle, X, Loader2, ArrowRightLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/dashboard/EmptyState";
import { operatorsAPI, stationsAPI } from "@/lib/api";
import { useToast } from "@/lib/useToast";
import type { Operator, Station } from "@/types";

function DeleteConfirm({
  operator,
  onCancel,
  onConfirm,
  deleting,
  error,
}: {
  operator: Operator;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
  error: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center justify-end gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">
        <div className="mr-1 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          <span className="text-caption font-medium text-destructive">
            Delete <span className="font-bold">{operator.full_name}</span>?
          </span>
        </div>
        <button
          onClick={onCancel}
          disabled={deleting}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-caption font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onConfirm}
          disabled={deleting}
          className="gap-1.5 text-caption"
        >
          {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          {deleting ? "Deleting..." : "Yes, delete"}
        </Button>
      </div>
      {error && (
        <p className="text-caption font-medium text-destructive">
          Failed to delete. Check permissions and try again.
        </p>
      )}
    </div>
  );
}

export default function OperatorsPage() {
  const { success, error: toastError } = useToast();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [reassignOperator, setReassignOperator] = useState<Operator | null>(null);
  const [reassignStationId, setReassignStationId] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", station_id: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    const res = await operatorsAPI.list();
    if (res) setOperators(res.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOperators();
    stationsAPI.list().then(res => {
      if (res) setStations(Array.isArray(res) ? res : []);
    });
  }, [fetchOperators]);

  useEffect(() => {
    if (!tempPassword) return;
    const t = setTimeout(() => setTempPassword(null), 30000);
    return () => clearTimeout(t);
  }, [tempPassword]);

  function formatCreateError(message: string): string {
    const lower = message.toLowerCase();
    if (
      lower.includes("inactive") &&
      (lower.includes("station") || lower.includes("station_id"))
    ) {
      return "The selected station is inactive. Activate it under Stations, or choose another active station.";
    }
    if (lower.includes("station") && (lower.includes("invalid") || lower.includes("not found"))) {
      return "The selected station is not valid. Choose another station from the list.";
    }
    return message;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    const selected = stations.find((s) => s.id === form.station_id);
    if (selected && selected.is_active === false) {
      const msg = formatCreateError("station_id: inactive station");
      setCreateError(msg);
      toastError("Inactive station", msg);
      return;
    }

    if (!form.station_id) {
      const msg = "Please select a station.";
      setCreateError(msg);
      toastError("Station required", msg);
      return;
    }

    setSubmitting(true);
    const { data, error } = await operatorsAPI.create(form);
    setSubmitting(false);

    if (data) {
      const createdName = form.full_name.trim() || data.full_name || "Operator";
      setTempPassword(data.temporary_password);
      setForm({ full_name: "", phone: "", email: "", station_id: "" });
      setCreateError(null);
      setShowForm(false);
      success("Operator created", `${createdName} was added successfully.`);
      await fetchOperators();
      return;
    }

    const msg = formatCreateError(error ?? "Could not create operator. Please try again.");
    setCreateError(msg);
    toastError("Could not create operator", msg);
  }

  async function handleResetPassword(id: string) {
    const result = await operatorsAPI.resetPassword(id);
    if (result) setTempPassword(result.temporary_password);
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    setDeleteError(false);
    const ok = await operatorsAPI.delete(id);
    setDeleting(false);
    if (ok) {
      setConfirmDeleteId(null);
      await fetchOperators();
    } else {
      setDeleteError(true);
      setTimeout(() => setDeleteError(false), 4000);
    }
  }

  async function copyPassword() {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const activeStations = stations.filter((s) => s.is_active ?? true);

  function reassignTargetsFor(op: Operator) {
    return activeStations.filter((s) => s.id !== op.station?.id);
  }

  function openReassign(op: Operator) {
    setReassignOperator(op);
    setReassignStationId("");
  }

  async function handleReassign(e: React.FormEvent) {
    e.preventDefault();
    if (!reassignOperator || !reassignStationId) return;

    if (reassignOperator.station?.id === reassignStationId) {
      toastError("Same station", "Choose a different active station.");
      return;
    }

    setReassigning(true);
    const { data, error } = await operatorsAPI.reassignStation(reassignOperator.id, {
      station_id: reassignStationId,
    });
    setReassigning(false);

    if (error || !data) {
      toastError(
        "Reassign failed",
        formatCreateError(error ?? "Could not reassign operator.")
      );
      return;
    }

    success(
      "Station updated",
      `${reassignOperator.full_name} is now assigned to ${data.station?.name ?? "the new station"}.`
    );
    setReassignOperator(null);
    setReassignStationId("");
    await fetchOperators();
  }

  return (
    <AppShell role="admin">
      <PageHeader
        icon={Users}
        title="Operators"
        subtitle={`${operators.length} total`}
        actions={
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Operator
          </Button>
        }
      />

      {tempPassword && (
        <Alert className="mb-6 rounded-xl border-warning/40 bg-warning-muted">
          <KeyRound className="h-4 w-4 text-warning-foreground" />
          <AlertTitle className="font-semibold">Temporary Password</AlertTitle>
          <AlertDescription className="mt-1 flex items-center gap-3">
            <code className="rounded-lg bg-warning-muted px-2.5 py-1 text-data font-bold">
              {tempPassword}
            </code>
            <Button variant="outline" size="sm" onClick={copyPassword} className="gap-1.5">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setCreateError(null);
            setForm({ full_name: "", phone: "", email: "", station_id: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-section-title">New Operator</DialogTitle>
            <DialogDescription className="text-caption">
              Add a new operator to the system. They will receive a temporary password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { id: "full_name", label: "Full Name", type: "text" },
                { id: "phone", label: "Phone", type: "text" },
              ].map(f => (
                <div key={f.id} className="space-y-2">
                  <Label htmlFor={f.id} className="text-label">{f.label}</Label>
                  <Input
                    id={f.id}
                    type={f.type}
                    value={form[f.id as keyof typeof form]}
                    onChange={e => updateField(f.id, e.target.value)}
                    className="h-9 rounded-lg"
                    required
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-label">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => updateField("email", e.target.value)}
                className="h-9 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-label">Station</Label>
              {activeStations.length === 0 ? (
                <p className="text-caption">
                  No active stations available. Activate a station before adding an operator.
                </p>
              ) : (
                <Select
                  value={form.station_id}
                  onValueChange={(v) => {
                    setCreateError(null);
                    updateField("station_id", v);
                  }}
                  required
                >
                  <SelectTrigger className="h-9 rounded-lg">
                    <SelectValue placeholder="Select an active station" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {activeStations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {createError && (
              <Alert variant="destructive" className="rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-body font-semibold">Could not create operator</AlertTitle>
                <AlertDescription className="text-caption">{createError}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setForm({ full_name: "", phone: "", email: "", station_id: "" });
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || activeStations.length === 0}
                className="gap-2"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Creating..." : "Create Operator"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reassignOperator !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReassignOperator(null);
            setReassignStationId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-section-title">Reassign station</DialogTitle>
            <DialogDescription className="text-caption">
              Move {reassignOperator?.full_name} to a different active station.
            </DialogDescription>
          </DialogHeader>
          {reassignOperator && (
            <form onSubmit={handleReassign} className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-body">
                <p className="text-label">Current station</p>
                <p className="mt-1 font-medium">
                  {reassignOperator.station?.name ?? "Unassigned"}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-label">New station</Label>
                {reassignTargetsFor(reassignOperator).length === 0 ? (
                  <p className="text-caption">No other active stations available.</p>
                ) : (
                  <Select
                    value={reassignStationId}
                    onValueChange={setReassignStationId}
                    required
                  >
                    <SelectTrigger className="h-9 rounded-lg">
                      <SelectValue placeholder="Select a station" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {reassignTargetsFor(reassignOperator).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setReassignOperator(null);
                    setReassignStationId("");
                  }}
                  disabled={reassigning}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    reassigning ||
                    reassignTargetsFor(reassignOperator).length === 0 ||
                    !reassignStationId
                  }
                  className="gap-2"
                >
                  {reassigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {reassigning ? "Reassigning…" : "Reassign"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {loading ? (
        <Card className="overflow-hidden rounded-xl border py-0 shadow-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
              <div className="flex gap-2">
                <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
                <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          ))}
        </Card>
      ) : operators.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No operators yet"
          description="Create your first operator to get started"
          action={
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Operator
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden rounded-xl border py-0 shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-label">Operator</TableHead>
                <TableHead className="text-label">Contact</TableHead>
                <TableHead className="text-label">Station</TableHead>
                <TableHead className="text-label">Status</TableHead>
                <TableHead className="text-right text-label">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.map(op => (
                <TableRow
                  key={op.id}
                  className={`transition-colors ${confirmDeleteId === op.id ? "bg-destructive/5" : ""}`}
                >
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-caption font-bold text-primary">
                        {op.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-body font-semibold">{op.full_name}</p>
                    </div>
                  </TableCell>

                  <TableCell className="py-3.5">
                    <p className="text-body">{op.email}</p>
                    <p className="text-data text-caption">{op.phone}</p>
                  </TableCell>

                  <TableCell className="py-3.5 text-body">
                    {op.station?.name ?? (
                      <span className="italic text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3.5">
                    <Badge variant={op.is_active ? "success" : "secondary"} className="gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full bg-current ${op.is_active ? "animate-pulse" : ""}`} />
                      {op.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-3.5">
                    {confirmDeleteId === op.id ? (
                      <DeleteConfirm
                        operator={op}
                        onCancel={() => { setConfirmDeleteId(null); setDeleteError(false); }}
                        onConfirm={() => handleDelete(op.id)}
                        deleting={deleting}
                        error={deleteError}
                      />
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-caption"
                          onClick={() => openReassign(op)}
                          disabled={reassignTargetsFor(op).length === 0}
                          title={
                            reassignTargetsFor(op).length === 0
                              ? "No other active stations"
                              : "Move to another station"
                          }
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          Reassign
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-caption"
                          onClick={() => handleResetPassword(op.id)}
                        >
                          <KeyRound className="h-3 w-3" />
                          Reset Password
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-destructive/30 text-caption text-destructive hover:bg-destructive/5"
                          onClick={() => setConfirmDeleteId(op.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </AppShell>
  );
}
