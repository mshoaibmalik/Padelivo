type SystemErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type SystemEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: SystemErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __systemEvents?: SystemEvents;
  }
}

export function reportSystemError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__systemEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}
