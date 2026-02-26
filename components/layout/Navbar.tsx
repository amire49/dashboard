"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import type { User } from "@/types";

interface NavbarProps {
  title: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Navbar({ title }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs font-medium">
            {user ? getInitials(user.full_name) : "??"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
