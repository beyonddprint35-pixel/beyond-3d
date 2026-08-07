exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Method not allowed",
      }),
    };
  }

  try {
    // Check admin password
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

    // Get the order ID from the URL
    const orderId =
      event.queryStringParameters?.id;

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing order ID",
        }),
      };
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://bxxrgijespvwjarkdtwp.supabase.co";

    const secretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (!secretKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing SUPABASE_SECRET_KEY",
        }),
      };
    }

    // Get the order from Supabase
    const orderResponse = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(
        orderId
      )}&select=*`,
      {
        method: "GET",
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const orders =
      await orderResponse.json();

    if (!orderResponse.ok) {
      console.error(
        "Supabase order error:",
        orders
      );

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Could not load order",
        }),
      };
    }

    if (!orders.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Order not found",
        }),
      };
    }

    const order = orders[0];

    let fileUrl = null;

    // Create a temporary secure download link
    if (order.storage_path) {
      const signResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/sign/order-files/${encodeStoragePath(
          order.storage_path
        )}`,
        {
          method: "POST",
          headers: {
            apikey: secretKey,
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expiresIn: 3600,
          }),
        }
      );

      const signData =
        await signResponse.json();

      if (signResponse.ok) {
        const signedPath =
          signData.signedURL ||
          signData.signedUrl;

        if (signedPath) {
          if (
            signedPath.startsWith("http")
          ) {
            fileUrl = signedPath;
          } else {
            fileUrl =
              `${supabaseUrl}/storage/v1${signedPath}`;
          }
        }
      } else {
        console.error(
          "Signed URL error:",
          signData
        );
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        order,
        fileUrl,
      }),
    };
  } catch (error) {
    console.error(
      "Get order error:",
      error
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Unable to load order",
      }),
    };
  }
};

function encodeStoragePath(path) {
  return String(path)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}
