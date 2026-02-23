import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import AnimatedBackground from "@/components/AnimatedBackground";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FunDeck",
  description:
    "FunDeck is a neon-premium hub for social, party, and casino mini-games. Download, host, and play.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} min-h-screen bg-background text-text antialiased`}
      >
        <AnimatedBackground />
        <div className="relative z-10 flex min-h-screen flex-col">
          <Navbar />
          {children}
        </div>
      </body>
    </html>
  );
}
