"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
        id: data.id,
        phone: data.phone,
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        profile_image: null,
        station: data.station ?? null,
      });

      if (data.role === "admin") {
        router.push("/admin");
      } else if (data.role === "operator") {
        router.push("/operator");
      } else {
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
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div
        className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden lg:flex"
        style={{ backgroundColor: "var(--sidebar)", color: "var(--sidebar-foreground)" }}
      >
        {/* Radar pulse rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="absolute h-64 w-64 animate-[radar-pulse_3s_ease-out_infinite] rounded-full"
            style={{ borderColor: "var(--primary)", borderWidth: 1, opacity: 0 }}
          />
          <div
            className="absolute h-96 w-96 animate-[radar-pulse_3s_ease-out_1s_infinite] rounded-full"
            style={{ borderColor: "var(--primary)", borderWidth: 1, opacity: 0 }}
          />
          <div
            className="absolute h-[32rem] w-[32rem] animate-[radar-pulse_3s_ease-out_2s_infinite] rounded-full"
            style={{ borderColor: "var(--primary)", borderWidth: 1, opacity: 0 }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <Shield className="h-20 w-20" style={{ color: "var(--primary)" }} />
          <h1 className="text-5xl font-bold tracking-tight">ERAS</h1>
          <p className="max-w-md text-lg opacity-70">
            Emergency Report &amp; Alert System — Protecting communities with
            real-time incident management
          </p>
          <div className="mt-4 flex gap-2">
            <Badge variant="secondary" className="bg-white/10 text-white">
              Real-time Alerts
            </Badge>
            <Badge variant="secondary" className="bg-white/10 text-white">
              Multi-Agency
            </Badge>
            <Badge variant="secondary" className="bg-white/10 text-white">
              24/7 Response
            </Badge>
          </div>
        </div>

        <style jsx>{`
          @keyframes radar-pulse {
            0% {
              transform: scale(0.5);
              opacity: 0.6;
            }
            100% {
              transform: scale(1.2);
              opacity: 0;
            }
          }
        `}</style>
      </div>

      {/* Right panel */}
      <div className="flex w-full items-center justify-center bg-background px-6 lg:w-[480px]">
        <Card className="w-full max-w-sm border-0 shadow-none">
          <CardContent className="p-8">
            <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
              <Shield className="h-10 w-10" style={{ color: "var(--primary)" }} />
              <h1 className="text-xl font-bold">ERAS</h1>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold">Welcome back</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to continue to the command center
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Phone or Email</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your phone or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </form>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Authorized Personnel Only
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
