import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import SlideInPanel from "@/components/layout/SlideInPanel";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareerForge - AI Powered Resume Enhancer",
  description: "Forge your dream career with professional resume building and optimization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${outfit.variable} antialiased bg-[#FAFAFA] text-[#171717] font-sans min-h-screen flex flex-col`}
      >
        {children}
        <SlideInPanel />
      </body>
    </html>
  );
}
