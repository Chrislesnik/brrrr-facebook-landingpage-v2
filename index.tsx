
import React from "react";
import ReactDOM from "react-dom/client";
import {HeroUIProvider} from "@heroui/react";
import App from "./App";
import AppSimple from "./AppSimple";
import AppAgent from "./AppAgent";
import "./styles.css";

// ?variant=full keeps the long application. ?variant=agent is the chat onboarding A/B.
// Anything else, including no param, stays the simple lead form.
const variant = new URLSearchParams(window.location.search).get("variant");
if (variant === "agent") document.documentElement.classList.add("agent-canvas");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HeroUIProvider>
      <div className="w-full min-h-screen p-4 md:p-8 flex items-start justify-center">
        {variant === "full" ? <App /> : variant === "agent" ? <AppAgent /> : <AppSimple />}
      </div>
    </HeroUIProvider>
  </React.StrictMode>
);