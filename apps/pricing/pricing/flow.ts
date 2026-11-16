const FLOW_KEY = "pricing-flow";

export type PricingFlow = "form" | "chat";

/** ?flow=chat or ?flow=form picks the A/B arm. The choice sticks for the rest of the visit. */
export function readPricingFlow(): PricingFlow {
  try {
    const param = new URLSearchParams(window.location.search).get("flow");
    if (param === "chat" || param === "form") {
      sessionStorage.setItem(FLOW_KEY, param);
      return param;
    }
    return sessionStorage.getItem(FLOW_KEY) === "chat" ? "chat" : "form";
  } catch {
    return "form";
  }
}
