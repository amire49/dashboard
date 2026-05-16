"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User, Phone, Mail, Calendar, Loader2 } from "lucide-react";
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
                <InfoRow icon={Calendar} label="Joined"    value={fmt(citizen.joined_at || citizen.created_at)} />
              </div>
            </CardContent>
          </Card>

          {/* KYC Status section */}
          <div className="space-y-5 lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">KYC Verification Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-4">
                    <KycBadge status={citizen.kyc_status} />
                  </div>
                  <p className="font-medium text-lg mb-2">
                    {citizen.kyc_status === "approved" && "KYC Approved"}
                    {citizen.kyc_status === "pending" && "KYC Pending Review"}
                    {citizen.kyc_status === "rejected" && "KYC Rejected"}
                    {citizen.kyc_status === "not_submitted" && "KYC Not Submitted"}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {citizen.kyc_status === "approved" && "This citizen's identity has been verified and approved."}
                    {citizen.kyc_status === "pending" && "This citizen's KYC documents are awaiting review in the KYC microservice."}
                    {citizen.kyc_status === "rejected" && "This citizen's KYC submission was rejected. They need to resubmit."}
                    {citizen.kyc_status === "not_submitted" && "This citizen has not submitted identity documents yet."}
                  </p>
                  {citizen.kyc_processed_at && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Processed: {fmt(citizen.kyc_processed_at)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
