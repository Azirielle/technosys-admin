import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

import { MobileHardwareListener } from "@/components/mobile-hardware-listener";
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "TechnoCycle Admin — Operations Portal",
  description: "TechnoCycle Operations, Fleet Tracking & HR Portal",
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
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
        <ThemeProvider>
          <NextTopLoader color="#2563eb" showSpinner={false} />
          <MobileHardwareListener />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
