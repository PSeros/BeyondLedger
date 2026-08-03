import React from 'react';
import {ThemeProvider} from "next-themes";
import ToastRegion from "@/contexts/ToastRegion";

type GlobalProvidersProps = {
  children: React.ReactNode;
};

export default function GlobalProviders({children}: GlobalProvidersProps) {
  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
      {/* App-wide toast region (custom queue that swallows benign ViewTransition aborts). */}
      <ToastRegion/>
    </>
  );
}
