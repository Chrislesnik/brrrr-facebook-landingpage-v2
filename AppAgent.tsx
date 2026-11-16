"use client";

import React from "react";
import AgentLeadForm from "./agent-lead-form";
import ReviewsCarousel from "./reviews-carousel";

// Light chat onboarding. The simple form stays the default; this is ?variant=agent.
export default function AppAgent() {
  React.useEffect(() => {
    document.documentElement.classList.add("agent-canvas");
    return () => {
      document.documentElement.classList.remove("agent-canvas");
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col">
      <AgentLeadForm />
      <ReviewsCarousel className="agent-reviews mt-8 mb-10" />
    </div>
  );
}
