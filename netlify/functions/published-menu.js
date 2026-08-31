function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      // CDN keeps a short fresh window, then may serve the last good response during outages.
      "Netlify-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=604800, stale-if-error=604800",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function cleanSlug(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

async function readRpc({ baseUrl, publicKey, name, slug }) {
  const response = await fetch(`${baseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: publicKey,
      Authorization: `Bearer ${publicKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_slug: slug }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`${name} failed (${response.status}).`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload || null;
}

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const slug = cleanSlug(event.queryStringParameters?.slug);
  if (!slug) return json(400, { error: "Missing menu" });

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://bxxrgijespvwjarkdtwp.supabase.co";
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!publicKey) return json(503, { error: "Menu temporarily unavailable" });

  try {
    // Immutable V3 publications own a slug first. Only when there is no V3
    // snapshot do we read the legacy published menu contract. This preserves
    // existing restaurant QR/NFC destinations during the Studio migration.
    let payload = await readRpc({
      baseUrl,
      publicKey,
      name: "get_published_menu_v3_by_slug",
      slug,
    });

    if (!payload) {
      payload = await readRpc({
        baseUrl,
        publicKey,
        name: "get_legacy_published_menu_v3_by_slug",
        slug,
      });
    }

    if (!payload) return json(404, { error: "Menu not found" });

    const identity = payload.versionId || (payload.legacy && payload.siteId ? `legacy-${payload.siteId}` : "unknown");
    return json(200, payload, {
      ETag: `\"menu-${identity}\"`,
      "X-Content-Type-Options": "nosniff",
      "X-Beyond-Menu-Source": payload.legacy ? "legacy" : "versioned",
    });
  } catch (error) {
    console.error("Published menu endpoint error", error?.status || "network", error?.payload || error);
    return json(503, { error: "Menu temporarily unavailable" });
  }
};
