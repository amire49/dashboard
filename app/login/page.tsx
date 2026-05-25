"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Phone,
  Lock,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { authAPI } from "@/lib/api";
import { saveTokens, saveUser, clearAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
        id: data.id,
        phone: data.phone,
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        profile_image: null,
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-subtle">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,var(--foreground)_1px,transparent_1px),linear-gradient(to_bottom,var(--foreground)_1px,transparent_1px)] bg-size-[40px_40px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-start px-6">
        <div className="mb-7">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" strokeWidth={1.75} />
            </div>
          </div>
          <h1 className="text-display text-foreground">ERAS</h1>
          <div className="mt-1.5 h-0.5 w-10 bg-primary" />
          <p className="text-label mt-2 tracking-[0.18em]">
            Emergency Report &amp; Alert System
          </p>
        </div>

        <Card className="w-full gap-0 border py-0 shadow-popover">
          <CardContent className="p-10">
            <div className="mb-7">
              <h2 className="text-section-title">System Authentication</h2>
              <p className="mt-1 text-caption">
                Sign in to access the command center.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-label">
                  Phone number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="09XXXXXXXX"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-11 bg-muted/40 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-label">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 bg-muted/40 pl-10 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-destructive/5">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-destructive">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full gap-2 font-semibold tracking-wide"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    Authenticating…
                  </>
                ) : (
                  <>
                    Login
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-label mt-5 tracking-widest">© 2026 ERAS</p>
      </div>
    </div>
  );
}
