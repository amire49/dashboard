"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, CheckCircle, XCircle, Loader2, User, Calendar, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import { citizensAPI } from "@/lib/api";
import type { Citizen } from "@/types";

const ID_TYPE_LABELS: Record<string, string> = {
  national_id: "National ID",
  passport: "Passport",
  drivers_license: "Driver's License",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function IdImage({ src, label }: { src: string; label: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="relative aspect-[16/10] w-full bg-muted">
        <Image src={src} alt={label} fill className="object-cover" unoptimized />
      </div>
      <div className="px-3 py-2 text-center">
        <p className="text-label">{label}</p>
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
      <AppShell role="admin">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!citizen || !citizen.kyc) {
    return (
      <AppShell role="admin">
        <p className="text-caption">KYC submission not found.</p>
      </AppShell>
    );
  }

  const { kyc } = citizen;

  return (
    <AppShell role="admin">
      <PageHeader
        title="KYC Review"
        subtitle={`Review identity submission for ${citizen.full_name}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      {done && (
        <Alert
          className={`mb-6 rounded-xl ${
            done === "approved"
              ? "border-success/30 bg-success-muted text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {done === "approved" ? (
            <CheckCircle className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <AlertDescription className="font-semibold">
            KYC {done === "approved" ? "approved" : "rejected"} — redirecting...
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="rounded-xl border py-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-section-title">Citizen Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                {citizen.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-body font-bold">{citizen.full_name}</p>
                <p className="text-data text-caption">{citizen.phone}</p>
              </div>
            </div>
            <div className="space-y-2.5 text-body">
              {[
                { icon: User, label: "Email", value: citizen.email },
                { icon: Calendar, label: "Joined", value: fmt(citizen.joined_at || citizen.created_at) },
                { icon: CreditCard, label: "ID Type", value: ID_TYPE_LABELS[kyc.id_type] ?? kyc.id_type },
                { icon: CreditCard, label: "ID Number", value: kyc.id_number },
                { icon: Calendar, label: "Submitted", value: fmt(kyc.submitted_at) },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-2.5">
                  <row.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-label">{row.label}</p>
                    <p className="font-medium">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <PageSection title="Submitted Documents" className="lg:col-span-2">
          <Card className="rounded-xl border py-0 shadow-card">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-3">
                <IdImage src={kyc.image_front} label="Front" />
                <IdImage src={kyc.image_back} label="Back" />
                <IdImage src={kyc.image_selfie} label="Selfie" />
              </div>
            </CardContent>
          </Card>

          {!done && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className="h-14 gap-2 rounded-xl bg-success text-base font-bold text-success-foreground hover:bg-success/90"
                disabled={!!submitting}
                onClick={() => handleAction("approve")}
              >
                {submitting === "approve" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                Approve
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 gap-2 rounded-xl border-destructive/30 text-base font-bold text-destructive hover:bg-destructive/5"
                disabled={!!submitting}
                onClick={() => handleAction("reject")}
              >
                {submitting === "reject" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                Reject
              </Button>
            </div>
          )}
        </PageSection>
      </div>
    </AppShell>
  );
}
