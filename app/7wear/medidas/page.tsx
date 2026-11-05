import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Tabela de Medidas — Midnigh7 Wear",
};

export default function MedidasPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black">
      <Image
        src="/7wear/medidas.png"
        width={1152}
        height={768}
        alt="Tabela de medidas Midnigh7 Wear"
        className="block h-auto max-h-screen max-w-full object-contain"
        unoptimized
      />
    </main>
  );
}
