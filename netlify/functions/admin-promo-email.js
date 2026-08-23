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

function cleanText(value, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function promoDurationLabel(promo) {
  if (promo.duration_type === "forever") return "for the lifetime of the subscription";
  if (promo.duration_type === "months") {
    const months = Number(promo.duration_months || 0);
    return `for ${months} month${months === 1 ? "" : "s"}`;
  }
  return "for 1 billing cycle";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function listAuthUsers(supabaseUrl, secretKey) {
  const users = [];
  const perPage = 200;

  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      {
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("Unable to list authenticated users:", data);
      throw new Error("Could not load authenticated users");
    }

    const pageUsers = Array.isArray(data?.users) ? data.users : [];
    users.push(...pageUsers);
    if (pageUsers.length < perPage) break;
  }

  return users
    .filter((user) => user?.id && user?.email)
    .map((user) => ({
      id: user.id,
      email: user.email,
      name:
        cleanText(user.user_metadata?.full_name, 100) ||
        cleanText(user.user_metadata?.name, 100) ||
        cleanText(user.email?.split("@")[0], 100),
      confirmed: Boolean(user.email_confirmed_at || user.confirmed_at),
      created_at: user.created_at || null,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

async function loadPromo(supabaseUrl, secretKey, promoId) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/restaurant_promo_codes?select=id,name,code,discount_percent,duration_type,duration_months,valid_from,expires_at,active&id=eq.${encodeURIComponent(promoId)}&limit=1`,
    {
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
    }
  );

  const rows = await response.json();
  if (!response.ok) {
    console.error("Promo email promo lookup error:", rows);
    throw new Error("Could not load promo code");
  }

  return rows?.[0] || null;
}

function buildEmail({ promo, recipient, siteUrl }) {
  const discount = Number(promo.discount_percent || 0);
  const duration = promoDurationLabel(promo);
  const validUntil = formatDate(promo.expires_at);
  const validFrom = formatDate(promo.valid_from);
  const firstName = cleanText(recipient.name, 100) || "there";
  const subject = `${discount}% off Beyond Menu — ${promo.code}`;

  const validityParts = [];
  if (validFrom) validityParts.push(`Available from ${validFrom}`);
  if (validUntil) validityParts.push(`Use by ${validUntil}`);
  const validity = validityParts.join(" · ");

  const html = `
  <div style="margin:0;background:#f4f7fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0d1b3a">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e4eaf3;border-radius:20px;overflow:hidden">
      <div style="padding:28px 30px;border-bottom:1px solid #e8edf5">
        <div style="font-size:13px;font-weight:800;letter-spacing:.18em">BEYOND</div>
      </div>
      <div style="padding:34px 30px">
        <p style="margin:0 0 14px;font-size:16px">Hi ${escapeHtml(firstName)},</p>
        <h1 style="margin:0 0 14px;font-size:30px;line-height:1.1;color:#0d1b3a">${discount}% off Beyond Menu</h1>
        <p style="margin:0 0 24px;color:#526684;line-height:1.65">${escapeHtml(promo.name || "A Beyond Menu offer")} — your discount applies ${escapeHtml(duration)}.</p>

        <div style="padding:22px;border:1px solid #dbe5f4;border-radius:16px;background:#f8faff;text-align:center">
          <div style="margin-bottom:7px;color:#7183a0;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Your promo code</div>
          <div style="font-family:Menlo,Consolas,monospace;font-size:28px;font-weight:800;letter-spacing:.08em;color:#285fe8">${escapeHtml(promo.code)}</div>
          ${validity ? `<div style="margin-top:10px;color:#7183a0;font-size:12px">${escapeHtml(validity)}</div>` : ""}
        </div>

        <p style="margin:24px 0;color:#526684;line-height:1.65">Enter this code when activating your Beyond Menu subscription.</p>
        <a href="${escapeHtml(siteUrl)}" style="display:inline-block;padding:13px 20px;border-radius:11px;background:#3478f6;color:#ffffff;text-decoration:none;font-weight:700">Open Beyond</a>
      </div>
      <div style="padding:18px 30px;background:#f8faff;color:#8290a6;font-size:11px;line-height:1.55">
        This offer was sent to your Beyond account email. Promo availability remains subject to the dates and status configured by Beyond.
      </div>
    </div>
  </div>`;

  const text = [
    `Hi ${firstName},`,
    "",
    `${discount}% off Beyond Menu`,
    `${promo.name || "Beyond Menu offer"} — ${duration}.`,
    `Promo code: ${promo.code}`,
    validity || "",
    "",
    "Enter this code when activating your Beyond Menu subscription.",
    siteUrl,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
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
      const users = await listAuthUsers(supabaseUrl, secretKey);
      return json(200, { success: true, users });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const from = cleanText(process.env.RESEND_FROM_EMAIL, 200);

    if (!resendKey) {
      return json(500, { error: "RESEND_API_KEY is not configured in Netlify." });
    }
    if (!from) {
      return json(500, { error: "RESEND_FROM_EMAIL is not configured in Netlify." });
    }

    const body = JSON.parse(event.body || "{}");
    const promoId = cleanText(body.promo_id, 60);
    const userIds = Array.isArray(body.user_ids)
      ? [...new Set(body.user_ids.map((id) => cleanText(id, 60)).filter(isUuid))]
      : [];

    if (!isUuid(promoId)) {
      return json(400, { error: "Invalid promo code id." });
    }
    if (!userIds.length) {
      return json(400, { error: "Select at least one authenticated user." });
    }
    if (userIds.length > 25) {
      return json(400, { error: "You can email up to 25 users at a time." });
    }

    const promo = await loadPromo(supabaseUrl, secretKey, promoId);
    if (!promo) return json(404, { error: "Promo code not found." });
    if (!promo.active) return json(400, { error: "Activate this promo code before emailing it." });

    const allUsers = await listAuthUsers(supabaseUrl, secretKey);
    const selectedUsers = allUsers.filter((user) => userIds.includes(user.id));
    if (!selectedUsers.length) {
      return json(400, { error: "None of the selected recipients are authenticated Beyond users." });
    }

    const siteUrl = cleanText(
      process.env.PUBLIC_SITE_URL || process.env.URL || "https://b3yondworld.com",
      300
    );

    const sent = [];
    const failed = [];

    for (const recipient of selectedUsers) {
      const email = buildEmail({ promo, recipient, siteUrl });
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [recipient.email],
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        sent.push({ user_id: recipient.id, email: recipient.email, id: result.id || null });
      } else {
        console.error("Resend promo email error:", recipient.email, result);
        failed.push({ user_id: recipient.id, email: recipient.email });
      }
    }

    return json(failed.length && !sent.length ? 502 : 200, {
      success: sent.length > 0,
      sent_count: sent.length,
      failed_count: failed.length,
      sent,
      failed,
    });
  } catch (error) {
    console.error("Admin promo email error:", error);
    return json(500, { error: error.message || "Unable to send promo email" });
  }
};
