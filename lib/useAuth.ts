"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAuthenticated, clearAuth } from "./auth";
import type { User, Role } from "../types";

export function useAuth(requiredRole?: Role) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    const u = getUser();
    if (!u) {
      clearAuth();
      router.replace("/login");
      return;
    }

    if (requiredRole && u.role !== requiredRole) {
      if (u.role === "admin") router.replace("/admin");
      else if (u.role === "operator") router.replace("/operator");
      else {
        clearAuth();
        router.replace("/login");
      }
      return;
    }

    setUser(u);
    setChecking(false);
  }, [router, requiredRole]);

  return { user, checking };
}
