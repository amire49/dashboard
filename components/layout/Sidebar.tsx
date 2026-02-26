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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUser, clearAuth } from "@/lib/auth";
import type { User } from "@/types";

interface SidebarProps {
  role: "admin" | "operator";
}

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/stations", label: "Stations", icon: Building2 },
  { href: "/admin/operators", label: "Operators", icon: Users },
];

const operatorLinks = [
  { href: "/operator", label: "Dashboard", icon: LayoutDashboard },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const links = role === "admin" ? adminLinks : operatorLinks;

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <aside
      className="flex h-screen w-64 flex-col"
      style={{ backgroundColor: "var(--sidebar)", color: "var(--sidebar-foreground)" }}
    >
      <div className="flex items-center gap-3 px-6 py-6">
        <Shield className="h-8 w-8" style={{ color: "var(--primary)" }} />
        <div>
          <h1 className="text-lg font-bold tracking-tight">ERAS</h1>
          <p className="text-xs opacity-60">Command Center</p>
        </div>
      </div>

      <div className="px-6 pb-4">
        <Badge
          className="bg-primary text-primary-foreground hover:bg-primary"
        >
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </Badge>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/admin" &&
              link.href !== "/operator" &&
              pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-l-2 bg-white/10"
                  : "opacity-70 hover:bg-white/5 hover:opacity-100"
              )}
              style={isActive ? { borderColor: "var(--primary)" } : undefined}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-6">
        <Separator className="mb-4 bg-white/10" />
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-white/10 text-xs font-medium">
              {user ? getInitials(user.full_name) : "??"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium">
              {user?.full_name ?? "User"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 opacity-60 hover:opacity-100 hover:bg-white/10 hover:text-white"
            style={{ color: "var(--sidebar-foreground)" }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
