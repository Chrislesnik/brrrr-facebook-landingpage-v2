declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
    };
  }
}

/** Fire a Meta Pixel standard event if the base pixel is loaded. */
export function trackMetaEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const fbq = window.fbq;
  if (typeof fbq !== "function") {
    // Queue until fbevents.js finishes loading (pixel stub may not exist yet)
    (window as Window & { _fbq?: unknown[] })._fbq = (window as Window & { _fbq?: unknown[] })._fbq || [];
    console.warn("[meta-pixel] fbq not ready; Lead/event may be dropped:", event);
    return;
  }

  try {
    if (params) {
      fbq("track", event, params);
    } else {
      fbq("track", event);
    }
  } catch (err) {
    console.warn("[meta-pixel] failed to track", event, err);
  }
}
