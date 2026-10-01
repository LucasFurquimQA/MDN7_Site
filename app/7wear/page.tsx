import RoupasCatalog from "../roupas/catalog";
import RoupasMaintenance from "../roupas/maintenance";
import { readContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Midnigh7WearPage() {
  const { content } = await readContent();
  if (content.roupasMaintenance) return <RoupasMaintenance instagram={content.instagram} />;
  return <RoupasCatalog content={content} />;
}
