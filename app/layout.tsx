import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Midnigh7 Club — Movidos pela mesma paixão",
  description: "Diferentes projetos. A mesma paixão por carros. Conheça o Midnigh7 Club, nossas camisetas e saiba como participar pelo Instagram.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
