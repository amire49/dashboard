"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { UserCheck, Search, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import FilterBar from "@/components/dashboard/FilterBar";
import EmptyState from "@/components/dashboard/EmptyState";
import { citizensAPI } from "@/lib/api";
import type { Citizen, KycStatus } from "@/types";
const KYC_VARIANTS: Record<KycStatus, { variant: "success" | "warning" | "destructive" | "secondary"; label: string }> = {
  approved: { variant: "success", label: "Approved" },
  pending: { variant: "warning", label: "Pending" },
  rejected: { variant: "destructive", label: "Rejected" },
  not_submitted: { variant: "secondary", label: "Not Submitted" },
};

function KycBadge({ status }: { status: KycStatus }) {
  const cfg = KYC_VARIANTS[status] ?? KYC_VARIANTS.not_submitted;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function CitizensPage() {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState<KycStatus | "all">("all");

  useEffect(() => {
    citizensAPI.list().then(res => { setCitizens(res); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    return citizens
      .filter(c => kycFilter === "all" || c.kyc_status === kycFilter)
      .filter(c => {
        const q = search.toLowerCase();
        return !q || c.full_name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q);
      });
  }, [citizens, kycFilter, search]);

  return (
    <AppShell role="admin">
      <PageHeader
        icon={UserCheck}
        title="Citizens"
        subtitle={`${citizens.length} registered`}
      />

      <FilterBar
        trailing={
          <span className="text-caption">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        }
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 w-56 rounded-lg pl-8 text-caption"
          />
        </div>
        <Select value={kycFilter} onValueChange={v => setKycFilter(v as KycStatus | "all")}>
          <SelectTrigger className="h-8 w-44 rounded-lg text-caption">
            <SelectValue placeholder="KYC Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All KYC Statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="not_submitted">Not Submitted</SelectItem>
          </SelectContent>
        </Select>
        {(search || kycFilter !== "all") && (
          <button
            onClick={() => { setSearch(""); setKycFilter("all"); }}
            className="rounded-lg px-2.5 py-1 text-caption transition-colors hover:bg-muted hover:text-foreground"
          >
            Clear
          </button>
        )}
      </FilterBar>

      <Card className="overflow-hidden rounded-xl border py-0 shadow-card">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="text-section-title">Citizen List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No citizens found"
              description="Try adjusting your filters"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-label">Citizen</TableHead>
                  <TableHead className="text-label">Phone</TableHead>
                  <TableHead className="text-label">Email</TableHead>
                  <TableHead className="text-label">KYC Status</TableHead>
                  <TableHead className="text-label">Joined</TableHead>
                  <TableHead className="w-10 text-label" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id} className="group cursor-pointer transition-colors hover:bg-muted/40">
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-caption font-bold text-primary">
                          {c.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-body font-semibold">{c.full_name}</p>
                          {!c.is_active && <p className="text-caption">Inactive</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 text-data">{c.phone}</TableCell>
                    <TableCell className="py-3.5 text-body text-muted-foreground">{c.email}</TableCell>
                    <TableCell className="py-3.5"><KycBadge status={c.kyc_status} /></TableCell>
                    <TableCell className="py-3.5 text-body text-muted-foreground">{fmt(c.joined_at || c.created_at)}</TableCell>
                    <TableCell className="py-3.5">
                      <Link href={`/admin/citizens/${c.id}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
