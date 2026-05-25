"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User, Phone, Mail, Calendar, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import { citizensAPI } from "@/lib/api";
import type { Citizen, KycStatus } from "@/types";

const KYC_VARIANTS: Record<KycStatus, { variant: "success" | "warning" | "destructive" | "secondary"; label: string }> = {
  approved: { variant: "success", label: "Approved" },
  pending: { variant: "warning", label: "Pending" },
  rejected: { variant: "destructive", label: "Rejected" },
  not_submitted: { variant: "secondary", label: "Not Submitted" },
};

const KYC_MESSAGES: Record<KycStatus, { title: string; description: string }> = {
  approved: {
    title: "KYC Approved",
    description: "This citizen's identity has been verified and approved.",
  },
  pending: {
    title: "KYC Pending Review",
    description: "This citizen's KYC documents are awaiting review in the KYC microservice.",
  },
  rejected: {
    title: "KYC Rejected",
    description: "This citizen's KYC submission was rejected. They need to resubmit.",
  },
  not_submitted: {
    title: "KYC Not Submitted",
    description: "This citizen has not submitted identity documents yet.",
  },
};

function KycBadge({ status }: { status: KycStatus }) {
  const cfg = KYC_VARIANTS[status] ?? KYC_VARIANTS.not_submitted;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <p className="text-label">{label}</p>
        <p className="mt-0.5 text-body font-medium">{value}</p>
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
      <AppShell role="admin">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!citizen) {
    return (
      <AppShell role="admin">
        <p className="text-caption">Citizen not found.</p>
      </AppShell>
    );
  }

  const kycMessage = KYC_MESSAGES[citizen.kyc_status] ?? KYC_MESSAGES.not_submitted;

  return (
    <AppShell role="admin">
      <PageHeader
        title="Citizen Profile"
        subtitle={citizen.full_name}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="rounded-xl border py-0 shadow-card">
          <CardContent className="p-6">
            <div className="mb-5 flex flex-col items-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-2xl font-extrabold text-primary">
                {citizen.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <p className="text-section-title">{citizen.full_name}</p>
              <p className="mt-0.5 text-data text-muted-foreground">{citizen.phone}</p>
              <div className="mt-3 flex items-center gap-2">
                <KycBadge status={citizen.kyc_status} />
                {!citizen.is_active && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>

            <div>
              <InfoRow icon={User} label="Full Name" value={citizen.full_name} />
              <InfoRow icon={Phone} label="Phone" value={citizen.phone} />
              <InfoRow icon={Mail} label="Email" value={citizen.email} />
              <InfoRow icon={Calendar} label="Joined" value={fmt(citizen.joined_at || citizen.created_at)} />
            </div>
          </CardContent>
        </Card>

        <PageSection title="KYC Verification Status" className="lg:col-span-2">
          <Card className="rounded-xl border py-0 shadow-card">
            <CardContent>
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-4">
                  <KycBadge status={citizen.kyc_status} />
                </div>
                <p className="mb-2 text-section-title">{kycMessage.title}</p>
                <p className="max-w-md text-caption">{kycMessage.description}</p>
                {citizen.kyc_processed_at && (
                  <p className="mt-3 text-caption">
                    Processed: {fmt(citizen.kyc_processed_at)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </PageSection>
      </div>
    </AppShell>
  );
}
