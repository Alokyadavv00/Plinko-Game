import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plinko — Provably Fair",
  description: "An interactive Plinko game with provably-fair commit-reveal RNG protocol and deterministic, seed-replayable outcomes.",
  keywords: ["plinko", "provably fair", "game", "rng", "verifiable"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
