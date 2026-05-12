"use client";

import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning" | "info";
  exiting?: boolean;
  onClose?: () => void;
}

const variantStyles: Record<NonNullable<ToastProps["variant"]>, string> = {
  default: "bg-card border-border text-foreground",
  success: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
  error:   "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
  warning: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  info:    "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
};

const variantIconStyles: Record<NonNullable<ToastProps["variant"]>, string> = {
  default: "text-foreground",
  success: "text-green-600 dark:text-green-400",
  error:   "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  info:    "text-blue-600 dark:text-blue-400",
};

const VariantIcon: Record<NonNullable<ToastProps["variant"]>, React.ElementType> = {
  default: Info,
  success: CheckCircle2,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

export function Toast({
  id: _id,
  title,
  description,
  variant = "default",
  exiting = false,
  onClose,
}: ToastProps) {
  const Icon = VariantIcon[variant];

  return (
    <div
      role="alert"
      aria-live={variant === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={cn(
        "pointer-events-auto w-full max-w-sm rounded-xl border shadow-lg p-4",
        exiting
          ? "animate-out slide-out-to-right-5 fade-out duration-300 fill-mode-forwards"
          : "animate-in slide-in-from-right-5 fade-in duration-300",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn("mt-0.5 h-4 w-4 shrink-0", variantIconStyles[variant])}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-semibold text-sm leading-tight">{title}</p>
          )}
          {description && (
            <p className={cn("text-sm", title ? "mt-0.5 text-muted-foreground" : "")}>{description}</p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Dismiss notification"
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none w-full max-w-sm"
    >
      {children}
    </div>
  );
}
