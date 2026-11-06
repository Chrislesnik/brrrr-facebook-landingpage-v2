const STORAGE_KEY = "pricing-color-scheme";

export type PricingColorScheme = "light" | "dark";

export function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function readStoredScheme(): PricingColorScheme | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* private mode */
  }
  return null;
}

export function resolvePricingScheme(stored = readStoredScheme()): PricingColorScheme {
  return stored ?? (systemPrefersDark() ? "dark" : "light");
}

export function applyPricingTheme(scheme: PricingColorScheme) {
  const root = document.documentElement;
  root.classList.add("pricing-theme");
  root.classList.toggle("dark", scheme === "dark");
  document.body.classList.remove("dark");
}

export function writePricingScheme(scheme: PricingColorScheme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, scheme);
  } catch {
    /* private mode */
  }
  applyPricingTheme(scheme);
}

export function syncPricingTheme() {
  applyPricingTheme(resolvePricingScheme());
}
