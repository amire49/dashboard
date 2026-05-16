"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { UserCheck, Filter, Search, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Sidebar from "@/components/layout/Sidebar";
import { citizensAPI } from "@/lib/api";
import type { Citizen, KycStatus } from "@/types";

const KYC_COLORS: Record<KycStatus, { bg: string; text: string; label: string }> = {
  approved:      { bg: "color-mix(in oklch, var(--chart-3) 12%, transparent)", text: "var(--chart-3)",  label: "Approved" },
  pending:       { bg: "color-mix(in oklch, var(--chart-4) 12%, transparent)", text: "var(--chart-4)",  label: "Pending" },
  rejected:      { bg: "#ef444412",                                             text: "#ef4444",         label: "Rejected" },
  not_submitted: { bg: "var(--muted)",                                          text: "var(--muted-foreground)", label: "Not Submitted" },
};

function KycBadge({ status }: { status: KycStatus }) {
  const cfg = KYC_COLORS[status] ?? KYC_COLORS.not_submitted;
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-y-auto bg-background p-6">

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "color-mix(in oklch, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ letterSpacing: "-0.03em" }}>Citizens</h1>
            <p className="text-sm text-muted-foreground">{citizens.length} registered</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4 border-0 shadow-sm rounded-xl">
          <CardContent className="flex flex-wrap items-center gap-3 p-3.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 w-56 rounded-lg pl-8 text-xs"
              />
            </div>
            <Select value={kycFilter} onValueChange={v => setKycFilter(v as KycStatus | "all")}>
              <SelectTrigger className="h-8 w-44 rounded-lg text-xs"><SelectValue placeholder="KYC Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="not_submitted">Not Submitted</SelectItem>
              </SelectContent>
            </Select>
            {(search || kycFilter !== "all") && (
              <button onClick={() => { setSearch(""); setKycFilter("all"); }}
                className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                Clear
              </button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <CardTitle className="text-base">Citizen List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-0">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
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
              <div className="flex flex-col items-center justify-center py-20">
                <UserCheck className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium">No citizens found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow style={{ backgroundColor: "var(--muted)" }}>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Citizen</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Phone</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Email</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">KYC Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Joined</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id} className="group cursor-pointer hover:bg-muted/40 transition-colors">
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                            style={{ backgroundColor: "color-mix(in oklch, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
                            {c.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{c.full_name}</p>
                            {!c.is_active && <p className="text-[10px] text-muted-foreground">Inactive</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 font-mono text-sm">{c.phone}</TableCell>
                      <TableCell className="py-3.5 text-sm text-muted-foreground">{c.email}</TableCell>
                      <TableCell className="py-3.5"><KycBadge status={c.kyc_status} /></TableCell>
                      <TableCell className="py-3.5 text-sm text-muted-foreground">{fmt(c.joined_at)}</TableCell>
                      <TableCell className="py-3.5">
                        <Link href={`/admin/citizens/${c.id}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
