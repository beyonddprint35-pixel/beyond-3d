const crypto = require("crypto");

function createCustomerToken(
  orderId,
  secret
) {
  return crypto
    .createHmac(
      "sha256",
      secret
    )
    .update(
      String(orderId)
    )
    .digest("hex");
}

function safeCompare(
  received,
  expected
) {
  try {
    const a =
      Buffer.from(
        String(received),
        "utf8"
      );

    const b =
      Buffer.from(
        String(expected),
        "utf8"
      );

    if (
      a.length !==
      b.length
    ) {
      return false;
    }

    return crypto
      .timingSafeEqual(
        a,
        b
      );
  } catch {
    return false;
  }
}

exports.handler =
  async function (event) {
    if (
      event.httpMethod !==
      "GET"
    ) {
      return {
        statusCode: 405,

        body:
          JSON.stringify({
            error:
              "Method not allowed",
          }),
      };
    }

    try {
      const id =
        event
          .queryStringParameters
          ?.id;

      const token =
        event
          .queryStringParameters
          ?.token;

      if (
        !id ||
        !token
      ) {
        return {
          statusCode: 400,

          body:
            JSON.stringify({
              error:
                "Invalid tracking link",
            }),
        };
      }

      const supabaseUrl =
        process.env
          .SUPABASE_URL;

      const serviceKey =
        process.env
          .SUPABASE_SECRET_KEY;

      const secret =
        process.env
          .ADMIN_PASSWORD;

      if (
        !supabaseUrl ||
        !serviceKey ||
        !secret
      ) {
        return {
          statusCode: 500,

          body:
            JSON.stringify({
              error:
                "Server configuration error",
            }),
        };
      }

      const expectedToken =
        createCustomerToken(
          id,
          secret
        );

      if (
        !safeCompare(
          token,
          expectedToken
        )
      ) {
        return {
          statusCode: 403,

          body:
            JSON.stringify({
              error:
                "Invalid tracking link",
            }),
        };
      }

      const response =
        await fetch(
          `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(
            id
          )}&select=id,customer_name,project_type,material,color,quantity,status,quote_status,needed_by,quote_total,accepted_at,printing_at,completed_at`,
          {
            headers: {
              apikey:
                serviceKey,

              Authorization:
                `Bearer ${serviceKey}`,
            },
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        return {
          statusCode: 500,

          body:
            JSON.stringify({
              error:
                "Could not load order",
            }),
        };
      }

      if (!data.length) {
        return {
          statusCode: 404,

          body:
            JSON.stringify({
              error:
                "Order not found",
            }),
        };
      }

      return {
        statusCode: 200,

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            order:
              data[0],
          }),
      };

    } catch (error) {
      console.error(
        "Track order error:",
        error
      );

      return {
        statusCode: 500,

        body:
          JSON.stringify({
            error:
              "Unable to load order",
          }),
      };
    }
  };