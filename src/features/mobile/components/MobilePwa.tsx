"use client";

import { useEffect } from "react";
import { MobileEmployeeApp } from "./MobileEmployeeApp";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/scheduly").replace(
  /\/$/,
  "",
);

export function MobilePwa() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register(`${basePath}/mobile/sw.js`, {
          scope: `${basePath}/mobile`,
        })
        .catch(() => undefined);
    }
  }, []);

  return <MobileEmployeeApp />;
}
