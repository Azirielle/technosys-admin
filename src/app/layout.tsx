// Root layout: loads the fonts (Plus Jakarta Sans like the phone app, Geist Mono for codes), the theme (light/dark) and the toast messages for every page.
import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

import { MobileHardwareListener } from "@/components/mobile-hardware-listener";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TechnoSys Admin",
  description: "Technocycle attendance, inventory and ticketing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink font-sans transition-colors duration-200">
        <ThemeProvider>
          <ToastProvider>
            {/* The top loading bar uses the action colour token */}
            <NextTopLoader color="var(--tc-action)" showSpinner={false} />
            <MobileHardwareListener />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
