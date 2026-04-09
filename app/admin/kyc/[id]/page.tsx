"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, CheckCircle, XCircle, Loader2, User, Calendar, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/layout/Sidebar";
import { citizensAPI } from "@/lib/api";
import type { Citizen } from "@/types";

const ID_TYPE_LABELS: Record<string, string> = {
  national_id:     "National ID",
  passport:        "Passport",
  drivers_license: "Driver's License",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function IdImage({ src, label }: { src: string; label: string }) {
  return (
    <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
      <div className="relative aspect-[16/10] w-full bg-muted">
        <Image src={src} alt={label} fill className="object-cover" unoptimized />
      </div>
      <div className="px-3 py-2 text-center">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

export default function KycReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [citizen, setCitizen] = useState<Citizen | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  useEffect(() => {
    citizensAPI.get(id).then(c => { setCitizen(c); setLoading(false); });
  }, [id]);

  async function handleAction(action: "approve" | "reject") {
    if (!citizen) return;
    setSubmitting(action);
    await citizensAPI.reviewKyc(citizen.id, action);
    setSubmitting(null);
    setDone(action === "approve" ? "approved" : "rejected");
    setTimeout(() => router.push("/admin/kyc"), 1800);
  }

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar role="admin" />
        <main className="flex-1 overflow-y-auto bg-background p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!citizen || !citizen.kyc) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar role="admin" />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <p className="text-muted-foreground">KYC submission not found.</p>
        </main>
      </div>
    );
  }

  const { kyc } = citizen;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-y-auto bg-background p-6">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ letterSpacing: "-0.03em" }}>KYC Review</h1>
            <p className="text-sm text-muted-foreground">Review identity submission for {citizen.full_name}</p>
          </div>
        </div>

        {/* Success banner */}
        {done && (
          <div className="mb-6 flex items-center gap-3 rounded-xl p-4"
            style={{
              backgroundColor: done === "approved" ? "color-mix(in oklch, var(--chart-3) 12%, transparent)" : "#ef444412",
              border: `1px solid ${done === "approved" ? "color-mix(in oklch, var(--chart-3) 30%, transparent)" : "#ef444430"}`,
            }}>
            {done === "approved"
              ? <CheckCircle className="h-5 w-5 shrink-0" style={{ color: "var(--chart-3)" }} />
              : <XCircle className="h-5 w-5 shrink-0 text-red-500" />}
            <p className="font-semibold" style={{ color: done === "approved" ? "var(--chart-3)" : "#ef4444" }}>
              KYC {done === "approved" ? "approved" : "rejected"} — redirecting...
            </p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-3">

          {/* Citizen info */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Citizen Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold"
                  style={{ backgroundColor: "color-mix(in oklch, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
                  {citizen.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold">{citizen.full_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{citizen.phone}</p>
                </div>
              </div>
              <div className="space-y-2.5 text-sm">
                {[
                  { icon: User,     label: "Email",     value: citizen.email },
                  { icon: Calendar, label: "Joined",    value: fmt(citizen.joined_at) },
                  { icon: CreditCard, label: "ID Type", value: ID_TYPE_LABELS[kyc.id_type] ?? kyc.id_type },
                  { icon: CreditCard, label: "ID Number", value: kyc.id_number },
                  { icon: Calendar, label: "Submitted", value: fmt(kyc.submitted_at) },
                ].map(row => (
                  <div key={row.label} className="flex items-start gap-2.5">
                    <row.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</p>
                      <p className="font-medium">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ID Images */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Submitted Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <IdImage src={kyc.image_front}  label="Front" />
                  <IdImage src={kyc.image_back}   label="Back" />
                  <IdImage src={kyc.image_selfie} label="Selfie" />
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            {!done && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  className="h-14 gap-2 rounded-xl text-base font-bold"
                  disabled={!!submitting}
                  onClick={() => handleAction("approve")}
                  style={{ backgroundColor: "var(--chart-3)", color: "white" }}
                >
                  {submitting === "approve"
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : <CheckCircle className="h-5 w-5" />}
                  Approve
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 gap-2 rounded-xl text-base font-bold border-red-500/30 text-red-500 hover:bg-red-500/5"
                  disabled={!!submitting}
                  onClick={() => handleAction("reject")}
                >
                  {submitting === "reject"
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : <XCircle className="h-5 w-5" />}
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
