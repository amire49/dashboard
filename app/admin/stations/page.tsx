"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Trash2,
  SlidersHorizontal,
  Search,
  CheckCircle,
  XCircle,
  Users,
  Phone,
  MapPin,
  X,
  Check,
  Pencil,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import FilterBar from "@/components/dashboard/FilterBar";
import EmptyState from "@/components/dashboard/EmptyState";
import CategoryBadge from "@/components/incidents/CategoryBadge";
import { stationsAPI } from "@/lib/api";
import { stationTypeStyle } from "@/lib/status-styles";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/useToast";
import type { Station, StationType } from "@/types";

function StationTypeOption({ type }: { type: StationType }) {
  const cfg = stationTypeStyle(type);
  const Icon = cfg.icon;

  return (
    <span className="flex items-center gap-2">
      <Icon className={cn("h-3.5 w-3.5", cfg.text)} strokeWidth={1.75} />
      {cfg.label}
    </span>
  );
}

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

function stationToForm(station: Station) {
  return {
    name: station.name,
    type: station.type,
    phone: station.phone,
    email: station.email,
    address: station.address,
    city: station.city,
    latitude: String(station.latitude ?? station.lat ?? ""),
    longitude: String(station.longitude ?? station.long ?? ""),
    capacity: String(station.capacity),
  };
}

