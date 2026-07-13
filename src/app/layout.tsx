import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { CvProvider } from "@/lib/CvContext";
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
    <html lang="en" className="dark">
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${outfit.variable} antialiased bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans min-h-screen flex flex-col`}
      >
        <CvProvider>
          {children}
        </CvProvider>
      </body>
    </html>
  );
}
