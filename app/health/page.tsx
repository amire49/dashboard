"use client";

import { useState } from "react";
import Link from "next/link";

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
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Link
        href="/login"
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        style={{ color: "var(--primary)" }}
      >
        ← Back to login
      </Link>

      <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 mb-6">
        <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>
          System Online
        </span>
      </div>

      <h1 className="text-5xl font-bold mb-2">ERAS Dashboard</h1>
      <p className="text-muted-foreground text-lg mb-10">
        Emergency Report and Alert System
      </p>

      <div className="flex gap-4 mb-10">
        <div className="bg-card border border-border rounded-xl px-8 py-6 text-center">
          <p className="text-2xl font-bold" style={{ color: "var(--chart-3)" }}>
            ✓ Alive
          </p>
          <p className="text-muted-foreground text-sm mt-1">Dashboard</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-8 py-6 text-center">
          <p
            className="text-2xl font-bold"
            style={{
              color:
                status === "success"
                  ? "var(--chart-3)"
                  : status === "error"
                    ? "var(--destructive)"
                    : "var(--muted-foreground)",
            }}
          >
            {status === "success" ? "✓ Alive" : status === "error" ? "✗ Down" : "..."}
          </p>
          <p className="text-muted-foreground text-sm mt-1">Backend</p>
        </div>
      </div>

      <button
        onClick={pingBackend}
        disabled={status === "loading"}
        className="bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 font-semibold px-8 py-3 rounded-lg transition-opacity"
      >
        {status === "loading" ? "Pinging..." : "Ping Backend"}
      </button>

      {response && (
        <pre
          className="mt-6 bg-card border border-border rounded-xl p-4 text-sm max-w-lg overflow-auto"
          style={{ color: "var(--chart-3)" }}
        >
          {response}
        </pre>
      )}

      <p className="text-muted-foreground text-xs mt-10">
        ERAS — Adama Science and Technology University
      </p>
    </main>
  );
}
