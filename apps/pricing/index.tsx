import React, {useEffect} from "react";
import ReactDOM from "react-dom/client";
import PricingChat from "./pricing/PricingChat";
import PricingIntro from "./pricing/PricingIntro";
import PricingResult from "./pricing/PricingResult";
import PricingStacked from "./pricing/PricingStacked";
import PricingSteps from "./pricing/PricingSteps";
import {resolvePricingScheme} from "./pricing/theme";
import {currentPath, navigate, usePathname} from "./routes";
import "./styles.css";

function paintPricingTheme() {
  document.documentElement.classList.add("pricing-theme");
  document.documentElement.classList.toggle("dark", resolvePricingScheme() === "dark");
  document.body.classList.remove("dark");
}

function redirectLegacyVariant() {
  const variant = new URLSearchParams(window.location.search).get("variant");
  if (variant === "pricing-stacked") navigate("/pricing", {replace: true});
  if (variant === "pricing-steps") navigate("/pricing/steps", {replace: true});
}

redirectLegacyVariant();
paintPricingTheme();

function AppRoutes() {
  const path = usePathname();
  useEffect(() => {
    paintPricingTheme();
    window.scrollTo({top: 0});
  }, [path]);

  if (path === "/pricing/result") return <PricingResult />;
  if (path === "/pricing/steps") return <PricingSteps />;
  if (path === "/pricing/scenario") return <PricingStacked />;
  if (path === "/pricing/chat") return <PricingChat />;
  return <PricingIntro />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRoutes />
  </React.StrictMode>,
);

void currentPath;
