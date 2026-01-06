"use client";

import { ThemeProvider } from "@/components/ThemeProvider";

export function RootProviders({ children }: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="feedflow-theme"
    >
      {children}
    </ThemeProvider>
  );
}
