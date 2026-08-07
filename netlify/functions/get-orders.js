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

    const response = await fetch(
      `${supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc`,
      {
        method: "GET",
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Supabase error:", data);

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Could not load orders",
          details: data,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        orders: data,
      }),
    };
  } catch (error) {
    console.error("Get orders error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Unable to load orders",
      }),
    };
  }
};
