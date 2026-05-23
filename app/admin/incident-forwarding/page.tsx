"use client";

import { ArrowRightLeft } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import IncidentForwardingAdmin from "@/components/admin/IncidentForwardingAdmin";

export default function IncidentForwardingPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="admin" />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                backgroundColor:
                  "color-mix(in oklch, var(--primary) 12%, transparent)",
                color: "var(--primary)",
              }}
            >
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ letterSpacing: "-0.03em" }}
              >
                Incident forwarding
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Configure auto-forward when operators do not respond in time, and
                review station non-response statistics.
              </p>
            </div>
          </div>
        </div>

        <IncidentForwardingAdmin />
      </main>
    </div>
  );
}
