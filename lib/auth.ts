import type { AuthTokens, User } from "@/types";

const isBrowser = typeof window !== "undefined";

export function saveTokens(tokens: AuthTokens): void {
  if (!isBrowser) return;
  localStorage.setItem("eras_access_token", tokens.access);
  localStorage.setItem("eras_refresh_token", tokens.refresh);
}

export function getAccessToken(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem("eras_access_token");
}

export function getRefreshToken(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem("eras_refresh_token");
}

export function saveUser(user: User): void {
  if (!isBrowser) return;
  localStorage.setItem("eras_user", JSON.stringify(user));
}

export function getUser(): User | null {
  if (!isBrowser) return null;
  const raw = localStorage.getItem("eras_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  if (!isBrowser) return;
  localStorage.removeItem("eras_access_token");
  localStorage.removeItem("eras_refresh_token");
  localStorage.removeItem("eras_user");
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
