"use client";

import { useState } from "react";
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Sidebar from "@/components/layout/Sidebar";
import { authAPI } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/lib/useToast";

function AccountField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/5 px-4 py-3">
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: "color-mix(in oklch, var(--primary) 10%, transparent)",
          color: "var(--primary)",
        }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function OperatorSettingsPage() {
  const { user, checking } = useAuth("operator");
  const { success, error: toastError } = useToast();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 6) {
      toastError("Invalid password", "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError("Passwords do not match", "Confirm password must match the new password.");
      return;
    }
    if (oldPassword === newPassword) {
      toastError("Same password", "New password must be different from the current one.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await authAPI.changePassword({
      old_password: oldPassword,
      new_password: newPassword,
    });
    setSubmitting(false);

    if (error || !data) {
      toastError("Change failed", error ?? "Could not update password.");
      return;
    }

    success("Password updated", data.detail ?? "Your password has been changed.");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="operator" />

      <main className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                backgroundColor:
                  "color-mix(in oklch, var(--primary) 12%, transparent)",
                color: "var(--primary)",
              }}
            >
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ letterSpacing: "-0.03em" }}
              >
                Account settings
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your profile and security
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="capitalize">
            {user?.role ?? "operator"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <Card className="border-0 shadow-sm xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AccountField icon={User} label="Full name" value={user?.full_name ?? ""} />
              <AccountField icon={Mail} label="Email" value={user?.email ?? ""} />
              <AccountField icon={Phone} label="Phone" value={user?.phone ?? ""} />
              {user?.station && (
                <div className="rounded-lg border border-border bg-muted/5 px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Assigned station
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{user.station.name}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {user.station.type} station
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm xl:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Change password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="old-password">Current password</Label>
                    <div className="relative">
                      <Input
                        id="old-password"
                        type={showOld ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="rounded-lg pr-10"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOld((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="rounded-lg pr-10"
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Minimum 6 characters.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="rounded-lg"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t border-border pt-4">
                  <Button type="submit" disabled={submitting} className="min-w-[160px] gap-2 rounded-lg">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? "Updating…" : "Update password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
