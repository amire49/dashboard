"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Toast, ToastContainer } from "@/components/ui/toast";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning" | "info";
  duration?: number;
  /** Set internally when the toast is being dismissed (triggers exit animation). */
  exiting?: boolean;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (opts: Omit<ToastItem, "id" | "exiting">) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE_TOASTS = 5;
const EXIT_ANIMATION_MS = 300;

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Map from toast id → auto-dismiss timeout handle.
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeFromList = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    timeoutsRef.current.delete(id);
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      // 1. Clear any pending auto-dismiss timer.
      const existing = timeoutsRef.current.get(id);
      if (existing) {
        clearTimeout(existing);
        timeoutsRef.current.delete(id);
      }

      // 2. Mark the toast as exiting so the CSS exit animation plays.
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );

      // 3. Remove from the list after the animation finishes.
      const exit = setTimeout(() => removeFromList(id), EXIT_ANIMATION_MS);
      timeoutsRef.current.set(id, exit);
    },
    [removeFromList]
  );

  const dismissAll = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.clear();
    setToasts([]);
  }, []);

  const toast = useCallback(
    ({
      title,
      description,
      variant = "default",
      duration = 5000,
    }: Omit<ToastItem, "id" | "exiting">) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);

      const newToast: ToastItem = { id, title, description, variant, duration };

      setToasts((prev) => {
        const next = [newToast, ...prev];
        if (next.length > MAX_VISIBLE_TOASTS) {
          // Silently drop oldest toasts that overflow the cap.
          const dropped = next.slice(MAX_VISIBLE_TOASTS);
          dropped.forEach((t) => {
            const handle = timeoutsRef.current.get(t.id);
            if (handle) {
              clearTimeout(handle);
              timeoutsRef.current.delete(t.id);
            }
          });
          return next.slice(0, MAX_VISIBLE_TOASTS);
        }
        return next;
      });

      if (duration > 0) {
        const handle = setTimeout(() => dismiss(id), duration);
        timeoutsRef.current.set(id, handle);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (title: string, description?: string) =>
      toast({ title, description, variant: "success" }),
    [toast]
  );
  const error = useCallback(
    (title: string, description?: string) =>
      toast({ title, description, variant: "error" }),
    [toast]
  );
  const warning = useCallback(
    (title: string, description?: string) =>
      toast({ title, description, variant: "warning" }),
    [toast]
  );
  const info = useCallback(
    (title: string, description?: string) =>
      toast({ title, description, variant: "info" }),
    [toast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, toast, dismiss, dismissAll, success, error, warning, info }}
    >
      {children}
      <ToastContainer>
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={() => dismiss(t.id)} />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>.");
  }
  return ctx;
}
