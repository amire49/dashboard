// Re-export the context-based hook so existing imports don't need to change.
// The global singleton lives in toast-context.tsx; ToastProvider must be
// rendered in app/layout.tsx for this hook to work.
export type { ToastItem as Toast } from "./toast-context";
export { useToast } from "./toast-context";
