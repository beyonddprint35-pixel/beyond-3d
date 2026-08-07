exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Method not allowed",
      }),
    };
  }

  try {
    const providedPassword =
      event.headers["x-admin-password"];

    const correctPassword =
      process.env.ADMIN_PASSWORD;

    if (
      !providedPassword ||
      !correctPassword ||
      providedPassword !== correctPassword
    ) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "Unauthorized",
        }),
      };
    }

    const {
      orderId,
      status,
    } = JSON.parse(
      event.body || "{}"
    );

    const allowedStatuses = [
      "Submitted",
      "Quoted",
      "Accepted",
      "Printing",
      "Completed",
    ];

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Order ID is required",
        }),
      };
    }

    if (
      !status ||
      !allowedStatuses.includes(status)
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid order status",
        }),
      };
    }

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const serviceKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !supabaseUrl ||
      !serviceKey
    ) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error:
            "Missing Supabase configuration",
        }),
      };
    }

    const response =
      await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(
          orderId
        )}`,
        {
          method: "PATCH",

          headers: {
            apikey:
              serviceKey,

            Authorization:
              `Bearer ${serviceKey}`,

            "Content-Type":
              "application/json",

            Prefer:
              "return=representation",
          },

          body: JSON.stringify({
            status,
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Update status error:",
        data
      );

      return {
        statusCode: 500,

        body: JSON.stringify({
          error:
            "Could not update order status",
          details: data,
        }),
      };
    }

    if (!data.length) {
      return {
        statusCode: 404,

        body: JSON.stringify({
          error: "Order not found",
        }),
      };
    }

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        success: true,
        order: data[0],
      }),
    };
  } catch (error) {
    console.error(
      "Update order status error:",
      error
    );

    return {
      statusCode: 500,

      body: JSON.stringify({
        error:
          "Unable to update order status",
      }),
    };
  }
};