import type { Metadata } from "next";
import { ClientShell } from "@/components/ClientShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "PUBG Madison AI Suite",
  description: "Unified hub for AI creative tools",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
