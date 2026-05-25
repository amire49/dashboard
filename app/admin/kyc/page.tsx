"use client";

import { useEffect } from "react";
import { ExternalLink, ClipboardList, ArrowRight, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";

const KYC_SERVICE_URL = "https://kyc-micro-service.onrender.com/admin/dashboard/";

export default function KycReviewPage() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.open(KYC_SERVICE_URL, "_blank");
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  function handleOpenKYC() {
    window.open(KYC_SERVICE_URL, "_blank");
  }

  return (
    <AppShell role="admin">
      <PageHeader
        icon={ClipboardList}
        title="KYC Review System"
        subtitle="Hosted on a separate microservice for security and compliance"
      />

      <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
        <Card className="w-full max-w-2xl rounded-xl border py-0 shadow-card">
          <CardContent className="p-12">
            <div className="text-center">
              <PageSection className="mb-8">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-left">
                  <div className="mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h3 className="text-section-title">External Authentication Required</h3>
                  </div>
                  <ul className="space-y-2 text-caption">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>You will be redirected to the KYC microservice login page</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>Log in with your KYC admin credentials (separate from this dashboard)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>Review and approve/reject citizen identity submissions</span>
                    </li>
                  </ul>
                </div>
              </PageSection>

              <div className="flex flex-col gap-3">
                <Button onClick={handleOpenKYC} size="lg" className="w-full gap-2 text-base">
                  <ExternalLink className="h-5 w-5" />
                  Open KYC Review System
                  <ArrowRight className="ml-auto h-5 w-5" />
                </Button>

                <p className="text-caption">Auto-redirecting in 3 seconds...</p>
              </div>

              <div className="mt-6 rounded-xl border border-border bg-muted px-4 py-3">
                <p className="mb-1 text-label">Service URL</p>
                <a
                  href={KYC_SERVICE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-data text-sm text-primary hover:underline"
                >
                  {KYC_SERVICE_URL}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
