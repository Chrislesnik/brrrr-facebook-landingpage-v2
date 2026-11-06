import React from "react";
import ReactDOM from "react-dom/client";
import {HeroUIProvider} from "@heroui/react";
import App from "./App";
import HomePage from "./home/HomePage";
import {currentPath, navigate, usePathname} from "./routes";
import "./styles.css";

function redirectLegacyVariant() {
  if (new URLSearchParams(window.location.search).get("variant") === "full" && currentPath() === "/") {
    navigate("/full", {replace: true});
  }
}

redirectLegacyVariant();
document.documentElement.classList.remove("pricing-theme");
document.body.classList.add("dark");

function AppRoutes() {
  const path = usePathname();
  if (path === "/full") {
    return (
      <div className="flex min-h-screen w-full items-start justify-center p-4 md:p-8">
        <App />
      </div>
    );
  }
  return (
    <div className="flex min-h-screen w-full items-start justify-center p-4 md:p-8">
      <HomePage />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HeroUIProvider>
      <AppRoutes />
    </HeroUIProvider>
  </React.StrictMode>,
);
