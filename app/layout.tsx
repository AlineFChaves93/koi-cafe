import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Koi Café — alimente o cardume",
  description: "Experiência 2D de alimentar carpas de cima: mire, solte a ração e veja o cardume saltar. Rações diárias grátis, recompensas e Clube Nishiki.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* the boy swaps to the throw pose on the first feed — fetch and decode
            both poses up front so the first throw doesn't stall the frame pipeline */}
        <link rel="preload" as="image" href="/boy-idle.png?v=3" />
        <link rel="preload" as="image" href="/boy-throw.png?v=3" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
