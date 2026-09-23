export type Member = { id: number; instagram: string; username: string; name: string; bio: string; photo: string };
export type ClubContent = { instagram: string; story: string; members: Member[]; products: Product[]; roupasMaintenance: boolean };
export const defaultContent: ClubContent = {
  instagram: "https://www.instagram.com/midnigh7.club/",
  story: "O Midnigh7 Club nasceu de uma ideia simples: reunir pessoas que vivem a paixão por carros de verdade. Mais do que marcas, potência ou estilo, o que nos conecta são as histórias por trás de cada projeto e a vontade de compartilhar essa cultura.\n\nCom inspiração na cena automotiva japonesa e espaço para todas as origens, construímos um grupo em que amizade, respeito e paixão vêm sempre em primeiro lugar.",
  members: Array.from({ length: 7 }, (_, i) => ({ id: i + 1, instagram: "", username: "", name: "", bio: "", photo: "" })),
  products: [],
  roupasMaintenance: false,
};
export function instagramUsername(value: string): string | null {
  const input = value.trim();
  let username = input.replace(/^@/, "");
  if (/^https?:\/\//i.test(input)) {
    try {
      const url = new URL(input);
      if (!["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase()) || url.username || url.password || url.port) return null;
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length !== 1) return null;
      username = parts[0];
    } catch { return null; }
  }
  if (!/^[A-Za-z0-9_](?:[A-Za-z0-9_.]{0,28}[A-Za-z0-9_])?$/.test(username)) return null;
  if (["p", "reel", "reels", "stories", "explore", "accounts", "direct"].includes(username.toLowerCase())) return null;
  return username.toLowerCase();
}
export function instagramUrl(value: string) { const username = instagramUsername(value); return username ? `https://www.instagram.com/${username}/` : ""; }
export type Fit = "oversized" | "babylook";
export const MAX_PIECE_PHOTOS = 4;
export type ClothingPhotos = { images: string[]; cover: number };
export const emptyClothingPhotos: ClothingPhotos = { images: [], cover: 0 };
export type ClothingVariant = { type: string; cuts: string[]; photos?: Record<string, ClothingPhotos> };
export type Product = { id: string; name: string; edition: string; label: string; type: string; cuts: string[]; variants?: ClothingVariant[]; photo: string; cut?: string };
export const defaultProducts: Product[] = [
  { id: "real-01", name: "The real cars are fun", edition: "01", label: "Primeira edição", type: "Camiseta", cuts: ["Oversized", "Babylook"], photo: "" },
  { id: "real-02", name: "The real cars are fun", edition: "02", label: "Segunda edição", type: "Camiseta", cuts: ["Oversized", "Babylook"], photo: "" },
  { id: "real-03", name: "The real cars are fun", edition: "03", label: "Terceira edição", type: "Camiseta", cuts: ["Oversized", "Babylook"], photo: "" },
  { id: "reta-01", name: "Na reta até minha vó acelera", edition: "01", label: "Primeira edição", type: "Camiseta", cuts: ["Oversized", "Babylook"], photo: "" },
  { id: "reta-02", name: "Na reta até minha vó acelera", edition: "02", label: "Segunda edição", type: "Camiseta", cuts: ["Oversized", "Babylook"], photo: "" },
];
defaultContent.products = defaultProducts;
// Display the original mockups with production annotations outside the visible frame.
export const imageFrames: Record<string, { width: number; height: number; top: number; bottom: number }> = {
  "front-babylook": { width: 668, height: 704, top: 14, bottom: 638 },
  "front-oversized": { width: 696, height: 669, top: 40, bottom: 620 },
  "real-01-oversized": { width: 706, height: 660, top: 30, bottom: 610 },
  "real-02-oversized": { width: 689, height: 662, top: 40, bottom: 614 },
  "real-03-oversized": { width: 685, height: 655, top: 32, bottom: 607 },
  "reta-01-oversized": { width: 708, height: 666, top: 25, bottom: 603 },
  "reta-02-oversized": { width: 709, height: 670, top: 45, bottom: 624 },
  "real-01-babylook": { width: 663, height: 682, top: 20, bottom: 642 },
  "real-02-babylook": { width: 672, height: 649, top: 5, bottom: 632 },
  "real-03-babylook": { width: 655, height: 670, top: 13, bottom: 635 },
  "reta-01-babylook": { width: 709, height: 669, top: 17, bottom: 638 },
  "reta-02-babylook": { width: 706, height: 688, top: 14, bottom: 641 },
};
