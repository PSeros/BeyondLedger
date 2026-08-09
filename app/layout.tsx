import type {Metadata, Viewport} from "next";
import { Inter } from "next/font/google"
import {NextIntlClientProvider} from "next-intl";
import {getLocale, getMessages} from "next-intl/server";
import "./globals.css";
import GlobalProviders from "@/contexts/GlobalProviders"

export const metadata: Metadata = {
  title: "BeyondLedger",
  description:
    "The Next level ledger for tracking expenses, incomes and managing budgets. Take control of your personal finances – all in one place.",
};

// Next already injects width=device-width,initial-scale=1 by default; this export exists to add
// themeColor (the browser chrome tint on mobile). Deliberately NO maximumScale/userScalable — that
// would break pinch-zoom. viewportFit is left at its default: without "cover" every
// env(safe-area-inset-*) resolves to 0, so safe-area padding would be dead code.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    {media: "(prefers-color-scheme: light)", color: "#f7f7f8"},
    {media: "(prefers-color-scheme: dark)", color: "#0a0a0b"},
  ],
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    // h-dvh, not h-screen: 100vh is the *large* viewport on mobile browsers (URL bar retracted).
    // Since the shell is overflow-hidden with zero document scroll, a 100vh body would push its
    // bottom ~60-100px permanently off-screen with no way to scroll it back. overscroll-none stops
    // iOS rubber-banding the fixed shell and scroll-chaining out of the per-page scrollers.
    <html lang={locale} className={`${inter.variable} h-dvh`} suppressHydrationWarning>
      <body className="h-dvh overflow-hidden overscroll-none bg-background font-sans">
        <NextIntlClientProvider messages={messages}>
          <GlobalProviders>
            {children}
          </GlobalProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
