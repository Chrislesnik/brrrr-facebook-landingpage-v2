"use client";

import React from "react";
import {domAnimation, LazyMotion, m} from "framer-motion";

import MultistepSidebar from "./multistep-sidebar";
import SimpleLeadForm from "./simple-lead-form";

const variants = {
  enter: (direction: number) => ({
    y: direction > 0 ? 30 : -30,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    y: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    y: direction < 0 ? 30 : -30,
    opacity: 0,
  }),
};

export default function AppSimple() {
  return (
    <MultistepSidebar
      currentPage={0}
      onBack={() => {}}
      onChangePage={() => {}}
      onNext={() => {}}
    >
      <div className="relative flex h-fit w-full flex-col pt-6 text-left lg:h-full lg:justify-center lg:pt-0">
        <LazyMotion features={domAnimation}>
          <m.div
            key="simple-lead"
            animate="center"
            className="col-span-12"
            custom={0}
            exit="exit"
            initial="exit"
            transition={{
              y: {
                ease: "backOut",
                duration: 0.35,
              },
              opacity: {duration: 0.4},
            }}
            variants={variants}
          >
            <SimpleLeadForm />
          </m.div>
        </LazyMotion>
      </div>
    </MultistepSidebar>
  );
}


