"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Toast, ToastContainer, type ToastVariant } from "@/components/ui/toast";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
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
  emergency: (title: string, description?: string) => string;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE_TOASTS = 5;
const EXIT_ANIMATION_MS = 300;
const DEFAULT_DURATION = 5000;
const EMERGENCY_DURATION = 8000;

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeFromList = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    timeoutsRef.current.delete(id);
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      const existing = timeoutsRef.current.get(id);
      if (existing) {
        clearTimeout(existing);
        timeoutsRef.current.delete(id);
      }

      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );

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
      duration,
    }: Omit<ToastItem, "id" | "exiting">) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);

      const resolvedDuration =
        duration ??
        (variant === "emergency" ? EMERGENCY_DURATION : DEFAULT_DURATION);

      const newToast: ToastItem = {
        id,
        title,
        description,
        variant,
        duration: resolvedDuration,
      };

      setToasts((prev) => {
        const next = [newToast, ...prev];
        if (next.length > MAX_VISIBLE_TOASTS) {
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

      if (resolvedDuration > 0) {
        const handle = setTimeout(() => dismiss(id), resolvedDuration);
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
      toast({ title, description, variant: "info", duration: 4000 }),
    [toast]
  );
  const emergency = useCallback(
    (title: string, description?: string) =>
      toast({ title, description, variant: "emergency" }),
    [toast]
  );

  const activeCount = toasts.filter((t) => !t.exiting).length;

  return (
    <ToastContext.Provider
      value={{
        toasts,
        toast,
        dismiss,
        dismissAll,
        success,
        error,
        warning,
        info,
        emergency,
      }}
    >
      {children}
      <ToastContainer count={activeCount} onDismissAll={dismissAll}>
        {toasts.map((t, index) => (
          <Toast
            key={t.id}
            {...t}
            index={index}
            onClose={() => dismiss(t.id)}
          />
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
