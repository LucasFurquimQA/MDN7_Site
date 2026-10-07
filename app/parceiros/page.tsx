import type { Metadata } from "next";
import PartnersPage from "./partners";
import { readContent } from "@/lib/content";
import { listPartners } from "@/lib/partners";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Parceiros — Midnigh7 Club",
  description: "Conheça os parceiros do Midnigh7 Club.",
};

export default async function ParceirosPage() {
  const [{ content }, { partners, available }] = await Promise.all([readContent(), listPartners()]);
  return <PartnersPage partners={partners} instagram={content.instagram} available={available} />;
}
