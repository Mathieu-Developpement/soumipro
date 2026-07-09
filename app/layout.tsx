import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoumiPro | Vos soumissions, générées par l'IA",
  description:
    "Générez des soumissions professionnelles en quelques minutes, à partir d'un texte libre ou d'un formulaire structuré.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr-CA">
      <body>{children}</body>
    </html>
  );
}
