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

function cleanText(value, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeCode(value) {
  const code = cleanText(value, 40).toUpperCase();
  if (!/^[A-Z0-9_-]{2,40}$/.test(code)) {
    throw new Error("Promo code can use letters, numbers, hyphens and underscores only.");
  }
  return code;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid promo date.");
  return date.toISOString();
}

function sanitizePromo(input) {
  if (!input || typeof input !== "object") throw new Error("Invalid promo payload.");

  const discount = Number(input.discount_percent);
  if (!(discount > 0 && discount <= 100)) {
    throw new Error("Discount must be between 1% and 100%.");
  }

  const durationType = ["once", "months", "forever"].includes(input.duration_type)
    ? input.duration_type
    : "once";

  let durationMonths = null;
  if (durationType === "months") {
    durationMonths = Number(input.duration_months);
    if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 120) {
      throw new Error("Discount duration must be between 1 and 120 months.");
    }
  }

  const validFrom = normalizeDate(input.valid_from);
  const validUntil = normalizeDate(input.valid_until);
  if (validFrom && validUntil && new Date(validUntil) <= new Date(validFrom)) {
    throw new Error("Promo end date must be after its start date.");
  }

  return {
    id: cleanText(input.id, 60) || null,
    name: cleanText(input.name, 80),
    code: normalizeCode(input.code),
    discount_percent: discount,
    duration_type: durationType,
    duration_months: durationMonths,
    valid_from: validFrom,
    valid_until: validUntil,
    is_active: input.is_active !== false,
  };
}

exports.handler = async function (event) {
  if (!["GET", "POST", "DELETE"].includes(event.httpMethod)) {
    return json(405, { error: "Method not allowed" });
  }

  if (!authorize(event)) return json(401, { error: "Unauthorized" });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://bxxrgijespvwjarkdtwp.supabase.co";
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) return json(500, { error: "Missing SUPABASE_SECRET_KEY" });

  const commonHeaders = {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };

  try {
    if (event.httpMethod === "GET") {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/menu_promo_codes?select=id,name,code,discount_percent,duration_type,duration_months,valid_from,valid_until,is_active,created_at,updated_at&order=created_at.desc`,
        { headers: commonHeaders }
      );
      const promos = await response.json();
      if (!response.ok) {
        console.error("Promo list error:", promos);
        return json(500, { error: "Could not load promo codes" });
      }
      return json(200, { success: true, promos });
    }

    const body = JSON.parse(event.body || "{}");

    if (event.httpMethod === "DELETE") {
      const id = cleanText(body.id, 60);
      if (!id) return json(400, { error: "Missing promo id" });

      const response = await fetch(
        `${supabaseUrl}/rest/v1/menu_promo_codes?id=eq.${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { ...commonHeaders, Prefer: "return=minimal" },
        }
      );
      if (!response.ok) {
        const details = await response.text();
        console.error("Promo delete error:", details);
        return json(500, { error: "Could not delete promo code" });
      }
      return json(200, { success: true });
    }

    const promo = sanitizePromo(body.promo);
    if (!promo.name) return json(400, { error: "Promo name is required" });

    const now = new Date().toISOString();
    let response;

    if (promo.id) {
      response = await fetch(
        `${supabaseUrl}/rest/v1/menu_promo_codes?id=eq.${encodeURIComponent(promo.id)}`,
        {
          method: "PATCH",
          headers: { ...commonHeaders, Prefer: "return=representation" },
          body: JSON.stringify({
            name: promo.name,
            code: promo.code,
            discount_percent: promo.discount_percent,
            duration_type: promo.duration_type,
            duration_months: promo.duration_months,
            valid_from: promo.valid_from,
            valid_until: promo.valid_until,
            is_active: promo.is_active,
            updated_at: now,
          }),
        }
      );
    } else {
      response = await fetch(`${supabaseUrl}/rest/v1/menu_promo_codes`, {
        method: "POST",
        headers: { ...commonHeaders, Prefer: "return=representation" },
        body: JSON.stringify({
          name: promo.name,
          code: promo.code,
          discount_percent: promo.discount_percent,
          duration_type: promo.duration_type,
          duration_months: promo.duration_months,
          valid_from: promo.valid_from,
          valid_until: promo.valid_until,
          is_active: promo.is_active,
          updated_at: now,
        }),
      });
    }

    const rows = await response.json();
    if (!response.ok) {
      const duplicate = response.status === 409 || String(rows?.message || "").toLowerCase().includes("duplicate");
      console.error("Promo save error:", rows);
      return json(duplicate ? 409 : 500, {
        error: duplicate ? "That promo code already exists." : "Could not save promo code",
      });
    }

    return json(200, { success: true, promo: Array.isArray(rows) ? rows[0] : rows });
  } catch (error) {
    console.error("Admin promo codes error:", error);
    return json(500, { error: error.message || "Unable to manage promo codes" });
  }
};
