declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Fire a Meta Pixel standard event if the base pixel is loaded. */
export function trackMetaEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (params) {
    window.fbq("track", event, params);
  } else {
    window.fbq("track", event);
  }
}
