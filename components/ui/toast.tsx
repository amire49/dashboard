import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: "default" | "success" | "error" | "warning" | "info"
  duration?: number
  onClose?: () => void
}

const variantStyles = {
  default: "bg-white border-gray-200",
  success: "bg-green-50 border-green-200",
  error: "bg-red-50 border-red-200",
  warning: "bg-amber-50 border-amber-200",
  info: "bg-blue-50 border-blue-200",
}

const variantIcons = {
  default: "ℹ️",
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
}

export function Toast({ id, title, description, variant = "default", onClose }: ToastProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-sm rounded-xl border shadow-lg p-4 transition-all",
        "animate-in slide-in-from-top-5 fade-in",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">{variantIcons[variant]}</span>
        <div className="flex-1 min-w-0">
          {title && (
            <div className="font-semibold text-sm mb-1">{title}</div>
          )}
          {description && (
            <div className="text-sm text-gray-600">{description}</div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 hover:bg-gray-200/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {children}
    </div>
  )
}
