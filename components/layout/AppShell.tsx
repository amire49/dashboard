"use client";

import Sidebar from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

type Props = {
  role: "admin" | "operator";
  children: React.ReactNode;
  className?: string;
};

export default function AppShell({ role, children, className }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={role} />
      <main
        className={cn(
          "flex-1 overflow-y-auto bg-background page-padding",
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
