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
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: "TechnoSys — Access Portal",
  description: "TechnoSys Cross-Platform Geofenced IMS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextTopLoader color="#2563eb" showSpinner={false} />
        <Toaster position="top-center" />
        <MobileHardwareListener />
        {children}
      </body>
    </html>
  );
}
