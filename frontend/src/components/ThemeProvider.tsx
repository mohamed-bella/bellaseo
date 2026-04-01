"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Suppress the React 19 Turbopack warning about next-themes injecting scripts
  if (typeof window !== "undefined") {
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === "string" && args[0].includes("Encountered a script tag while rendering React component")) {
        return; // Mute this specific false-positive from next-themes
      }
      originalError.apply(console, args);
    };
  }
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
