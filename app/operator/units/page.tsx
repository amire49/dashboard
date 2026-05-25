"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Truck,
  Plus,
  Trash2,
  KeyRound,
  Copy,
  Check,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import EmptyState from "@/components/dashboard/EmptyState";
import { unitsAPI } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/lib/useToast";
import type { ResponseUnit, ResponseUnitType } from "@/types";

const emptyForm = {
  name: "",
  unit_type: "team" as ResponseUnitType,
  phone: "",
  email: "",
  full_name: "",
  password: "",
  notes: "",
};

export default function OperatorUnitsPage() {
  const { checking } = useAuth("operator");
  const { success, error: toastError } = useToast();

  const [units, setUnits] = useState<ResponseUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [actingUnitId, setActingUnitId] = useState<string | null>(null);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    const rows = await unitsAPI.list({ include_inactive: includeInactive });
    setUnits(rows);
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => {
    if (checking) return;
    fetchUnits();
  }, [checking, fetchUnits]);

  useEffect(() => {
    if (!tempPassword) return;
    const t = setTimeout(() => setTempPassword(null), 30_000);
    return () => clearTimeout(t);
  }, [tempPassword]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await unitsAPI.create({
      name: form.name,
      unit_type: form.unit_type,
      phone: form.phone,
      email: form.email,
      full_name: form.full_name || form.name,
      ...(form.password ? { password: form.password } : {}),
      notes: form.notes,
    });
    setSubmitting(false);

    if (error || !data) {
      toastError("Create failed", error ?? "Could not create unit.");
      return;
    }

    if (data.temporary_password) {
      setTempPassword(data.temporary_password);
    }
    success("Unit created", `${data.name} can log in with their phone number.`);
    setForm(emptyForm);
    setShowForm(false);
    await fetchUnits();
  }

  async function handleDeactivate(unit: ResponseUnit) {
    if (unit.is_on_assignment) {
      toastError(
        "Cannot deactivate",
        "Detach this unit from its active incident first."
      );
      return;
    }
    setActingUnitId(unit.id);
    const { ok, error } = await unitsAPI.deactivate(unit.id);
    setActingUnitId(null);
    if (ok) {
      success("Unit deactivated");
      await fetchUnits();
    } else {
      toastError("Deactivate failed", error ?? "Could not deactivate unit.");
    }
  }

  async function handleReactivate(unit: ResponseUnit) {
    setActingUnitId(unit.id);
    const { ok, error } = await unitsAPI.reactivate(unit.id);
    setActingUnitId(null);
    if (ok) {
      success("Unit reactivated", `${unit.name} is active and can be assigned again.`);
      await fetchUnits();
    } else {
      toastError("Reactivate failed", error ?? "Could not reactivate unit.");
    }
  }

  async function copyPassword() {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (checking) {
    return (
      <AppShell role="operator">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="operator">
      <PageHeader
        icon={Truck}
        title="Response units"
        subtitle={`${units.length} at your station`}
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded"
              />
              Show inactive
            </label>
            <Button onClick={() => setShowForm(true)} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Add unit
            </Button>
          </>
        }
      />

      {tempPassword && (
        <Alert className="mb-6 rounded-xl border border-warning/40 bg-warning-muted">
          <KeyRound className="h-4 w-4 text-warning-foreground" />
          <AlertTitle className="font-semibold">Temporary password</AlertTitle>
          <AlertDescription className="mt-1 flex items-center gap-3">
            <code className="rounded-lg px-2.5 py-1 font-mono text-sm font-bold">
              {tempPassword}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={copyPassword}
              className="gap-1.5 rounded-lg"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>New response unit</DialogTitle>
            <DialogDescription>
              Creates a field login for your station. Password is optional;
              one will be generated if omitted.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase">Unit name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase">Type</Label>
                <Select
                  value={form.unit_type}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      unit_type: v as ResponseUnitType,
                    }))
                  }
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="rounded-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="rounded-lg"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase">
                Login full name (optional)
              </Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="rounded-lg"
                placeholder={form.name || "Same as unit name"}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase">
                Password (optional, min 6)
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="rounded-lg"
                minLength={6}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2 rounded-lg">
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Creating…" : "Create unit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PageSection title="Units">
        <Card className="overflow-hidden rounded-xl border shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : units.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No response units"
                description="Add a unit to assign field teams to incidents."
                action={
                  <Button onClick={() => setShowForm(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add unit
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-semibold">{u.name}</TableCell>
                      <TableCell className="capitalize">{u.unit_type}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {u.login_phone ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.is_active === false ? (
                            <Badge variant="secondary">Inactive</Badge>
                          ) : (
                            <Badge className="border-success/20 bg-success-muted text-success">
                              Active
                            </Badge>
                          )}
                          {u.is_on_assignment && (
                            <Badge variant="outline">On assignment</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {u.is_active === false ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 rounded-lg"
                            disabled={actingUnitId === u.id}
                            onClick={() => handleReactivate(u)}
                          >
                            {actingUnitId === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 rounded-lg text-destructive"
                            disabled={actingUnitId === u.id || u.is_on_assignment}
                            title={
                              u.is_on_assignment
                                ? "Detach from active incident before deactivating"
                                : undefined
                            }
                            onClick={() => handleDeactivate(u)}
                          >
                            {actingUnitId === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            Deactivate
                          </Button>
                        )}
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
