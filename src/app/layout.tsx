import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "margin — a quieter way into AI research",
  description:
    "Discover a finite stack of AI research papers, save what sparks your curiosity, and stop when you are done.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
