import type { Metadata } from "next";
import RoupasCatalog from "../roupas/catalog";
import RoupasMaintenance from "../roupas/maintenance";
import { readContent } from "@/lib/content";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Midnigh7 Wear — Midnigh7 Club",
  description: "Conheça as peças da Midnigh7 Wear.",
};

export default async function Midnigh7WearPage() {
  const { content } = await readContent();
  if (content.shopUrl) redirect(content.shopUrl);
  if (content.roupasMaintenance) return <RoupasMaintenance instagram={content.instagram} />;
  return <RoupasCatalog content={content} />;
}
