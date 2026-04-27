"use client";

import { useEffect, useState } from "react";
import { Building2, Plus, Trash2, AlertTriangle, CheckCircle, X, MapPin, Phone, Mail, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Sidebar from "@/components/layout/Sidebar";
import { stationsAPI } from "@/lib/api";
import type { Station, StationType } from "@/types";

const typeBadgeStyles: Record<StationType, { backgroundColor: string; color: string }> = {
  police: { backgroundColor: "var(--station-police-muted)", color: "var(--station-police)" },
  medical: { backgroundColor: "var(--station-medical-muted)", color: "var(--station-medical)" },
  fire: { backgroundColor: "var(--station-fire-muted)", color: "var(--station-fire)" },
};

const typeColors: Record<StationType, string> = {
  police: "#7c3aed",
  medical: "#059669",
  fire: "#ef4444",
};

const emptyForm = {
  name: "",
  type: "police" as StationType,
  phone: "",
  email: "",
  address: "",
  city: "",
  latitude: "",
  longitude: "",
  capacity: "",
};

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; stationId: string | null; stationName: string }>({
    open: false, stationId: null, stationName: "",
  });
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; type: "success" | "error"; message: string }>({
    open: false, type: "success", message: "",
  });

  async function fetchStations() {
    setLoading(true);
    const data = await stationsAPI.list();
    if (data) {
      const list = Array.isArray(data)
        ? data
        : ((data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.results ?? []) as Station[];
      setStations(list);
    }
    setLoading(false);
  }

  useEffect(() => { fetchStations(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name: form.name,
      type: form.type,
      phone: form.phone,
      email: form.email,
      address: form.address,
      city: form.city,
      latitude: parseFloat(form.latitude) || 0,
      longitude: parseFloat(form.longitude) || 0,
      capacity: parseInt(form.capacity, 10) || 0,
    };
    const result = await stationsAPI.create(payload);
    if (result) {
      setForm(emptyForm);
      setShowAddModal(false);
      await fetchStations();
      setAlertDialog({ open: true, type: "success", message: "Station created successfully!" });
    } else {
      setAlertDialog({ open: true, type: "error", message: "Failed to create station. Please try again." });
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteDialog({ open: false, stationId: null, stationName: "" });
    try {
      const success = await stationsAPI.delete(id);
      if (success) {
        setStations(prev => prev.filter(s => s.id !== id));
        setAlertDialog({ open: true, type: "success", message: "Station deleted successfully!" });
      } else {
        setAlertDialog({ open: true, type: "error", message: "Failed to delete station. Please check your permissions or try again." });
      }
    } catch {
      setAlertDialog({ open: true, type: "error", message: "An error occurred while deleting the station." });
    } finally {
      setDeletingId(null);
    }
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const accentColor = typeColors[form.type];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Stations</h1>
            <Badge variant="secondary" className="font-mono">{stations.length}</Badge>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Station
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-muted-foreground">Loading stations...</p>
        ) : stations.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No stations yet</p>
            <p className="text-sm text-muted-foreground">Create your first station to get started</p>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stations.map((station) => (
                  <TableRow key={station.id}>
                    <TableCell className="font-medium">{station.name}</TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={typeBadgeStyles[station.type]}
                      >
                        {station.type.charAt(0).toUpperCase() + station.type.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>{station.city}</TableCell>
                    <TableCell>{station.phone}</TableCell>
                    <TableCell className="font-mono">{station.capacity}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${station.is_active ? "animate-pulse" : ""}`}
                          style={{ backgroundColor: station.is_active ? "var(--chart-3)" : "var(--muted)" }}
                        />
                        <span className="text-sm">{station.is_active ? "Active" : "Inactive"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, stationId: station.id, stationName: station.name })}
                        disabled={deletingId === station.id}
                        className="gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        {deletingId === station.id ? "Deleting..." : "Delete"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>

      {/* ── Add Station Modal ── */}
      <Dialog open={showAddModal} onOpenChange={(open) => { setShowAddModal(open); if (!open) setForm(emptyForm); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {/* Colored header strip based on station type */}
          <div
            className="px-6 py-5 text-white"
            style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Add New Station</DialogTitle>
                <DialogDescription className="text-white/75 text-sm mt-0.5">
                  Fill in the details to register a new emergency station
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreate}>
            <div className="px-6 py-5 space-y-5">

              {/* Row 1: Name + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Station Name</Label>
                  <Input id="name" placeholder="e.g. Addis Ababa Central" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="type" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Station Type</Label>
                  <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="police">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-purple-600 inline-block" /> Police
                        </span>
                      </SelectItem>
                      <SelectItem value="medical">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" /> Medical
                        </span>
                      </SelectItem>
                      <SelectItem value="fire">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Fire
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Phone + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone
                  </Label>
                  <Input id="phone" placeholder="+251..." value={form.phone} onChange={(e) => updateField("phone", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <Input id="email" type="email" placeholder="station@eras.gov.et" value={form.email} onChange={(e) => updateField("email", e.target.value)} required />
                </div>
              </div>

              {/* Row 3: Address + City */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Address
                  </Label>
                  <Input id="address" placeholder="Street address" value={form.address} onChange={(e) => updateField("address", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">City</Label>
                  <Input id="city" placeholder="e.g. Addis Ababa" value={form.city} onChange={(e) => updateField("city", e.target.value)} required />
                </div>
              </div>

              {/* Row 4: Lat + Lng + Capacity */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="latitude" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latitude</Label>
                  <Input id="latitude" type="number" step="any" placeholder="9.0300" value={form.latitude} onChange={(e) => updateField("latitude", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="longitude" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Longitude</Label>
                  <Input id="longitude" type="number" step="any" placeholder="38.7400" value={form.longitude} onChange={(e) => updateField("longitude", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="capacity" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Capacity
                  </Label>
                  <Input id="capacity" type="number" placeholder="50" value={form.capacity} onChange={(e) => updateField("capacity", e.target.value)} required />
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/30 gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setForm(emptyForm); }}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                style={{ backgroundColor: accentColor }}
                className="text-white hover:opacity-90 gap-2"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Station
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Station
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteDialog.stationName}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, stationId: null, stationName: "" })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteDialog.stationId && handleDelete(deleteDialog.stationId)}>
              Delete Station
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <Dialog open={alertDialog.open} onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {alertDialog.type === "success" ? (
                <><CheckCircle className="h-5 w-5 text-green-600" /> Success</>
              ) : (
                <><X className="h-5 w-5 text-destructive" /> Error</>
              )}
            </DialogTitle>
            <DialogDescription>{alertDialog.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAlertDialog({ ...alertDialog, open: false })}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
