"use client";

import { useEffect, useState } from "react";
import {
  IconBuildingSkyscraper,
  IconPlus,
  IconTrash,
  IconAdjustmentsHorizontal,
  IconSearch,
  IconShield,
  IconStethoscope,
  IconFlame,
  IconCircleCheck,
  IconCircleX,
  IconUsers,
  IconPhone,
  IconMapPin,
  IconX,
  IconCheck,
  IconMail,
  IconEdit,
  IconLoader2,
} from "@tabler/icons-react";
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
import Sidebar from "@/components/layout/Sidebar";
import { stationsAPI } from "@/lib/api";
import { useToast } from "@/lib/useToast";
import type { Station, StationType } from "@/types";

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                <IconBuildingSkyscraper size={28} stroke={1.5} className="text-red-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">Stations</h1>
                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-sm font-mono">
                    {stations.length}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Showing {filteredStations.length} of {stations.length} stations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter Dropdown */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}>
                <SelectTrigger className="w-40">
                  <IconAdjustmentsHorizontal size={16} stroke={1.5} className="mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Add Station Button */}
              <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2 bg-red-600 hover:bg-red-700">
                <IconPlus size={16} stroke={1.5} />
                Add Station
              </Button>
            </div>
          </div>
        </div>

        {/* Add Station Form - Slide Down */}
        {showAddForm && (
          <Card className="mb-6 border-0 shadow-md">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">New Station</h2>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setForm(emptyForm);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <IconX size={18} stroke={1.5} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Row 1: Name (full width) */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3 space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <Label htmlFor="type" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Type
                    </Label>
                    <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="police">
                          <span className="flex items-center gap-2">
                            <IconShield size={14} stroke={1.5} className="text-blue-600" />
                            Police
                          </span>
                        </SelectItem>
                        <SelectItem value="medical">
                          <span className="flex items-center gap-2">
                            <IconStethoscope size={14} stroke={1.5} className="text-green-600" />
                            Medical
                          </span>
                        </SelectItem>
                        <SelectItem value="fire">
                          <span className="flex items-center gap-2">
                            <IconFlame size={14} stroke={1.5} className="text-red-600" />
                            Fire
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <Label htmlFor="capacity" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <Label htmlFor="address" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <Label htmlFor="latitude" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <Label htmlFor="longitude" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                  <Button type="submit" disabled={submitting} className="gap-2 bg-red-600 hover:bg-red-700">
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <IconCheck size={16} stroke={1.5} />
                        Create Station
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filter & Search Bar */}
        <Card className="mb-4 border-0 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <IconSearch size={18} stroke={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search stations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Active/Inactive Toggle Pills */}
              <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === "all" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === "active" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter("inactive")}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === "inactive" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Inactive
                </button>
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
                <button
                  onClick={() => setTypeFilter("all")}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    typeFilter === "all" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setTypeFilter("police")}
                  className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    typeFilter === "police" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <IconShield size={14} stroke={1.5} />
                  Police
                </button>
                <button
                  onClick={() => setTypeFilter("medical")}
                  className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    typeFilter === "medical" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <IconStethoscope size={14} stroke={1.5} />
                  Medical
                </button>
                <button
                  onClick={() => setTypeFilter("fire")}
                  className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    typeFilter === "fire" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <IconFlame size={14} stroke={1.5} />
                  Fire
                </button>
              </div>

              <span className="text-sm text-muted-foreground">{filteredStations.length} results</span>
            </div>
          </CardContent>
        </Card>

        {/* Stations Table */}
        {loading ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">City</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Phone</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Capacity</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Actions</TableHead>
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
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/30">
                <IconBuildingSkyscraper size={48} stroke={1} className="text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">No stations found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Add your first station to get started"}
              </p>
              {!searchQuery && typeFilter === "all" && statusFilter === "all" && (
                <Button onClick={() => setShowAddForm(true)} className="mt-4 gap-2 bg-red-600 hover:bg-red-700">
                  <IconPlus size={16} stroke={1.5} />
                  Add Station
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-xl border-0 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">City</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Phone</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Capacity</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Actions</TableHead>
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
                        <p className="text-xs font-mono text-muted-foreground">{String(station.id).slice(0, 8)}</p>
                      </div>
                    </TableCell>

                    {/* TYPE */}
                    <TableCell>
                      {station.type === "police" && (
                        <Badge className="gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          <IconShield size={14} stroke={1.5} />
                          Police
                        </Badge>
                      )}
                      {station.type === "medical" && (
                        <Badge className="gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                          <IconStethoscope size={14} stroke={1.5} />
                          Medical
                        </Badge>
                      )}
                      {station.type === "fire" && (
                        <Badge className="gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                          <IconFlame size={14} stroke={1.5} />
                          Fire
                        </Badge>
                      )}
                    </TableCell>

                    {/* CITY */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconMapPin size={14} stroke={1.5} className="text-muted-foreground" />
                        <span className="text-sm">{station.city}</span>
                      </div>
                    </TableCell>

                    {/* PHONE */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconPhone size={14} stroke={1.5} className="text-muted-foreground" />
                        <span className="font-mono text-sm">{station.phone}</span>
                      </div>
                    </TableCell>

                    {/* CAPACITY */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconUsers size={14} stroke={1.5} className="text-muted-foreground" />
                        <span className="font-mono font-medium">{station.capacity}</span>
                      </div>
                    </TableCell>

                    {/* STATUS */}
                    <TableCell>
                      {station.is_active ? (
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600"></span>
                          </span>
                          <span className="font-medium text-green-600">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                          <span className="text-gray-400">Inactive</span>
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
                          <IconEdit size={16} stroke={1.5} />
                        </Button>
                        {station.is_active ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title="Deactivate station"
                            onClick={() => handleToggleActive(station)}
                            disabled={togglingId === station.id}
                            className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                          >
                            {togglingId === station.id ? (
                              <IconLoader2 size={16} stroke={1.5} className="animate-spin" />
                            ) : (
                              <IconCircleX size={16} stroke={1.5} />
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
                            className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                          >
                            {togglingId === station.id ? (
                              <IconLoader2 size={16} stroke={1.5} className="animate-spin" />
                            ) : (
                              <IconCircleCheck size={16} stroke={1.5} />
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
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <IconTrash size={16} stroke={1.5} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination/Count */}
            <div className="border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {filteredStations.length} of {stations.length} stations
              </p>
            </div>
          </Card>
        )}
      </main>

      {/* Edit Station Dialog */}
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
              <IconEdit size={20} stroke={1.5} />
              Edit station
            </DialogTitle>
            <DialogDescription>
              Update details for {editingStation?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Phone
                </Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => updateEditField("phone", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
              <Button type="submit" disabled={editSubmitting} className="gap-2 bg-red-600 hover:bg-red-700">
                {editSubmitting ? (
                  <IconLoader2 size={16} stroke={1.5} className="animate-spin" />
                ) : (
                  <IconCheck size={16} stroke={1.5} />
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
              <IconTrash size={20} stroke={1.5} className="text-red-600" />
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
              <IconTrash size={16} stroke={1.5} />
              Delete Station
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
