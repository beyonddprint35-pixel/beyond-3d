const crypto = require(
  "crypto"
);

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

          headers: {
            "Content-Type":
              "text/html; charset=utf-8",
          },

          body:
            "<h1>Invalid quotation link</h1>",
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
        console.error(
          "Missing server configuration."
        );

        return {
          statusCode: 500,

          body:
            "Server configuration error.",
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

          headers: {
            "Content-Type":
              "text/html; charset=utf-8",
          },

          body:
            "<h1>Invalid or expired quotation link</h1>",
        };
      }

      const response =
        await fetch(
          `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(
            id
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

            body:
              JSON.stringify({
                status:
                  "Accepted",

                quote_status:
                  "Accepted",
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "Accept quote database error:",
          data
        );

        return {
          statusCode: 500,

          body:
            "Unable to accept quotation.",
        };
      }

      if (
        !data.length
      ) {
        return {
          statusCode: 404,

          body:
            "Order not found.",
        };
      }

      const trackUrl =
        `https://beyond3dshop.com/track?id=${encodeURIComponent(
          id
        )}&token=${encodeURIComponent(
          token
        )}`;

      return {
        statusCode: 200,

        headers: {
          "Content-Type":
            "text/html; charset=utf-8",
        },

        body: `
          <!doctype html>

          <html>
            <head>
              <meta charset="utf-8">

              <meta
                name="viewport"
                content="width=device-width, initial-scale=1"
              >

              <title>
                Quote Accepted
              </title>
            </head>

            <body style="
              margin:0;
              min-height:100vh;
              display:flex;
              align-items:center;
              justify-content:center;
              background:#030712;
              color:white;
              font-family:Arial,sans-serif;
              padding:24px;
              box-sizing:border-box;
            ">

              <div style="
                width:100%;
                max-width:520px;
                text-align:center;
                padding:48px 32px;
                border-radius:24px;
                background:#0b1424;
                border:1px solid rgba(255,255,255,.1);
                box-shadow:0 30px 80px rgba(0,0,0,.3);
              ">

                <div style="
                  font-size:14px;
                  font-weight:700;
                  letter-spacing:7px;
                  margin-bottom:40px;
                ">
                  BEYOND
                </div>

                <div style="
                  width:72px;
                  height:72px;
                  margin:0 auto 24px;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  border-radius:50%;
                  background:#176bff;
                  font-size:34px;
                ">
                  ✓
                </div>

                <h1 style="
                  margin:0 0 16px;
                  font-size:34px;
                ">
                  Quote accepted
                </h1>

                <p style="
                  margin:0 auto;
                  max-width:390px;
                  color:#9aa9bf;
                  line-height:1.7;
                ">
                  Thank you. Beyond has
                  received your approval
                  and will continue with
                  your order.
                </p>

                <a
                  href="${trackUrl}"
                  style="
                    display:inline-block;
                    margin-top:32px;
                    padding:16px 28px;
                    border-radius:999px;
                    background:#176bff;
                    color:#ffffff;
                    text-decoration:none;
                    font-size:14px;
                    font-weight:700;
                  "
                >
                  Track My Order
                </a>

                <p style="
                  margin:22px 0 0;
                  color:#677a96;
                  font-size:12px;
                  line-height:1.6;
                ">
                  Save your tracking link
                  to check the latest
                  production status at
                  any time.
                </p>

              </div>

            </body>
          </html>
        `,
      };

    } catch (
      error
    ) {
      console.error(
        "Accept quote error:",
        error
      );

      return {
        statusCode: 500,

        body:
          "Unable to accept quotation.",
      };
    }
  };