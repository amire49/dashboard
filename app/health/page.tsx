"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ArrowLeft } from "lucide-react";

export default function HealthPage() {
  const [status, setStatus] = useState<null | "loading" | "success" | "error">(null);
  const [response, setResponse] = useState<string>("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://eras-backend.onrender.com";

  async function pingBackend() {
    setStatus("loading");
    try {
      const res = await fetch(`${apiUrl}/api/health`);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
      setStatus("success");
    } catch {
      setStatus("error");
      setResponse("Could not reach backend");
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <Link
        href="/login"
        className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-body font-medium text-primary transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>

      <div className="mb-6 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        <span className="text-body font-medium text-primary">System Online</span>
      </div>

      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Activity className="h-6 w-6 text-primary" strokeWidth={1.75} />
        </div>
        <h1 className="text-page-title text-5xl">ERAS Dashboard</h1>
      </div>
      <p className="mb-10 text-body text-muted-foreground">
        Emergency Report and Alert System
      </p>

      <div className="mb-10 flex gap-4">
        <Card className="rounded-xl border py-0 shadow-card">
          <CardContent className="px-8 py-6 text-center">
            <p className="text-data text-2xl font-bold text-success">✓ Alive</p>
            <p className="mt-1 text-caption">Dashboard</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border py-0 shadow-card">
          <CardContent className="px-8 py-6 text-center">
            <p
              className={`text-data text-2xl font-bold ${
                status === "success"
                  ? "text-success"
                  : status === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {status === "success" ? "✓ Alive" : status === "error" ? "✗ Down" : "..."}
            </p>
            <p className="mt-1 text-caption">Backend</p>
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={pingBackend}
        disabled={status === "loading"}
        size="lg"
        className="font-semibold"
      >
        {status === "loading" ? "Pinging..." : "Ping Backend"}
      </Button>

      {response && (
        <pre className="mt-6 max-w-lg overflow-auto rounded-xl border border-border bg-card p-4 text-data text-sm text-success shadow-card">
          {response}
        </pre>
      )}

      <p className="mt-10 text-caption">ERAS — Adama Science and Technology University</p>
    </main>
  );
}
