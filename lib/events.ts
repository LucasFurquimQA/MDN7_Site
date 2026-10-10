export type AutoEvent = { id: string; title: string; url: string; source: string; city: string; published_at: string; created_at: string };

export const EVENT_CITIES = ["Campinas", "Ribeirão Preto", "São José do Rio Preto", "Sorocaba", "Bauru", "Piracicaba", "Jundiaí", "Franca", "São Carlos", "Araraquara", "Presidente Prudente", "Marília", "Limeira"];

const TOPIC = /encontro de (carros|motos|autom|ve[ií]culos)|car meet|carros antigos|autom[oó]veis antigos|carros cl[aá]ssicos|autom[oó]veis cl[aá]ssicos|autom[oó]vel|automobil|arrancada de (carros|motos)|racha|drift|stock car|motovelocidade|kart|rally|rali|track ?day|passeio de (carros|motos|motociclistas)|moto ?clube|motociclismo|motociclistas|motos|tuning|rebaixados|hot ?rod|fusca|auto ?show|expo ?(auto|moto)|old ?cars|ve[ií]culos antigos|offroad|off-road|trilha/i;
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

const FRESH_DAYS = 14;
const MONTHS = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// Procura uma data explícita do evento ("dia 26 de julho", "26/07") e descarta se já passou.
export function mentionsPastDate(item: Candidate, now = new Date()) {
  const text = normalize(item.text);
  const dates: Date[] = [];
  const toDate = (day: number, month: number, year?: number) => {
    if (day < 1 || day > 31 || month < 0 || month > 11) return;
    let y = year ?? item.published.getUTCFullYear();
    if (y < 100) y += 2000;
    let date = new Date(Date.UTC(y, month, day, 23, 59));
    if (year === undefined && date.getTime() < item.published.getTime() - 60 * 86_400_000) date = new Date(Date.UTC(y + 1, month, day, 23, 59));
    dates.push(date);
  };
  for (const m of text.matchAll(/\b(\d{1,2})\s*(?:o|º)?\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?/g)) toDate(+m[1], MONTHS.indexOf(m[2]), m[3] ? +m[3] : undefined);
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) toDate(+m[1], +m[2] - 1, m[3] ? +m[3] : undefined);
  return dates.length > 0 && Math.max(...dates.map(date => date.getTime())) < now.getTime() - 86_400_000;
}

export function classify(item: Candidate, city: string, requireCity = true) {
  const title = normalize(item.title);
  if (NEGATIVE.test(title)) return false;
  if (!TOPIC.test(title) || !EVENT.test(title)) return false;
  if (!requireCity) return true;
  return new RegExp(`(^|[^\\p{L}])${city.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`, "u").test(item.text.toLowerCase());
}

const titleKey = (title: string) => normalize(title).replace(/[^a-z0-9]+/g, " ").trim().slice(0, 120);

type Source = { city: string; url: string; requireCity: boolean };

function googleUrl(city: string) {
  const query = `("encontro de carros" OR "encontro de motos" OR "carros antigos" OR automobilismo OR "exposição de carros" OR motofest OR "stock car" OR "festival automotivo") "${city}" when:14d`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
}

const PORTALS: { city: string; host: string }[] = [
  { city: "Campinas", host: "campinas.com.br" },
  { city: "Presidente Prudente", host: "www.oimparcial.com.br" },
  { city: "Limeira", host: "www.jornaldelimeira.com.br" },
  { city: "Ribeirão Preto", host: "www.tribunaribeirao.com.br" },
];
const PORTAL_QUERIES = ["encontro de carros", "carros antigos", "automobilismo"];

function sources(): Source[] {
  const portals = PORTALS.flatMap(({ city, host }) => PORTAL_QUERIES.map(query => ({ city, requireCity: true, url: `https://${host}/?s=${encodeURIComponent(query)}&feed=rss2` })));
  return [...portals, ...EVENT_CITIES.map(city => ({ city, requireCity: true, url: googleUrl(city) }))];
}

const createTable = "CREATE TABLE IF NOT EXISTS auto_events (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, source TEXT NOT NULL, city TEXT NOT NULL, dedupe_key TEXT NOT NULL UNIQUE, published_at TEXT NOT NULL, created_at TEXT NOT NULL)";
let tableReady: Promise<unknown> | null = null;
async function ensureTable(db: D1Database) {
  tableReady ??= db.prepare(createTable).run().catch(error => { tableReady = null; throw error; });
  await tableReady;
}

export async function collectEvents(db: D1Database) {
  await ensureTable(db);
  const cutoff = Date.now() - FRESH_DAYS * 86_400_000;
  const now = new Date().toISOString();
  const rows: AutoEvent[] = [];
  const keys: string[] = [];
  const seen = new Set<string>();
  let feedsOk = 0, feedsFailed = 0, scanned = 0;
  let lastError = "";
  const fetched = await Promise.all(sources().map(async source => {
    try {
      const response = await fetch(source.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Midnigh7ClubEventsBot/1.0)" }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { source, items: parseFeed(await response.text()) };
    } catch (error) {
      feedsFailed++;
      lastError = error instanceof Error ? error.message : "erro";
      return null;
    }
  }));
  for (const result of fetched) {
    if (!result) continue;
    feedsOk++;
    for (const item of result.items) {
      scanned++;
      const key = titleKey(item.title);
      if (item.published.getTime() < cutoff || seen.has(key) || mentionsPastDate(item) || !classify(item, result.source.city, result.source.requireCity)) continue;
      seen.add(key);
      keys.push(key);
      rows.push({ id: crypto.randomUUID(), title: item.title.slice(0, 220), url: item.url, source: item.source.slice(0, 80), city: result.source.city, published_at: item.published.toISOString(), created_at: now });
    }
  }  const statements = rows.map((row, i) => db.prepare("INSERT OR IGNORE INTO auto_events (id, title, url, source, city, dedupe_key, published_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(row.id, row.title, row.url, row.source, row.city, keys[i], row.published_at, row.created_at));
  statements.push(db.prepare("DELETE FROM auto_events WHERE published_at < ?").bind(new Date(Date.now() - 30 * 86_400_000).toISOString()));
  const results = await db.batch(statements);
  const added = results.slice(0, rows.length).reduce((sum, result) => sum + (result.meta.changes ?? 0), 0);
  return { found: rows.length, added, scanned, feedsOk, feedsFailed, lastError };
}

export async function listEvents(db: D1Database, city?: string): Promise<{ events: AutoEvent[]; available: boolean }> {
  try {
    await ensureTable(db);
    const since = new Date(Date.now() - FRESH_DAYS * 86_400_000).toISOString();
    const base = "SELECT id, title, url, source, city, published_at, created_at FROM auto_events WHERE published_at >= ?";
    const statement = city && EVENT_CITIES.includes(city)
      ? db.prepare(`${base} AND city = ? ORDER BY published_at DESC LIMIT 100`).bind(since, city)
      : db.prepare(`${base} ORDER BY published_at DESC LIMIT 100`).bind(since);
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
