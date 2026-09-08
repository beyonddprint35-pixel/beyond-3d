const SETTINGS_KEY = "admin_cost_center";
const PROVIDER_IDS = ["openai", "netlify", "codespaces", "supabase"];

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function authorize(event) {
  const provided = event.headers["x-admin-password"];
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(provided && expected && provided === expected);
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function sanitizeSettings(input) {
  const providers = {};
  PROVIDER_IDS.forEach((id) => {
    const source = input?.providers?.[id] || {};
    providers[id] = {
      budget_usd: safeNumber(source.budget_usd, 0),
      manual_spend_usd: safeNumber(source.manual_spend_usd, 0),
    };
  });
  return { providers };
}

function utilization(spend, budget) {
  if (!(budget > 0)) return null;
  return Math.max(0, (spend / budget) * 100);
}

function monthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date();
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    label: now.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    startUnix: Math.floor(start.getTime() / 1000),
    endUnix: Math.floor(end.getTime() / 1000) + 1,
  };
}

async function readSettings(supabaseUrl, secretKey) {
  if (!secretKey) return sanitizeSettings({});
  const response = await fetch(
    `${supabaseUrl}/rest/v1/app_settings?select=value&key=eq.${SETTINGS_KEY}&limit=1`,
    {
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
    }
  );
  const rows = await response.json();
  if (!response.ok) throw new Error("Could not load cost-center settings");
  if (!rows?.[0]?.value) return sanitizeSettings({});
  try {
    return sanitizeSettings(JSON.parse(rows[0].value));
  } catch {
    return sanitizeSettings({});
  }
}

async function writeSettings(supabaseUrl, secretKey, settings) {
  if (!secretKey) throw new Error("Missing SUPABASE_SECRET_KEY");
  const response = await fetch(`${supabaseUrl}/rest/v1/app_settings?on_conflict=key`, {
    method: "POST",
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([
      {
        key: SETTINGS_KEY,
        value: JSON.stringify(settings),
        updated_at: new Date().toISOString(),
      },
    ]),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || "Could not save cost-center settings");
}

function manualProvider(id, name, config, note) {
  const spend = safeNumber(config.manual_spend_usd, 0);
  const budget = safeNumber(config.budget_usd, 0);
  return {
    id,
    name,
    source: "manual",
    connected: false,
    spend_usd: spend,
    budget_usd: budget,
    utilization_pct: utilization(spend, budget),
    note,
    details: [],
  };
}

async function loadOpenAI(config, range) {
  const budget = safeNumber(config.budget_usd, 0);
  const manual = safeNumber(config.manual_spend_usd, 0);
  const adminKey = process.env.OPENAI_ADMIN_KEY || process.env.OPENAI_ADMIN_API_KEY;

  if (!adminKey) {
    return {
      id: "openai",
      name: "OpenAI API",
      source: manual > 0 ? "manual" : "setup",
      connected: false,
      spend_usd: manual,
      budget_usd: budget,
      utilization_pct: utilization(manual, budget),
      note: "Add OPENAI_ADMIN_KEY to Netlify to sync organization costs automatically.",
      details: [],
    };
  }

  try {
    let page = "";
    let spend = 0;
    const lineItems = new Map();
    let loops = 0;
    do {
      const url = new URL("https://api.openai.com/v1/organization/costs");
      url.searchParams.set("start_time", String(range.startUnix));
      url.searchParams.set("end_time", String(range.endUnix));
      url.searchParams.set("bucket_width", "1d");
      url.searchParams.set("limit", "31");
      url.searchParams.append("group_by", "line_item");
      if (page) url.searchParams.set("page", page);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${adminKey}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || `OpenAI returned ${response.status}`);

      (data.data || []).forEach((bucket) => {
        (bucket.results || []).forEach((result) => {
          const amount = safeNumber(result?.amount?.value, 0);
          spend += amount;
          const label = result.line_item || "API usage";
          lineItems.set(label, (lineItems.get(label) || 0) + amount);
        });
      });
      page = data.has_more ? data.next_page || "" : "";
      loops += 1;
    } while (page && loops < 8);

    return {
      id: "openai",
      name: "OpenAI API",
      source: "live",
      connected: true,
      spend_usd: spend,
      budget_usd: budget,
      utilization_pct: utilization(spend, budget),
      note: "Live month-to-date organization cost from OpenAI.",
      details: [...lineItems.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, amount]) => ({ label, value: amount, unit: "USD" })),
    };
  } catch (error) {
    return {
      id: "openai",
      name: "OpenAI API",
      source: manual > 0 ? "manual" : "error",
      connected: false,
      spend_usd: manual,
      budget_usd: budget,
      utilization_pct: utilization(manual, budget),
      note: `Live sync failed: ${error.message}`,
      details: [],
    };
  }
}

