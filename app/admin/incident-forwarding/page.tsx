"use client";

import { ArrowRightLeft } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import IncidentForwardingAdmin from "@/components/admin/IncidentForwardingAdmin";

export default function IncidentForwardingPage() {
  return (
    <AppShell role="admin">
      <PageHeader
        icon={ArrowRightLeft}
        title="Incident forwarding"
        subtitle="Configure auto-forward when operators do not respond in time, and review station non-response statistics."
      />

      <IncidentForwardingAdmin />
    </AppShell>
  );
}
