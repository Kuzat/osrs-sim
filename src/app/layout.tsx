import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  return {
  title: "OSRS Loot Simulator - Monster Drop Calculator & Drop Table Tool",
  description: "Free OSRS loot simulator for Old School RuneScape. Calculate monster drop rates, simulate loot tables, and analyze drop probabilities with accurate game mechanics. Search 1000+ monsters instantly.",
  keywords: ["OSRS loot simulator", "Old School RuneScape drop calculator", "OSRS monster drops", "RuneScape loot sim", "drop table calculator", "OSRS probability calculator", "monster drop rates", "OSRS wiki drops"],
  authors: [{ name: "OSRS Monster LootSim" }],
  creator: "OSRS Monster LootSim",
  publisher: "OSRS Monster LootSim",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://osrs-loot-sim.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "OSRS Loot Simulator - Monster Drop Calculator",
    description: "Free OSRS loot simulator for Old School RuneScape. Calculate monster drop rates, simulate loot tables, and analyze drop probabilities with accurate game mechanics.",
    url: 'https://osrs-loot-sim.vercel.app',
    siteName: 'OSRS Monster LootSim',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "OSRS Loot Simulator - Monster Drop Calculator",
    description: "Free OSRS loot simulator. Calculate monster drop rates and probabilities with accurate game mechanics.",
    creator: '@osrs_loot_sim',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.json',
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col justify-center items-center`}
      >
        {children}
        <Footer />
      </body>
    </html>
  );
}
