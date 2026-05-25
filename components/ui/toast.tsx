"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  Siren,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "emergency";

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  exiting?: boolean;
  duration?: number;
  /** Stack position for enter animation stagger */
  index?: number;
  onClose?: () => void;
}

const variantConfig: Record<
  ToastVariant,
  {
    card: string;
    accent: string;
    iconWrap: string;
    icon: string;
    progress: string;
    Icon: React.ElementType;
  }
> = {
  default: {
    card: "border-border/80 bg-card/95 text-foreground shadow-popover",
    accent: "bg-foreground/80",
    iconWrap: "bg-muted",
    icon: "text-foreground",
    progress: "bg-foreground/30",
    Icon: Bell,
  },
  success: {
    card: "border-success/20 bg-card/95 text-foreground shadow-popover",
    accent: "bg-success",
    iconWrap: "bg-success-muted",
    icon: "text-success",
    progress: "bg-success/50",
    Icon: CheckCircle2,
  },
  error: {
    card: "border-destructive/20 bg-card/95 text-foreground shadow-popover",
    accent: "bg-destructive",
    iconWrap: "bg-destructive/10",
    icon: "text-destructive",
    progress: "bg-destructive/50",
    Icon: AlertCircle,
  },
  warning: {
    card: "border-warning/25 bg-card/95 text-foreground shadow-popover",
    accent: "bg-warning",
    iconWrap: "bg-warning-muted",
    icon: "text-warning-foreground",
    progress: "bg-warning/50",
    Icon: AlertTriangle,
  },
  info: {
    card: "border-info/20 bg-card/95 text-foreground shadow-popover",
    accent: "bg-info",
    iconWrap: "bg-info-muted",
    icon: "text-info",
    progress: "bg-info/50",
    Icon: Info,
  },
  emergency: {
    card: "border-primary/30 bg-card/95 text-foreground shadow-popover ring-1 ring-primary/20",
    accent: "bg-primary",
    iconWrap: "bg-primary/10",
    icon: "text-primary",
    progress: "bg-primary/60",
    Icon: Siren,
  },
};

export function Toast({
  id: _id,
  title,
  description,
  variant = "default",
  exiting = false,
  duration = 5000,
  index = 0,
  onClose,
}: ToastProps) {
  const cfg = variantConfig[variant];
  const Icon = cfg.Icon;
  const showProgress = duration > 0 && !exiting;

  return (
    <div
      role="alert"
      aria-live={variant === "error" || variant === "emergency" ? "assertive" : "polite"}
      aria-atomic="true"
      style={{ animationDelay: exiting ? undefined : `${index * 60}ms` }}
      className={cn(
        "pointer-events-auto relative w-full overflow-hidden rounded-2xl border backdrop-blur-md",
        exiting
          ? "animate-out slide-out-to-right-8 fade-out zoom-out-95 duration-300 fill-mode-forwards"
          : "animate-in slide-in-from-right-8 fade-in zoom-in-95 duration-400 fill-mode-backwards",
        cfg.card
      )}
    >
      {/* Left accent */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1",
          cfg.accent,
          variant === "emergency" && !exiting && "animate-pulse"
        )}
      />

      <div className="flex items-start gap-3 p-4 pl-5">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            cfg.iconWrap,
            variant === "emergency" && !exiting && "animate-pulse"
          )}
        >
          <Icon className={cn("h-5 w-5", cfg.icon)} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          {variant === "emergency" && (
            <p className="text-label mb-1 text-primary">
              Emergency alert
            </p>
          )}
          {title && (
            <p className="text-sm font-semibold leading-snug tracking-tight">{title}</p>
          )}
          {description && (
            <p
              className={cn(
                "text-sm leading-relaxed text-muted-foreground",
                title && "mt-1"
              )}
            >
              {description}
            </p>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss notification"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showProgress && (
        <div className="h-0.5 w-full bg-muted/50">
          <div
            key={`${_id}-progress`}
            className={cn("h-full origin-left", cfg.progress)}
            style={{
              animation: `toast-progress ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastContainer({
  children,
  count,
  onDismissAll,
}: {
  children: React.ReactNode;
  count?: number;
  onDismissAll?: () => void;
}) {
  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex w-[min(100vw-2rem,24rem)] flex-col gap-3 pointer-events-none sm:top-5 sm:right-5"
    >
      {(count ?? 0) > 1 && onDismissAll && (
        <div className="pointer-events-auto flex items-center justify-between rounded-xl border border-border/60 bg-card/90 px-3 py-2 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Bell className="h-3.5 w-3.5" />
            <span>{count} notifications</span>
          </div>
          <button
            type="button"
            onClick={onDismissAll}
            className="text-xs font-semibold text-primary transition-opacity hover:opacity-80"
          >
            Clear all
          </button>
        </div>
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}
