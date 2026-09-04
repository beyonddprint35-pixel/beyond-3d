const ADMIN_EMAIL = "beyonddprint35@gmail.com";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://bxxrgijespvwjarkdtwp.supabase.co";

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

async function supabaseRequest(path, options = {}) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is not configured.");

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Supabase request failed (${response.status}).`);
  }
  return data;
}

async function loadNotification(notificationId) {
  const query = new URLSearchParams({
    id: `eq.${notificationId}`,
    type: "eq.user_signup",
    select: "id,user_id,email,full_name,created_at,email_sent_at,email_message_id",
    limit: "1",
  });
  const rows = await supabaseRequest(`/rest/v1/menu_admin_notifications?${query}`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function markSent(notificationId, messageId) {
  const query = new URLSearchParams({ id: `eq.${notificationId}` });
  await supabaseRequest(`/rest/v1/menu_admin_notifications?${query}`, {
    method: "PATCH",
    body: JSON.stringify({
      email_sent_at: new Date().toISOString(),
      email_message_id: messageId || null,
      email_error: null,
    }),
  });
}

async function markError(notificationId, message) {
  try {
    const query = new URLSearchParams({ id: `eq.${notificationId}` });
    await supabaseRequest(`/rest/v1/menu_admin_notifications?${query}`, {
      method: "PATCH",
      body: JSON.stringify({ email_error: String(message || "Email delivery failed").slice(0, 1000) }),
    });
  } catch (error) {
    console.error("Could not store signup email error:", error);
  }
}

async function sendSignupEmail(notification) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  if (!from) throw new Error("EMAIL_FROM is not configured.");

  const name = String(notification.full_name || "").trim();
  const email = String(notification.email || "").trim();
  const signedUpAt = notification.created_at
    ? new Date(notification.created_at).toLocaleString("en-GB", { timeZone: "Asia/Jerusalem", dateStyle: "medium", timeStyle: "short" })
    : "Unknown";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [ADMIN_EMAIL],
      subject: `New Beyond signup${email ? ` — ${email}` : ""}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;background:#081426;padding:28px;color:#edf3ff">
          <div style="max-width:560px;margin:auto;background:#101f35;border:1px solid #263d60;border-radius:18px;padding:24px">
            <div style="font-size:12px;letter-spacing:.12em;color:#7fa1ff;font-weight:700">BEYOND · NEW SIGNUP</div>
            <h2 style="margin:10px 0 20px;font-size:24px;color:#fff">A new user joined Beyond</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:8px 0;color:#91a0b5">Name</td><td style="padding:8px 0;text-align:right;color:#fff;font-weight:600">${escapeHtml(name || "Not provided")}</td></tr>
              <tr><td style="padding:8px 0;color:#91a0b5">Email</td><td style="padding:8px 0;text-align:right;color:#fff;font-weight:600">${escapeHtml(email || "Not provided")}</td></tr>
              <tr><td style="padding:8px 0;color:#91a0b5">Signed up</td><td style="padding:8px 0;text-align:right;color:#fff">${escapeHtml(signedUpAt)} · Israel time</td></tr>
              <tr><td style="padding:8px 0;color:#91a0b5">User ID</td><td style="padding:8px 0;text-align:right;color:#b8c7de;font-size:11px">${escapeHtml(notification.user_id)}</td></tr>
            </table>
          </div>
        </div>`,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Resend failed (${response.status}).`);
  }
  return data;
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body = {};
  try { body = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { error: "Invalid JSON" }); }

  const notificationId = String(body.notification_id || "").trim();
  if (!isUuid(notificationId)) return json(400, { error: "Valid notification_id is required." });

  try {
    const notification = await loadNotification(notificationId);
    if (!notification) return json(404, { error: "Signup notification not found." });

    if (notification.email_sent_at) {
      return json(200, { ok: true, already_sent: true, message_id: notification.email_message_id || null });
    }

    const sent = await sendSignupEmail(notification);
    await markSent(notification.id, sent?.id || null);
    return json(200, { ok: true, sent_to: ADMIN_EMAIL, message_id: sent?.id || null });
  } catch (error) {
    console.error("Signup notification email failed:", error);
    await markError(notificationId, error?.message);
    return json(500, { error: error?.message || "Could not send signup notification email." });
  }
};
