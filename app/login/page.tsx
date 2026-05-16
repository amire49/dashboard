"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Phone, Lock, AlertTriangle } from "lucide-react";
import { authAPI } from "@/lib/api";
import { saveTokens, saveUser, clearAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authAPI.login({ username, password });
      if (!data) {
        setError("Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }
      saveTokens({ access: data.access_token, refresh: data.refresh_token });
      saveUser({
        id: data.id, phone: data.phone, full_name: data.full_name,
        email: data.email, role: data.role, profile_image: null,
        station: data.station ?? null,
      });
      if (data.role === "admin") router.push("/admin");
      else if (data.role === "operator") router.push("/operator");
      else {
        setError("Citizens cannot access the dashboard.");
        clearAuth();
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#f5f5f7" }}>

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

      {/* Faint red glow bottom-left */}
      <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #ef4444 0%, transparent 70%)" }} />

      {/* ── Main content ── */}
      <div className="relative z-10 flex w-full max-w-lg flex-col items-start px-6">

        {/* Logo */}
        <div className="mb-7">
          <h1 className="text-5xl font-black" style={{ letterSpacing: "-0.04em", color: "#111827" }}>ERAS</h1>
          <div className="mt-1.5 h-0.5 w-10 bg-red-500" />
          <p className="mt-2 text-[10px] font-semibold tracking-[0.18em]" style={{ color: "#9ca3af" }}>
            EMERGENCY REPORT &amp; ALERT SYSTEM
          </p>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl bg-white p-10 shadow-xl"
          style={{ border: "1px solid #e5e7eb" }}>

          <div className="mb-7">
            <h2 className="text-xl font-bold" style={{ letterSpacing: "-0.02em", color: "#111827" }}>
              System Authentication
            </h2>
            <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>
              Sign in to access the command center.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Phone */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold tracking-widest" style={{ color: "#6b7280" }}>
                PHONE NUMBER
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#9ca3af" }} />
                <input
                  type="text"
                  placeholder="09XXXXXXXX"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  className="w-full rounded-lg py-3 pl-10 pr-4 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: "#f9fafb",
                    border: "1.5px solid #e5e7eb",
                    color: "#111827",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#ef4444")}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold tracking-widest" style={{ color: "#6b7280" }}>
                PASSWORD
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#9ca3af" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg py-3 pl-10 pr-12 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: "#f9fafb",
                    border: "1.5px solid #e5e7eb",
                    color: "#111827",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#ef4444")}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#9ca3af" }}
                  onMouseEnter={e => ((e.currentTarget).style.color = "#ef4444")}
                  onMouseLeave={e => ((e.currentTarget).style.color = "#9ca3af")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                <p className="text-xs font-medium text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group w-full rounded-lg py-3.5 text-sm font-black tracking-widest text-white transition-all disabled:opacity-70"
              style={{ backgroundColor: "#ef4444", letterSpacing: "0.1em" }}
              onMouseEnter={e => !loading && ((e.currentTarget).style.backgroundColor = "#dc2626")}
              onMouseLeave={e => ((e.currentTarget).style.backgroundColor = "#ef4444")}
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    AUTHENTICATING...
                  </>
                ) : (
                  <>
                    LOGIN
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </span>
            </button>

          </form>

          {/* Legal notice */}
          <div className="mt-5 rounded-lg px-4 py-3"
            style={{ backgroundColor: "#f9fafb", borderLeft: "3px solid #ef4444" }}>
            <p className="mb-0.5 text-[10px] font-bold tracking-widest" style={{ color: "#ef4444" }}>
              LEGAL NOTICE
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: "#6b7280" }}>
              Unauthorized access is strictly prohibited and monitored under Federal Emergency Management protocols.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-5 flex w-full items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            <span className="text-[10px] font-semibold tracking-widest" style={{ color: "#9ca3af" }}>
              NETWORK ENCRYPTED
            </span>
          </div>
          <p className="text-[10px] tracking-widest" style={{ color: "#9ca3af" }}>
            © 2026 ERAS
          </p>
        </div>

      </div>
    </div>
  );
}
