"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Clock, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Sidebar from "@/components/layout/Sidebar";
import { citizensAPI } from "@/lib/api";
import type { Citizen } from "@/types";

const ID_TYPE_LABELS: Record<string, string> = {
  national_id:      "National ID",
  passport:         "Passport",
  drivers_license:  "Driver's License",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function KycPendingPage() {
  const [pending, setPending] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    citizensAPI.list().then(all => {
      setPending(all.filter(c => c.kyc_status === "pending"));
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-y-auto bg-background p-6">

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: "color-mix(in oklch, var(--chart-4) 12%, transparent)", color: "var(--chart-4)" }}>
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold" style={{ letterSpacing: "-0.03em" }}>KYC Review</h1>
                {!loading && pending.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-500">
                    <AlertTriangle className="h-3 w-3" />
                    {pending.length} pending
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Identity verification submissions awaiting review</p>
            </div>
          </div>
        </div>

        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" style={{ color: "var(--chart-4)" }} />
              Pending Submissions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
                    <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
                  </div>
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "color-mix(in oklch, var(--chart-3) 12%, transparent)" }}>
                  <ClipboardList className="h-7 w-7" style={{ color: "var(--chart-3)" }} />
                </div>
                <p className="font-semibold">All caught up</p>
                <p className="text-sm text-muted-foreground">No pending KYC submissions</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow style={{ backgroundColor: "var(--muted)" }}>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Citizen</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Phone</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">ID Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Submitted</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide w-28">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map(c => (
                    <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                            style={{ backgroundColor: "color-mix(in oklch, var(--chart-4) 12%, transparent)", color: "var(--chart-4)" }}>
                            {c.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-sm font-semibold">{c.full_name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 font-mono text-sm">{c.phone}</TableCell>
                      <TableCell className="py-3.5 text-sm">
                        {c.kyc ? (ID_TYPE_LABELS[c.kyc.id_type] ?? c.kyc.id_type) : "—"}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-muted-foreground">
                        {c.kyc ? fmt(c.kyc.submitted_at) : "—"}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Link href={`/admin/kyc/${c.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                          style={{ backgroundColor: "color-mix(in oklch, var(--primary) 10%, transparent)", color: "var(--primary)" }}>
                          Review
                          <ChevronRight className="h-3 w-3" />
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
