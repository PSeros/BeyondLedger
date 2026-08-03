import type {Metadata} from "next";
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
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body className="h-screen overflow-hidden bg-background font-sans">
        <NextIntlClientProvider messages={messages}>
          <GlobalProviders>
            {children}
          </GlobalProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
