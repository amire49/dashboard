"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Shield,
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  Siren,
  UserCheck,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getUser, clearAuth } from "@/lib/auth";
import type { User } from "@/types";

interface SidebarProps {
  role: "admin" | "operator";
}

const adminLinks = [
  { href: "/admin",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin/stations",  label: "Stations",   icon: Building2 },
  { href: "/admin/operators", label: "Operators",  icon: Users },
  { href: "/admin/citizens",  label: "Citizens",   icon: UserCheck },
  { href: "/admin/kyc",       label: "KYC Review", icon: ClipboardList },
];

const operatorLinks = [
  { href: "/operator",           label: "Dashboard", icon: LayoutDashboard },
  { href: "/operator/incidents", label: "Incidents", icon: Siren },
];

const adminSections = [
  {
    label: "Overview",
    links: [adminLinks[0]],
  },
  {
    label: "Management",
    links: [adminLinks[1], adminLinks[2]],
  },
  {
    label: "Citizens",
    links: [adminLinks[3], adminLinks[4]],
  },
];

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => { setUser(getUser()); }, []);

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/admin" || href === "/operator") return pathname === href;
    return pathname.startsWith(href);
  }

  const sections = role === "admin" ? adminSections : [{ label: null, links: operatorLinks }];

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col overflow-hidden border-r border-border bg-card shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-foreground">ERAS</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {role === "admin" ? "ADMIN PANEL" : "OPERATOR"}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {sections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.links.map(link => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <link.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                    <span className="tracking-tight">{link.label}</span>
                    {active && (
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary opacity-60" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-border px-3 py-3">
        {/* Station info for operators */}
        {role === "operator" && user?.station && (
          <div className="mb-3 rounded-lg bg-muted/5 px-3 py-2.5 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Station
              </p>
            </div>
            <p className="text-xs font-semibold text-foreground tracking-tight truncate">
              {user.station.name}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {user.station.type} Station
            </p>
          </div>
        )}
        
        <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-foreground transition-colors hover:bg-accent">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
              {user ? getInitials(user.full_name) : "??"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold tracking-tight text-foreground">
              {user?.full_name ?? "User"}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {user?.role ?? ""}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
