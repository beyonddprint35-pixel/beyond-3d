import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = { ...CORS, "Content-Type": "application/json; charset=utf-8" };
const MAX_HTML_CHARS = 1_250_000;
const MAX_SOURCE_CHARS = 45_000;
const MAX_PAGES = 4;
const FETCH_TIMEOUT_MS = 12_000;
const MENU_TERMS = [
  "menu", "menus", "food", "drinks", "drink", "wine", "cocktail", "cocktails", "beverage", "beverages",
  "תפריט", "אוכל", "משקאות", "יין", "קוקטייל",
  "قائمة", "الطعام", "طعام", "مشروبات", "المشروبات", "نبيذ", "كوكتيل",
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function normalizeHost(hostname: string) {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

function isPrivateIpv4(host: string) {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function isPrivateIpv6(host: string) {
  const value = host.toLowerCase();
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd")
    || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb")
    || value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") || value.startsWith("::ffff:192.168.");
}

async function assertPublicUrl(url: URL) {
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http and https website links are supported.");
  if (url.username || url.password) throw new Error("Website links with embedded credentials are not supported.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("This website uses an unsupported network port.");

  const host = normalizeHost(url.hostname);
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Local or private website addresses are not supported.");
  }
  if (isPrivateIpv4(host) || (host.includes(":") && isPrivateIpv6(host))) {
    throw new Error("Local or private website addresses are not supported.");
  }

  // Resolve public hostnames when the Edge runtime exposes DNS resolution. This
  // prevents public DNS names from being used as a bridge to private networks.
  if (!host.includes(":") && !/^\d+(?:\.\d+){3}$/.test(host) && typeof Deno.resolveDns === "function") {
    try {
      const addresses = await Deno.resolveDns(host, "A");
      if (addresses.some(isPrivateIpv4)) throw new Error("Local or private website addresses are not supported.");
    } catch (error) {
      if (String(error).includes("private website")) throw error;
      // Some Edge regions do not expose DNS resolution. URL-level checks above
      // still block literals and known local hostnames; fetch remains sandboxed.
    }
  }
}

async function fetchHtml(inputUrl: URL, redirects = 0): Promise<{ url: URL; html: string }> {
  if (redirects > 4) throw new Error("This website redirects too many times.");
  await assertPublicUrl(inputUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(inputUrl, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.6",
        "User-Agent": "BEYOND-Menu-Importer/1.0 (+https://www.b3yondworld.com)",
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("The website took too long to respond.");
    throw new Error("BEYOND could not reach this website.");
  } finally {
    clearTimeout(timer);
  }

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get("location");
    if (!location) throw new Error("The website returned an invalid redirect.");
    return fetchHtml(new URL(location, inputUrl), redirects + 1);
  }
  if (!response.ok) throw new Error(`The website returned HTTP ${response.status}.`);

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("This link does not point to a readable website page.");
  }
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > 2_500_000) throw new Error("This website page is too large to import safely.");

  const html = (await response.text()).slice(0, MAX_HTML_CHARS);
  return { url: inputUrl, html };
}

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", copy: "©", reg: "®",
  };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function stripTags(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function visibleText(html: string) {
  const jsonLd = Array.from(html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
    .map((match) => match[1].replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  let value = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<(?:br|hr)\b[^>]*>/gi, "\n")
    .replace(/<\/(?:p|div|section|article|header|footer|main|nav|li|ul|ol|h[1-6]|tr|table|figure|figcaption)>/gi, "\n")
    .replace(/<\/(?:td|th)>/gi, " | ")
    .replace(/<[^>]+>/g, " ");

  value = decodeEntities(value)
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return [value, jsonLd ? `STRUCTURED DATA\n${jsonLd}` : ""].filter(Boolean).join("\n\n");
}

function discoverMenuLinks(html: string, baseUrl: URL) {
  const scored = new Map<string, number>();
  const anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const rawHref = decodeEntities(match[1]).trim();
    if (!rawHref || rawHref.startsWith("#") || /^(?:mailto|tel|javascript|data):/i.test(rawHref)) continue;
    let url: URL;
    try { url = new URL(rawHref, baseUrl); } catch { continue; }
    if (url.origin !== baseUrl.origin || !/^https?:$/.test(url.protocol)) continue;
    url.hash = "";
    const label = stripTags(match[2]).toLowerCase();
    const path = `${url.pathname} ${url.search}`.toLowerCase();
    let score = 0;
    for (const term of MENU_TERMS) {
      const needle = term.toLowerCase();
      if (label.includes(needle)) score += 8;
      if (path.includes(needle)) score += 5;
    }
    if (/pdf|download|order|delivery|reservation|booking|instagram|facebook|whatsapp/.test(path)) score -= 6;
    if (score > 0) scored.set(url.toString(), Math.max(score, scored.get(url.toString()) || 0));
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1]).map(([url]) => url).slice(0, MAX_PAGES - 1);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = String(body?.url || "").trim();
    if (!rawUrl) return json({ ok: false, error: "Add a website URL first." }, 400);

    let requestedUrl: URL;
    try { requestedUrl = new URL(rawUrl); }
    catch { return json({ ok: false, error: "Enter a valid website URL." }, 400); }

    const root = await fetchHtml(requestedUrl);
    const pageUrls = [root.url.toString(), ...discoverMenuLinks(root.html, root.url)];
    const pages: Array<{ url: string; title: string; text: string }> = [];

    for (let index = 0; index < pageUrls.length && pages.length < MAX_PAGES; index += 1) {
      try {
        const result = index === 0 ? root : await fetchHtml(new URL(pageUrls[index]));
        const titleMatch = result.html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? stripTags(titleMatch[1]) : result.url.hostname;
        const text = visibleText(result.html);
        if (text.length >= 120) pages.push({ url: result.url.toString(), title, text });
      } catch {
        // A secondary menu page can fail without discarding a readable root page.
      }
    }

    const chunks: string[] = [];
    const seen = new Set<string>();
    for (const page of pages) {
      const fingerprint = page.text.slice(0, 800).replace(/\s+/g, " ").toLowerCase();
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      chunks.push(`SOURCE PAGE: ${page.title}\nURL: ${page.url}\n${page.text}`);
    }

    const text = chunks.join("\n\n---\n\n").slice(0, MAX_SOURCE_CHARS).trim();
    const priceSignals = (text.match(/(?:₪|\$|€|£|\b(?:ILS|NIS|USD|EUR|GBP)\b)\s*\d|\d[\d.,]*\s*(?:₪|\$|€|£)/gi) || []).length;
    if (text.length < 300 || priceSignals === 0) {
      return json({
        ok: false,
        error: "We reached the website, but could not find enough readable menu content. Try a direct menu page URL or continue manually.",
        sourceUrl: root.url.toString(),
        pages: pages.map(({ url, title }) => ({ url, title })),
      }, 422);
    }

    return json({
      ok: true,
      sourceUrl: root.url.toString(),
      text,
      characters: text.length,
      priceSignals,
      pages: pages.map(({ url, title }) => ({ url, title })),
    });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Could not read this website." }, 400);
  }
});
