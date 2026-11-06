declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
    };
  }
}

const PIXEL_ID = "1602811544808661";

export type MetaUserData = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
};

/** Normalize + pass Advanced Matching fields (Meta hashes these in-browser). */
export function setMetaUserData(user: MetaUserData) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;

  const payload: Record<string, string> = {};
  if (user.email) payload.em = user.email.trim().toLowerCase();
  if (user.phone) payload.ph = user.phone.replace(/\D/g, "");
  if (user.firstName) payload.fn = user.firstName.trim().toLowerCase();
  if (user.lastName) payload.ln = user.lastName.trim().toLowerCase();
  if (!Object.keys(payload).length) return;

  try {
    // Re-init with customer info improves match quality / processing
    window.fbq("init", PIXEL_ID, payload);
  } catch (err) {
    console.warn("[meta-pixel] failed to set user data", err);
  }
}

/** Fire a Meta Pixel standard event if the base pixel is loaded. */
export function trackMetaEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const fbq = window.fbq;
  if (typeof fbq !== "function") {
    console.warn("[meta-pixel] fbq not ready; event may be dropped:", event);
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
