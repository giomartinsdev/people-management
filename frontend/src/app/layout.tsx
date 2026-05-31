import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NavSidebar } from "@/components/nav-sidebar";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "People Management",
  description: "Graph-based company people management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${geist.className} h-full bg-background text-foreground antialiased`}>
        <div className="flex h-full">
          <NavSidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
        <Toaster richColors />
      </body>
    </html>
  );
}
