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

    const body = JSON.parse(
      event.body || "{}"
    );

    const {
      orderId,
      filamentGrams,
      printHours,
      pricePerGram,
      extraCharge,
      deliveryCharge,
      quoteTotal,
    } = body;

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing order ID",
        }),
      };
    }

    const grams =
      Number(filamentGrams || 0);

    const hours =
      Number(printHours || 0);

    const pricePerGramNumber =
      Number(pricePerGram || 1);

    const extra =
      Number(extraCharge || 0);

    const delivery =
      Number(deliveryCharge || 0);

    const total =
      Number(quoteTotal || 0);

    if (
      grams < 0 ||
      hours < 0 ||
      pricePerGramNumber < 0 ||
      extra < 0 ||
      delivery < 0 ||
      total < 0
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "Quote values cannot be negative",
        }),
      };
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const secretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !supabaseUrl ||
      !secretKey
    ) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error:
            "Missing Supabase configuration",
        }),
      };
    }

    const updateResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(
          orderId
        )}`,
        {
          method: "PATCH",
          headers: {
            apikey: secretKey,
            Authorization:
              `Bearer ${secretKey}`,
            "Content-Type":
              "application/json",
            Prefer:
              "return=representation",
          },
          body: JSON.stringify({
            filament_grams:
              grams || null,

            print_hours:
              hours || null,

            price_per_gram:
              pricePerGramNumber,

            extra_charge:
              extra,

            delivery_charge:
              delivery,

            quote_total:
              total,

            quote_status:
              "Draft",

            quote_created_at:
              new Date().toISOString(),
          }),
        }
      );

    const result =
      await updateResponse.json();

    if (!updateResponse.ok) {
      console.error(
        "Supabase quote error:",
        result
      );

      return {
        statusCode: 500,
        body: JSON.stringify({
          error:
            "Could not save quotation",
          details: result,
        }),
      };
    }

    if (!result.length) {
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
        order: result[0],
      }),
    };
  } catch (error) {
    console.error(
      "Save quote error:",
      error
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "Unable to save quotation",
      }),
    };
  }
};