function formToPayload(form: typeof emptyForm) {
  return {
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
}

export default function StationsPage() {
  const { success, error } = useToast();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | StationType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; stationId: string | null; stationName: string }>({
    open: false,
    stationId: null,
    stationName: "",
  });
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchStations();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data, error: apiError } = await stationsAPI.create(formToPayload(form));
    setSubmitting(false);
    if (data) {
      setForm(emptyForm);
      setShowAddForm(false);
      await fetchStations();
      success("Station Created", `${form.name} has been added successfully`);
    } else {
      error("Creation Failed", apiError ?? "Failed to create station. Please try again.");
    }
  }

  function openEdit(station: Station) {
    setEditingStation(station);
    setEditForm(stationToForm(station));
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStation) return;
    setEditSubmitting(true);
    const { data, error: apiError } = await stationsAPI.update(
      editingStation.id,
      formToPayload(editForm)
    );
    setEditSubmitting(false);
    if (data) {
      success("Station updated", `${data.name} was saved successfully.`);
      setEditingStation(null);
      setEditForm(emptyForm);
      await fetchStations();
    } else {
      error("Update failed", apiError ?? "Could not update station. Please try again.");
    }
  }

  async function handleToggleActive(station: Station) {
    const nextActive = !station.is_active;
    setTogglingId(station.id);
    const { data, error: apiError } = await stationsAPI.update(station.id, {
      is_active: nextActive,
    });
    setTogglingId(null);
    if (data) {
      success(
        nextActive ? "Station activated" : "Station deactivated",
        `${station.name} is now ${nextActive ? "active" : "inactive"}.`
      );
      await fetchStations();
    } else {
      error(
        nextActive ? "Activation failed" : "Deactivation failed",
        apiError ?? "Could not update station status."
      );
    }
  }

  function updateEditField(field: string, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteDialog({ open: false, stationId: null, stationName: "" });
    try {
      const success_result = await stationsAPI.delete(id);
      if (success_result) {
        setStations((prev) => prev.filter((s) => s.id !== id));
        success("Station Deleted", "Station has been removed successfully");
      } else {
        error("Deletion Failed", "Failed to delete station. Please check your permissions.");
      }
    } catch {
      error("Error", "An error occurred while deleting the station.");
    } finally {
      setDeletingId(null);
    }
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Client-side filtering
  const filteredStations = stations.filter((station) => {
    // Status filter
    if (statusFilter === "active" && !station.is_active) return false;
    if (statusFilter === "inactive" && station.is_active) return false;

    // Type filter
    if (typeFilter !== "all" && station.type !== typeFilter) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = station.name.toLowerCase().includes(query);
      const matchesCity = station.city.toLowerCase().includes(query);
      if (!matchesName && !matchesCity) return false;
    }

    return true;
  });

  return (
    <AppShell role="admin">
        <PageHeader
          icon={Building2}
          title="Stations"
          subtitle={
            <>
              <Badge variant="secondary" className="rounded-full font-mono">
                {stations.length}
              </Badge>
              <span>
                Showing {filteredStations.length} of {stations.length} stations
              </span>
            </>
          }
          actions={
            <>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}>
                <SelectTrigger className="w-40">
                  <SlidersHorizontal className="mr-2 h-4 w-4" strokeWidth={1.75} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
                <Plus className="h-4 w-4" strokeWidth={1.75} />
                Add Station
              </Button>
            </>
          }
        />

        {/* Add Station Form - Slide Down */}
        {showAddForm && (
          <Card className="mb-6 rounded-xl border py-0 shadow-card">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-section-title">New Station</h2>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setForm(emptyForm);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Row 1: Name (full width) */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3 space-y-1.5">
                    <Label htmlFor="name" className="text-label">
                      Station Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g. Addis Ababa Central Station"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Type, City, Phone */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="type" className="text-label">
                      Type
                    </Label>
                    <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="police">
                          <StationTypeOption type="police" />
                        </SelectItem>
                        <SelectItem value="medical">
                          <StationTypeOption type="medical" />
                        </SelectItem>
                        <SelectItem value="fire">
                          <StationTypeOption type="fire" />
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-label">
                      City
                    </Label>
                    <Input
                      id="city"
                      placeholder="e.g. Addis Ababa"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-label">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      placeholder="+251..."
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 3: Email, Capacity */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="email" className="text-label">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="station@eras.gov.et"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="capacity" className="text-label">
                      Capacity
                    </Label>
                    <Input
                      id="capacity"
                      type="number"
                      placeholder="50"
                      value={form.capacity}
                      onChange={(e) => updateField("capacity", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 4: Address (full width) */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3 space-y-1.5">
                    <Label htmlFor="address" className="text-label">
                      Address
                    </Label>
                    <Input
                      id="address"
                      placeholder="Street address"
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 5: Latitude, Longitude */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="latitude" className="text-label">
                      Latitude
                    </Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      placeholder="9.0300"
                      value={form.latitude}
                      onChange={(e) => updateField("latitude", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="longitude" className="text-label">
                      Longitude
                    </Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      placeholder="38.7400"
                      value={form.longitude}
                      onChange={(e) => updateField("longitude", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Buttons Row */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setForm(emptyForm);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="gap-2">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" strokeWidth={1.75} />
                        Create Station
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <FilterBar trailing={<span className="text-caption">{filteredStations.length} results</span>}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <Input
              placeholder="Search stations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
            {(["all", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-md px-3 py-1 text-caption font-medium capitalize transition-colors",
                  statusFilter === s ? "bg-background shadow-card" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
            <button
              onClick={() => setTypeFilter("all")}
              className={cn(
                "rounded-md px-3 py-1 text-caption font-medium transition-colors",
                typeFilter === "all" ? "bg-background shadow-card" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            {(["police", "medical", "fire"] as const).map((t) => {
              const cfg = stationTypeStyle(t);
              const TypeIcon = cfg.icon;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-3 py-1 text-caption font-medium transition-colors",
                    typeFilter === t ? "bg-background shadow-card" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TypeIcon className={cn("h-3.5 w-3.5", cfg.text)} strokeWidth={1.75} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </FilterBar>

        {/* Stations Table */}
        {loading ? (
          <Card className="rounded-xl border py-0 shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-label">Name</TableHead>
                    <TableHead className="text-label">Type</TableHead>
                    <TableHead className="text-label">City</TableHead>
                    <TableHead className="text-label">Phone</TableHead>
                    <TableHead className="text-label">Capacity</TableHead>
                    <TableHead className="text-label">Status</TableHead>
                    <TableHead className="text-label">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : filteredStations.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No stations found"
            description={
              searchQuery || typeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first station to get started"
            }
            action={
              !searchQuery && typeFilter === "all" && statusFilter === "all" ? (
                <Button onClick={() => setShowAddForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Station
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Card className="overflow-hidden rounded-xl border py-0 shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-label">Name</TableHead>
                  <TableHead className="text-label">Type</TableHead>
                  <TableHead className="text-label">City</TableHead>
                  <TableHead className="text-label">Phone</TableHead>
                  <TableHead className="text-label">Capacity</TableHead>
                  <TableHead className="text-label">Status</TableHead>
                  <TableHead className="text-label">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStations.map((station) => (
                  <TableRow
                    key={station.id}
                    className={`group border-b transition-colors hover:bg-muted/30 ${!station.is_active ? "opacity-60" : ""}`}
                  >
                    {/* NAME */}
                    <TableCell>
                      <div>
                        <p className="font-medium">{station.name}</p>
                        <p className="text-data text-caption">{String(station.id).slice(0, 8)}</p>
                      </div>
                    </TableCell>

                    {/* TYPE */}
                    <TableCell>
                      <CategoryBadge category={station.type} />
                    </TableCell>

                    {/* CITY */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                        <span className="text-sm">{station.city}</span>
                      </div>
                    </TableCell>

                    {/* PHONE */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                        <span className="text-data">{station.phone}</span>
                      </div>
                    </TableCell>

                    {/* CAPACITY */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                        <span className="text-data font-medium">{station.capacity}</span>
                      </div>
                    </TableCell>

                    {/* STATUS */}
                    <TableCell>
                      {station.is_active ? (
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                          </span>
                          <span className="font-medium text-success">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                          <span className="text-muted-foreground">Inactive</span>
                        </div>
                      )}
                    </TableCell>

                    {/* ACTIONS */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="Edit station"
                          onClick={() => openEdit(station)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                        {station.is_active ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title="Deactivate station"
                            onClick={() => handleToggleActive(station)}
                            disabled={togglingId === station.id}
                            className="h-8 w-8 p-0 text-warning-foreground hover:bg-warning-muted hover:text-warning-foreground"
                          >
                            {togglingId === station.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                            ) : (
                              <XCircle className="h-4 w-4" strokeWidth={1.75} />
                            )}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title="Activate station"
                            onClick={() => handleToggleActive(station)}
                            disabled={togglingId === station.id}
                            className="h-8 w-8 p-0 text-success hover:bg-success-muted hover:text-success"
                          >
                            {togglingId === station.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                            ) : (
                              <CheckCircle className="h-4 w-4" strokeWidth={1.75} />
                            )}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="Delete station"
                          onClick={() =>
                            setDeleteDialog({
                              open: true,
                              stationId: station.id,
                              stationName: station.name,
                            })
                          }
                          disabled={deletingId === station.id}
                          className="h-8 w-8 p-0 text-destructive hover:bg-status-routed-muted hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination/Count */}
            <div className="border-t px-4 py-3">
              <p className="text-caption">
                Showing {filteredStations.length} of {stations.length} stations
              </p>
            </div>
          </Card>
        )}
      <Dialog
        open={editingStation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingStation(null);
            setEditForm(emptyForm);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" strokeWidth={1.75} />
              Edit station
            </DialogTitle>
            <DialogDescription>
              Update details for {editingStation?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-label">
                Station name
              </Label>
              <Input
                value={editForm.name}
                onChange={(e) => updateEditField("name", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-label">
                  Type
                </Label>
                <Select
                  value={editForm.type}
                  onValueChange={(v) => updateEditField("type", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="police">Police</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="fire">Fire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-label">
                  City
                </Label>
                <Input
                  value={editForm.city}
                  onChange={(e) => updateEditField("city", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-label">
                  Phone
                </Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => updateEditField("phone", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-label">
                  Capacity
                </Label>
                <Input
                  type="number"
                  value={editForm.capacity}
                  onChange={(e) => updateEditField("capacity", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-label">
                Email
              </Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => updateEditField("email", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-label">
                Address
              </Label>
              <Input
                value={editForm.address}
                onChange={(e) => updateEditField("address", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-label">
                  Latitude
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={editForm.latitude}
                  onChange={(e) => updateEditField("latitude", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-label">
                  Longitude
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={editForm.longitude}
                  onChange={(e) => updateEditField("longitude", e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingStation(null);
                  setEditForm(emptyForm);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting} className="gap-2">
                {editSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                ) : (
                  <Check className="h-4 w-4" strokeWidth={1.75} />
                )}
                Save changes
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
              <Trash2 className="h-5 w-5 text-destructive" strokeWidth={1.75} />
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
            <Button
              variant="destructive"
              onClick={() => deleteDialog.stationId && handleDelete(deleteDialog.stationId)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              Delete Station
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
