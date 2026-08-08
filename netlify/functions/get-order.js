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
      process.env.SUPABASE_URL ||
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

    const orders = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error("Supabase order error:", orders);

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

    const fileUrl = await createSignedUrl({
      supabaseUrl,
      secretKey,
      bucket: "order-files",
      path: order.storage_path,
      expiresIn: 3600,
    });

    const aiModel3mfUrl = await createSignedUrl({
      supabaseUrl,
      secretKey,
      bucket: "ai-models",
      path: order.ai_model_3mf_storage_path,
      expiresIn: 3600,
    });

    const aiModelThumbnailUrl = await createSignedUrl({
      supabaseUrl,
      secretKey,
      bucket: "ai-models",
      path: order.ai_model_thumbnail_storage_path,
      expiresIn: 3600,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        order,
        fileUrl,
        aiModel3mfUrl:
          aiModel3mfUrl ||
          order.ai_model_3mf_url ||
          null,
        aiModelThumbnailUrl:
          aiModelThumbnailUrl ||
          order.ai_model_thumbnail_url ||
          null,
      }),
    };
  } catch (error) {
    console.error("Get order error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Unable to load order",
      }),
    };
  }
};

async function createSignedUrl({
  supabaseUrl,
  secretKey,
  bucket,
  path,
  expiresIn,
}) {
  if (!path) {
    return null;
  }

  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(
      bucket
    )}/${encodeStoragePath(path)}`,
    {
      method: "POST",
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expiresIn,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Signed URL error:", data);
    return null;
  }

  const signedPath =
    data.signedURL ||
    data.signedUrl;

  if (!signedPath) {
    return null;
  }

  if (signedPath.startsWith("http")) {
    return signedPath;
  }

  return `${supabaseUrl}/storage/v1${signedPath}`;
}

function encodeStoragePath(path) {
  return String(path)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}