import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TopNav } from "@/components/layout/TopNav";
import { AgendaDataProvider } from "@/context/AgendaDataContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oralys",
  description: "Logiciel de gestion de cabinet dentaire",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <AgendaDataProvider>
          <TopNav />
          <main className="flex-1">{children}</main>
        </AgendaDataProvider>
      </body>
    </html>
  );
}
