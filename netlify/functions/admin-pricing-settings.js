const SETTINGS_KEY = "menu_pricing_plans";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function authorize(event) {
  const provided = event.headers["x-admin-password"];
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(provided && expected && provided === expected);
}

function cleanText(value, max = 240) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function sanitizeFeature(feature) {
  return {
    en: cleanText(feature?.en, 160),
    he: cleanText(feature?.he, 160),
  };
}

function sanitizePlan(plan, fallbackId) {
  const features = Array.isArray(plan?.features)
    ? plan.features.slice(0, 20).map(sanitizeFeature).filter((feature) => feature.en || feature.he)
    : [];

  return {
    id: fallbackId,
    name_en: cleanText(plan?.name_en, 60),
    name_he: cleanText(plan?.name_he, 60),
    description_en: cleanText(plan?.description_en, 260),
    description_he: cleanText(plan?.description_he, 260),
    price: cleanText(plan?.price, 40),
    period_en: cleanText(plan?.period_en, 60),
    period_he: cleanText(plan?.period_he, 60),
    cta_en: cleanText(plan?.cta_en, 80),
    cta_he: cleanText(plan?.cta_he, 80),
    recommended: Boolean(plan?.recommended),
    features,
  };
}

function sanitizePricing(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid pricing payload");
  }

  const plans = Array.isArray(input.plans) ? input.plans : [];
  const basic = plans.find((plan) => plan?.id === "basic") || plans[0] || {};
  const premium = plans.find((plan) => plan?.id === "premium") || plans[1] || {};

  return {
    headline_en: cleanText(input.headline_en, 120),
    headline_he: cleanText(input.headline_he, 120),
    subheadline_en: cleanText(input.subheadline_en, 260),
    subheadline_he: cleanText(input.subheadline_he, 260),
    plans: [
      sanitizePlan(basic, "basic"),
      sanitizePlan(premium, "premium"),
    ],
  };
}

exports.handler = async function (event) {
  if (!["GET", "POST"].includes(event.httpMethod)) {
    return json(405, { error: "Method not allowed" });
  }

  if (!authorize(event)) {
    return json(401, { error: "Unauthorized" });
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://bxxrgijespvwjarkdtwp.supabase.co";
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    return json(500, { error: "Missing SUPABASE_SECRET_KEY" });
  }

  try {
    if (event.httpMethod === "GET") {
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

      if (!response.ok) {
        console.error("Pricing settings read error:", rows);
        return json(500, { error: "Could not load pricing settings" });
      }

      let pricing = null;
      if (rows?.[0]?.value) {
        try {
          pricing = JSON.parse(rows[0].value);
        } catch (error) {
          console.error("Stored pricing JSON is invalid:", error);
        }
      }

      return json(200, { success: true, pricing });
    }

    const body = JSON.parse(event.body || "{}");
    const pricing = sanitizePricing(body.pricing);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/app_settings?on_conflict=key`,
      {
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
            value: JSON.stringify(pricing),
            updated_at: new Date().toISOString(),
          },
        ]),
      }
    );

    const saved = await response.json();

    if (!response.ok) {
      console.error("Pricing settings save error:", saved);
      return json(500, { error: "Could not save pricing settings", details: saved });
    }

    return json(200, { success: true, pricing });
  } catch (error) {
    console.error("Admin pricing settings error:", error);
    return json(500, { error: error.message || "Unable to update pricing settings" });
  }
};
