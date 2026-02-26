"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Plus, Trash2, KeyRound, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import Sidebar from "@/components/layout/Sidebar";
import { operatorsAPI, stationsAPI } from "@/lib/api";
import type { Operator, Station } from "@/types";

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    station_id: "",
  });

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    const res = await operatorsAPI.list();
    if (res) {
      setOperators(res.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOperators();
    stationsAPI.list().then((res) => {
      if (res) {
        const list = Array.isArray(res) ? res : [];
        setStations(list);
      }
    });
  }, [fetchOperators]);

  useEffect(() => {
    if (!tempPassword) return;
    const timeout = setTimeout(() => setTempPassword(null), 30000);
    return () => clearTimeout(timeout);
  }, [tempPassword]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await operatorsAPI.create(form);
    if (result) {
      setTempPassword(result.temporary_password);
      setForm({ full_name: "", phone: "", email: "", station_id: "" });
      setShowForm(false);
      await fetchOperators();
    }
    setSubmitting(false);
  }

  async function handleResetPassword(id: string) {
    const result = await operatorsAPI.resetPassword(id);
    if (result) {
      setTempPassword(result.temporary_password);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this operator?")) return;
    await operatorsAPI.delete(id);
    await fetchOperators();
  }

  async function copyPassword() {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-auto bg-background p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Operators</h1>
            <Badge variant="secondary" className="font-mono">
              {operators.length}
            </Badge>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Operator
          </Button>
        </div>

        {/* Temporary Password Alert */}
        {tempPassword && (
          <Alert
            className="mb-6 border-border"
            style={{
              backgroundColor: "color-mix(in oklch, var(--chart-4) 15%, transparent)",
              borderColor: "var(--chart-4)",
            }}
          >
            <KeyRound className="h-4 w-4" style={{ color: "var(--chart-4)" }} />
            <AlertTitle className="font-semibold">
              Temporary Password
            </AlertTitle>
            <AlertDescription className="flex items-center gap-3">
              <code
                className="rounded px-2 py-1 font-mono text-sm font-bold"
                style={{
                  backgroundColor: "color-mix(in oklch, var(--chart-4) 25%, transparent)",
                  color: "var(--foreground)",
                }}
              >
                {tempPassword}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyPassword}
                className="gap-1"
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

        {/* Add Operator Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>New Operator</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={form.full_name}
                      onChange={(e) => updateField("full_name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="station_id">Station</Label>
                    <Select
                      value={form.station_id}
                      onValueChange={(v) => updateField("station_id", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a station" />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map((station) => (
                          <SelectItem key={station.id} value={station.id}>
                            {station.name} ({station.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setForm({
                        full_name: "",
                        phone: "",
                        email: "",
                        station_id: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Operator"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-muted-foreground">Loading operators...</p>
        ) : operators.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No operators yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first operator to get started
            </p>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operators.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-medium">
                      {op.full_name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{op.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {op.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {op.station?.name ?? (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            op.is_active ? "animate-pulse" : ""
                          }`}
                          style={{
                            backgroundColor: op.is_active
                              ? "var(--chart-3)"
                              : "var(--muted)",
                          }}
                        />
                        <span className="text-sm">
                          {op.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(op.id)}
                          className="gap-1"
                        >
                          <KeyRound className="h-3 w-3" />
                          Reset Password
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(op.id)}
                          className="gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </div>
  );
}
