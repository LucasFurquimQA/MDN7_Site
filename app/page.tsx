import ClubSite from "./site";
import { readContent } from "@/lib/content";
export const dynamic = "force-dynamic";
export default async function Home() {
  const { content } = await readContent();
  return <ClubSite content={content} />;
}
