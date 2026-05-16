"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, User, Phone, Mail, Calendar, CreditCard, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/layout/Sidebar";
import { citizensAPI } from "@/lib/api";
import type { Citizen, KycStatus } from "@/types";

const KYC_COLORS: Record<KycStatus, { bg: string; text: string; label: string }> = {
  approved:      { bg: "color-mix(in oklch, var(--chart-3) 12%, transparent)", text: "var(--chart-3)",  label: "Approved" },
  pending:       { bg: "color-mix(in oklch, var(--chart-4) 12%, transparent)", text: "var(--chart-4)",  label: "Pending" },
  rejected:      { bg: "#ef444412",                                             text: "#ef4444",         label: "Rejected" },
  not_submitted: { bg: "var(--muted)",                                          text: "var(--muted-foreground)", label: "Not Submitted" },
};

const ID_TYPE_LABELS: Record<string, string> = {
  national_id:     "National ID",
  passport:        "Passport",
  drivers_license: "Driver's License",
};

function KycBadge({ status }: { status: KycStatus }) {
  const cfg = KYC_COLORS[status] ?? KYC_COLORS.not_submitted;
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: "color-mix(in oklch, var(--primary) 10%, transparent)", color: "var(--primary)" }}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function CitizenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [citizen, setCitizen] = useState<Citizen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    citizensAPI.get(id).then(c => { setCitizen(c); setLoading(false); });
  }, [id]);

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

  if (!citizen) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar role="admin" />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <p className="text-muted-foreground">Citizen not found.</p>
        </main>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold" style={{ letterSpacing: "-0.03em" }}>Citizen Profile</h1>
            <p className="text-sm text-muted-foreground">{citizen.full_name}</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">

          {/* Profile card */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="mb-5 flex flex-col items-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-extrabold"
                  style={{ backgroundColor: "color-mix(in oklch, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
                  {citizen.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <h2 className="text-lg font-bold" style={{ letterSpacing: "-0.02em" }}>{citizen.full_name}</h2>
                <p className="mt-0.5 font-mono text-sm text-muted-foreground">{citizen.phone}</p>
                <div className="mt-3 flex items-center gap-2">
                  <KycBadge status={citizen.kyc_status} />
                  {!citizen.is_active && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              <div>
                <InfoRow icon={User}     label="Full Name" value={citizen.full_name} />
                <InfoRow icon={Phone}    label="Phone"     value={citizen.phone} />
                <InfoRow icon={Mail}     label="Email"     value={citizen.email} />
                <InfoRow icon={Calendar} label="Joined"    value={fmt(citizen.joined_at)} />
              </div>
            </CardContent>
          </Card>

          {/* KYC section */}
          <div className="space-y-5 lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">KYC Verification</CardTitle>
                  {citizen.kyc_status === "pending" && (
                    <Link href={`/admin/kyc/${citizen.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                      style={{ backgroundColor: "color-mix(in oklch, var(--primary) 10%, transparent)", color: "var(--primary)" }}>
                      Review
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!citizen.kyc ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <CreditCard className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium">No KYC submitted</p>
                    <p className="text-sm text-muted-foreground">This citizen has not submitted identity documents</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        { label: "ID Type",    value: ID_TYPE_LABELS[citizen.kyc.id_type] ?? citizen.kyc.id_type },
                        { label: "ID Number",  value: citizen.kyc.id_number },
                        { label: "Submitted",  value: fmt(citizen.kyc.submitted_at) },
                        { label: "Reviewed",   value: citizen.kyc.reviewed_at ? fmt(citizen.kyc.reviewed_at) : "Not yet" },
                      ].map(row => (
                        <div key={row.label} className="rounded-lg p-3" style={{ backgroundColor: "var(--muted)" }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</p>
                          <p className="mt-0.5 font-semibold">{row.value}</p>
                        </div>
                      ))}
                    </div>

                    {citizen.kyc.rejection_reason && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500 mb-1">Rejection Reason</p>
                        <p className="text-red-600">{citizen.kyc.rejection_reason}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { src: citizen.kyc.image_front,  label: "Front" },
                        { src: citizen.kyc.image_back,   label: "Back" },
                        { src: citizen.kyc.image_selfie, label: "Selfie" },
                      ].map(img => (
                        <div key={img.label} className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
                          <div className="relative aspect-[16/10] bg-muted">
                            <Image src={img.src} alt={img.label} fill className="object-cover" unoptimized />
                          </div>
                          <p className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {img.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
