import RoupasCatalog from "./catalog";
import RoupasMaintenance from "./maintenance";
import { readContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function RoupasPage() {
  const { content } = await readContent();
  if (content.roupasMaintenance) return <RoupasMaintenance instagram={content.instagram} />;
  return <RoupasCatalog content={content} />;
}
