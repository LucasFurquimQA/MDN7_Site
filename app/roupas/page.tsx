import RoupasCatalog from "./catalog";
import { readContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function RoupasPage() {
  const { content } = await readContent();
  return <RoupasCatalog content={content} />;
}
