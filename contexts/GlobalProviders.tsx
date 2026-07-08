import React from 'react';
import {ThemeProvider} from "next-themes";

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
    </>
  );
}
