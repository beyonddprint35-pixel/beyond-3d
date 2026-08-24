exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const providedPassword = event.headers["x-admin-password"];
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (
      !providedPassword ||
      !correctPassword ||
      providedPassword !== correctPassword
    ) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid request body" }),
      };
    }

    const orderId = String(payload.orderId || "").trim();
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(orderId)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid order id" }),
      };
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://bxxrgijespvwjarkdtwp.supabase.co";
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!secretKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing SUPABASE_SECRET_KEY" }),
      };
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id`,
      {
        method: "DELETE",
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          Prefer: "return=representation",
        },
      }
    );

    const data = await response.json().catch(() => []);

    if (!response.ok) {
      console.error("Delete order Supabase error:", data);
      return {
        statusCode: response.status >= 400 && response.status < 500 ? 409 : 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error:
            response.status === 409
              ? "This order could not be deleted because other records still depend on it."
              : "Could not delete order",
          details: data,
        }),
      };
    }

    if (!Array.isArray(data) || data.length === 0) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Order not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, orderId }),
    };
  } catch (error) {
    console.error("Delete order error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unable to delete order" }),
    };
  }
};
