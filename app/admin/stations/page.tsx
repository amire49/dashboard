"use client";

import { useEffect, useState } from "react";
import { Building2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

const typeBadgeStyles: Record<
  StationType,
  { backgroundColor: string; color: string }
> = {
  police: {
    backgroundColor: "var(--station-police-muted)",
    color: "var(--station-police)",
  },
  medical: {
    backgroundColor: "var(--station-medical-muted)",
    color: "var(--station-medical)",
  },
  fire: {
    backgroundColor: "var(--station-fire-muted)",
    color: "var(--station-fire)",
  },
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function fetchStations() {
    setLoading(true);
    const data = await stationsAPI.list();
    if (data) {
      const list = Array.isArray(data)
        ? data
        : ((data as Record<string, unknown>)?.data ??
            (data as Record<string, unknown>)?.results ??
            []) as Station[];
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
      setShowForm(false);
      await fetchStations();
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this station?")) return;
    await stationsAPI.delete(id);
    await fetchStations();
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
            <h1 className="text-2xl font-bold">Stations</h1>
            <Badge variant="secondary" className="font-mono">
              {stations.length}
            </Badge>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Station
          </Button>
        </div>

        {/* Add Station Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>New Station</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => updateField("type", v)}
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
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={(e) => updateField("latitude", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={form.longitude}
                      onChange={(e) => updateField("longitude", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={form.capacity}
                      onChange={(e) => updateField("capacity", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setForm(emptyForm);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Station"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-muted-foreground">Loading stations...</p>
        ) : stations.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No stations yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first station to get started
            </p>
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
                    <TableCell className="font-medium">
                      {station.name}
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={typeBadgeStyles[station.type]}
                      >
                        {station.type.charAt(0).toUpperCase() +
                          station.type.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>{station.city}</TableCell>
                    <TableCell>{station.phone}</TableCell>
                    <TableCell className="font-mono">
                      {station.capacity}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            station.is_active ? "animate-pulse" : ""
                          }`}
                          style={{
                            backgroundColor: station.is_active
                              ? "var(--chart-3)"
                              : "var(--muted)",
                          }}
                        />
                        <span className="text-sm">
                          {station.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(station.id)}
                        className="gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
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