async function loadCodespaces(config, range) {
  const budget = safeNumber(config.budget_usd, 0);
  const manual = safeNumber(config.manual_spend_usd, 0);
  const token = process.env.GITHUB_BILLING_TOKEN;
  const username = process.env.GITHUB_BILLING_USERNAME;

  if (!token || !username) {
    return {
      id: "codespaces",
      name: "GitHub Codespaces",
      source: manual > 0 ? "manual" : "setup",
      connected: false,
      spend_usd: manual,
      budget_usd: budget,
      utilization_pct: utilization(manual, budget),
      note: "Add GITHUB_BILLING_TOKEN and GITHUB_BILLING_USERNAME to sync Codespaces billing.",
      details: [],
    };
  }

  try {
    const url = new URL(`https://api.github.com/users/${encodeURIComponent(username)}/settings/billing/usage/summary`);
    url.searchParams.set("year", String(range.year));
    url.searchParams.set("month", String(range.month));
    url.searchParams.set("product", "Codespaces");

    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "Beyond-Admin-Cost-Center",
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || `GitHub returned ${response.status}`);

    const items = Array.isArray(data.usageItems) ? data.usageItems : [];
    const spend = items.reduce((sum, item) => sum + safeNumber(item.netAmount, 0), 0);
    const details = items.slice(0, 8).map((item) => ({
      label: String(item.sku || item.product || "Codespaces usage").replace(/^codespaces[_-]?/i, ""),
      value: safeNumber(item.grossQuantity, 0),
      unit: item.unitType || "units",
      cost_usd: safeNumber(item.netAmount, 0),
    }));

    return {
      id: "codespaces",
      name: "GitHub Codespaces",
      source: "live",
      connected: true,
      spend_usd: spend,
      budget_usd: budget,
      utilization_pct: utilization(spend, budget),
      note: "Live month-to-date billing summary from GitHub.",
      details,
    };
  } catch (error) {
    return {
      id: "codespaces",
      name: "GitHub Codespaces",
      source: manual > 0 ? "manual" : "error",
      connected: false,
      spend_usd: manual,
      budget_usd: budget,
      utilization_pct: utilization(manual, budget),
      note: `Live sync failed: ${error.message}`,
      details: [],
    };
  }
}

async function buildSnapshot(settings) {
  const range = monthRange();
  const [openai, codespaces] = await Promise.all([
    loadOpenAI(settings.providers.openai, range),
    loadCodespaces(settings.providers.codespaces, range),
  ]);

  const netlify = manualProvider(
    "netlify",
    "Netlify",
    settings.providers.netlify,
    "Netlify usage is tracked in the Netlify billing dashboard; enter the current monthly amount here until a billing API is connected."
  );
  const supabase = manualProvider(
    "supabase",
    "Supabase",
    settings.providers.supabase,
    "Enter the current monthly Supabase amount here. The cost center is ready for a future live billing connector."
  );

  const providers = [openai, netlify, codespaces, supabase];
  const totalSpend = providers.reduce((sum, provider) => sum + safeNumber(provider.spend_usd, 0), 0);
  const totalBudget = providers.reduce((sum, provider) => sum + safeNumber(provider.budget_usd, 0), 0);

  return {
    period: range.label,
    generated_at: new Date().toISOString(),
    providers,
    totals: {
      spend_usd: totalSpend,
      budget_usd: totalBudget,
      remaining_usd: totalBudget > 0 ? Math.max(0, totalBudget - totalSpend) : null,
      utilization_pct: utilization(totalSpend, totalBudget),
      live_connections: providers.filter((provider) => provider.source === "live").length,
    },
  };
}

exports.handler = async function (event) {
  if (!["GET", "POST"].includes(event.httpMethod)) return json(405, { error: "Method not allowed" });
  if (!authorize(event)) return json(401, { error: "Unauthorized" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bxxrgijespvwjarkdtwp.supabase.co";
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  try {
    let settings = await readSettings(supabaseUrl, secretKey);

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      settings = sanitizeSettings(body.settings || {});
      await writeSettings(supabaseUrl, secretKey, settings);
    }

    const snapshot = await buildSnapshot(settings);
    return json(200, { success: true, settings, ...snapshot });
  } catch (error) {
    console.error("Admin costs error:", error);
    return json(500, { error: error.message || "Unable to load platform costs" });
  }
};
