export type AutoEvent = { id: string; title: string; url: string; source: string; city: string; published_at: string; created_at: string };

export const EVENT_CITIES = ["Campinas", "Ribeirão Preto", "São José do Rio Preto", "Sorocaba", "Bauru", "Piracicaba", "Jundiaí", "Franca", "São Carlos", "Araraquara", "Presidente Prudente", "Marília", "Limeira"];

const TOPIC = /encontro de (carros|motos|autom|ve[ií]culos)|car meet|carros antigos|autom[oó]veis antigos|carros cl[aá]ssicos|autom[oó]veis cl[aá]ssicos|autom[oó]vel|automobil|arrancada|drift|stock car|motovelocidade|kart|rally|rali|track ?day|passeio de (carros|motos|motociclistas)|moto ?clube|motociclismo|motociclistas|motos|tuning|rebaixados|hot ?rod|fusca|auto ?show|expo ?(auto|moto)|old ?cars|ve[ií]culos antigos|offroad|off-road|trilha/i;
const EVENT = /encontro|exposi[cç][aã]o|festival|show|corrida|etapa|campeonato|evento|copa|feira|passeio|arrancada|concentra[cç][aã]o|moto ?fest|motofest|rally|rali|competi[cç][aã]o|exposi|desfile|trackday|track day|abertura|inscri[cç]/i;
const NEGATIVE = /acidente|morre|morto|preso|presa|assalto|roubo|roubado|furto|furtado|apreendid|pol[ií]cia|multa|ipva|licita[cç][aã]o|recall|pre[cç]o|venda de|vaga|emprego|concession|promo[cç][aã]o|oferta|seminovo|homic[ií]dio|crime|tr[aâ]nsito|atropel|batida|colis[aã]o|incêndio|inc[eê]ndio|v[ií]tima|justi[cç]a|processo|furtam|roubam/i;

function normalize(text: string) { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function decode(text: string) {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (_, code: string) => {
    const map: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
    if (map[code.toLowerCase()]) return map[code.toLowerCase()];
    const value = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(value) && value > 0 && value < 0x110000 ? String.fromCodePoint(value) : "";
  });
}
const stripTags = (text: string) => decode(text).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const tag = (block: string, name: string) => block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? "";

type Candidate = { title: string; url: string; source: string; published: Date; text: string };

export function parseFeed(xml: string): Candidate[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  return items.flatMap(block => {
    const source = stripTags(tag(block, "source"));
    let title = stripTags(tag(block, "title"));
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)).trim();
    const url = stripTags(tag(block, "link"));
    const published = new Date(stripTags(tag(block, "pubDate")));
    if (!title || !/^https?:\/\//i.test(url) || Number.isNaN(published.getTime())) return [];
    return [{ title, url, source: source || new URL(url).hostname.replace(/^www\./, ""), published, text: `${title} ${stripTags(tag(block, "description"))}` }];
  });
}

export function classify(item: Candidate, city: string) {
  const title = normalize(item.title);
  const full = normalize(item.text);
  if (NEGATIVE.test(title)) return false;
  if (!TOPIC.test(title) || !EVENT.test(title)) return false;
  return full.includes(normalize(city));
}

const titleKey = (title: string) => normalize(title).replace(/[^a-z0-9]+/g, " ").trim().slice(0, 120);

function feedUrl(city: string) {
  const query = `("encontro de carros" OR "encontro de motos" OR "carros antigos" OR automobilismo OR arrancada OR "exposição de carros" OR motofest OR "stock car" OR "festival automotivo") "${city}" when:14d`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
}

const createTable = "CREATE TABLE IF NOT EXISTS auto_events (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, source TEXT NOT NULL, city TEXT NOT NULL, dedupe_key TEXT NOT NULL UNIQUE, published_at TEXT NOT NULL, created_at TEXT NOT NULL)";
let tableReady: Promise<unknown> | null = null;
async function ensureTable(db: D1Database) {
  tableReady ??= db.prepare(createTable).run().catch(error => { tableReady = null; throw error; });
  await tableReady;
}

export async function collectEvents(db: D1Database) {
  await ensureTable(db);
  const cutoff = Date.now() - 21 * 86_400_000;
  const now = new Date().toISOString();
  const rows: AutoEvent[] = [];
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const city of EVENT_CITIES) {
    try {
      const response = await fetch(feedUrl(city), { headers: { "User-Agent": "Midnigh7Club-EventsBot/1.0" } });
      if (!response.ok) continue;
      for (const item of parseFeed(await response.text())) {
        const key = titleKey(item.title);
        if (item.published.getTime() < cutoff || seen.has(key) || !classify(item, city)) continue;
        seen.add(key);
        keys.push(key);
        rows.push({ id: crypto.randomUUID(), title: item.title.slice(0, 220), url: item.url, source: item.source.slice(0, 80), city, published_at: item.published.toISOString(), created_at: now });
      }
    } catch (error) {
      console.error("Events feed failed", city, error instanceof Error ? error.message : "error");
    }
  }
  const statements = rows.map((row, i) => db.prepare("INSERT OR IGNORE INTO auto_events (id, title, url, source, city, dedupe_key, published_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(row.id, row.title, row.url, row.source, row.city, keys[i], row.published_at, row.created_at));
  statements.push(db.prepare("DELETE FROM auto_events WHERE published_at < ?").bind(new Date(Date.now() - 90 * 86_400_000).toISOString()));
  await db.batch(statements);
  return { found: rows.length };
}

export async function listEvents(db: D1Database, city?: string): Promise<{ events: AutoEvent[]; available: boolean }> {
  try {
    await ensureTable(db);
    const base = "SELECT id, title, url, source, city, published_at, created_at FROM auto_events";
    const statement = city && EVENT_CITIES.includes(city)
      ? db.prepare(`${base} WHERE city = ? ORDER BY published_at DESC LIMIT 100`).bind(city)
      : db.prepare(`${base} ORDER BY published_at DESC LIMIT 100`);
    const { results } = await statement.all<AutoEvent>();
    return { events: results, available: true };
  } catch (error) {
    console.error("Events could not be read", error instanceof Error ? error.message : "Database error");
    return { events: [], available: false };
  }
}

export async function deleteEvent(db: D1Database, id: string) {
  await ensureTable(db);
  const result = await db.prepare("DELETE FROM auto_events WHERE id = ?").bind(id).run();
  return result.meta.changes > 0;
}
