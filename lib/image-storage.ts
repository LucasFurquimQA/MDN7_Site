export const MAX_IMAGE_SIZE = 1_500_000;

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function isAllowedImageType(type: string) {
  return allowedTypes.has(type);
}

export function hasValidImageSignature(bytes: Uint8Array, type: string) {
  switch (type) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
    case "image/webp":
      return bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
    case "image/gif":
      return bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.subarray(0, 6)));
    default:
      return false;
  }
}

export function imageExtension(type: string) {
  return type === "image/jpeg" ? "jpg" : type.slice("image/".length);
}

export async function uploadImage(file: File) {
  if (!isAllowedImageType(file.type)) throw new Error("Selecione um arquivo JPEG, PNG, WebP ou GIF.");
  if (file.size > MAX_IMAGE_SIZE) throw new Error("A foto deve ter no máximo 1,5 MB.");
  const form = new FormData();
  form.set("file", file);
  const response = await fetch("/api/images", { method: "POST", body: form });
  const data = await response.json() as { error?: string; url?: string };
  if (!response.ok || !data.url) throw new Error(data.error || "Não foi possível enviar a foto.");
  return data.url;
}
