import type {Metadata} from "next";
import { Inter } from "next/font/google"
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = "de-DE";

  return (
    <html lang={lang} className={inter.variable} suppressHydrationWarning>
      <body className="h-screen overflow-hidden bg-background font-sans">
        <GlobalProviders>
          {children}
        </GlobalProviders>
      </body>
    </html>
  );
}
