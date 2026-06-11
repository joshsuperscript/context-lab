import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Context Hub — Superscript",
  description: "Context repository authoring and review",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full" style={{ fontFamily: "var(--font-sans)", background: "var(--ss-paper)", color: "var(--ss-black)" }}>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
