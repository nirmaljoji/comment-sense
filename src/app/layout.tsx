"use client";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Navbar, RequestStatsProvider } from "@/components/ui/navbar";
import { Toaster } from 'sonner';
import { usePathname } from 'next/navigation';

const geist = Geist({ subsets: ["latin"] });


function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <RequestStatsProvider>
      {!isHomePage && <Navbar />}
      {children}
    </RequestStatsProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <RootLayoutContent>
          {children}
        </RootLayoutContent>
        <Toaster />
      </body>
    </html>
  );
}
