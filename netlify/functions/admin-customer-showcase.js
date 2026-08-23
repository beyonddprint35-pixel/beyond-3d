const SETTINGS_KEY = "homepage_customer_showcase";

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

function sanitizeConfig(input) {
  const ids = Array.isArray(input?.selected_site_ids)
    ? input.selected_site_ids
        .map((id) => String(id || "").trim())
        .filter(Boolean)
        .slice(0, 50)
    : [];

  return {
    enabled: Boolean(input?.enabled),
    selected_site_ids: [...new Set(ids)],
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

  const headers = {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
  };

  try {
    if (event.httpMethod === "GET") {
      const [settingsResponse, sitesResponse] = await Promise.all([
        fetch(
          `${supabaseUrl}/rest/v1/app_settings?select=value&key=eq.${SETTINGS_KEY}&limit=1`,
          { headers }
        ),
        fetch(
          `${supabaseUrl}/rest/v1/menu_sites?select=id,name,slug,logo_url,published&published=eq.true&order=created_at.asc`,
          { headers }
        ),
      ]);

      const [settingRows, sites] = await Promise.all([
        settingsResponse.json(),
        sitesResponse.json(),
      ]);

      if (!settingsResponse.ok || !sitesResponse.ok) {
        console.error("Customer showcase read error:", settingRows, sites);
        return json(500, { error: "Could not load customer showcase settings" });
      }

      let config = { enabled: false, selected_site_ids: [] };
      if (settingRows?.[0]?.value) {
        try {
          config = sanitizeConfig(JSON.parse(settingRows[0].value));
        } catch (error) {
          console.error("Stored customer showcase JSON is invalid:", error);
        }
      }

      return json(200, { success: true, config, sites: sites || [] });
    }

    const body = JSON.parse(event.body || "{}");
    let config = sanitizeConfig(body.config);

    if (config.selected_site_ids.length) {
      const encodedIds = config.selected_site_ids.map(encodeURIComponent).join(",");
      const sitesResponse = await fetch(
        `${supabaseUrl}/rest/v1/menu_sites?select=id&id=in.(${encodedIds})&published=eq.true`,
        { headers }
      );
      const sites = await sitesResponse.json();

      if (!sitesResponse.ok) {
        return json(500, { error: "Could not validate selected customer menus" });
      }

      const allowedIds = new Set((sites || []).map((site) => site.id));
      config = {
        ...config,
        selected_site_ids: config.selected_site_ids.filter((id) => allowedIds.has(id)),
      };
    }

    const saveResponse = await fetch(
      `${supabaseUrl}/rest/v1/app_settings?on_conflict=key`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify([
          {
            key: SETTINGS_KEY,
            value: JSON.stringify(config),
            updated_at: new Date().toISOString(),
          },
        ]),
      }
    );

    const saved = await saveResponse.json();

    if (!saveResponse.ok) {
      console.error("Customer showcase save error:", saved);
      return json(500, { error: "Could not save customer showcase settings", details: saved });
    }

    return json(200, { success: true, config });
  } catch (error) {
    console.error("Admin customer showcase error:", error);
    return json(500, { error: error.message || "Unable to update customer showcase" });
  }
};
