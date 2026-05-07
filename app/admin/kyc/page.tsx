"use client";

import { useEffect } from "react";
import { ExternalLink, ClipboardList, ArrowRight, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/layout/Sidebar";

const KYC_SERVICE_URL = "https://kyc-micro-service.onrender.com/admin/dashboard/";

export default function KycReviewPage() {
  // Auto-redirect after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      window.open(KYC_SERVICE_URL, "_blank");
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenKYC = () => {
    window.open(KYC_SERVICE_URL, "_blank");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="admin" />
      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="flex h-full items-center justify-center">
          <Card className="w-full max-w-2xl border-0 shadow-lg">
            <CardContent className="p-12">
              <div className="text-center">
                {/* Icon */}
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
                  style={{ 
                    background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in oklch, var(--primary) 70%, transparent) 100%)",
                  }}>
                  <ClipboardList className="h-10 w-10 text-white" />
                </div>

                {/* Title */}
                <h1 className="mb-3 text-3xl font-bold">KYC Review System</h1>
                <p className="mb-8 text-muted-foreground">
                  The KYC review system is hosted on a separate microservice for security and compliance.
                </p>

                {/* Info box */}
                <div className="mb-8 rounded-xl border p-6 text-left"
                  style={{ 
                    backgroundColor: "color-mix(in oklch, var(--primary) 5%, transparent)",
                    borderColor: "color-mix(in oklch, var(--primary) 20%, transparent)",
                  }}>
                  <div className="mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5" style={{ color: "var(--primary)" }} />
                    <h3 className="font-semibold">External Authentication Required</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
                      <span>You will be redirected to the KYC microservice login page</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
                      <span>Log in with your KYC admin credentials (separate from this dashboard)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
                      <span>Review and approve/reject citizen identity submissions</span>
                    </li>
                  </ul>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleOpenKYC}
                    size="lg"
                    className="w-full gap-2 text-base"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    <ExternalLink className="h-5 w-5" />
                    Open KYC Review System
                    <ArrowRight className="h-5 w-5 ml-auto" />
                  </Button>
                  
                  <p className="text-xs text-muted-foreground">
                    Auto-redirecting in 3 seconds...
                  </p>
                </div>

                {/* URL display */}
                <div className="mt-6 rounded-lg border px-4 py-3"
                  style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)" }}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Service URL:</p>
                  <a 
                    href={KYC_SERVICE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm hover:underline"
                    style={{ color: "var(--primary)" }}
                  >
                    {KYC_SERVICE_URL}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
