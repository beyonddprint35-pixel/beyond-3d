const crypto = require("crypto");

function createCustomerToken(orderId) {
  const secret =
    process.env.ADMIN_PASSWORD;

  return crypto
    .createHmac("sha256", secret)
    .update(String(orderId))
    .digest("hex");
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        error: "Method not allowed",
      }),
    };
  }

  try {
    const providedPassword =
      event.headers[
        "x-admin-password"
      ];

    const correctPassword =
      process.env.ADMIN_PASSWORD;

    if (
      !providedPassword ||
      !correctPassword ||
      providedPassword !==
        correctPassword
    ) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          error: "Unauthorized",
        }),
      };
    }

    const {
      orderId,
      customerName,
      customerEmail,
      orderNumber,
      material,
      quantity,
      quoteTotal,
    } = JSON.parse(
      event.body || "{}"
    );

    if (
      !orderId ||
      !customerEmail ||
      !orderNumber ||
      quoteTotal === undefined
    ) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          error:
            "Missing quote information",
        }),
      };
    }

    const resendApiKey =
      process.env.RESEND_API_KEY;

    const emailFrom =
      process.env.EMAIL_FROM;

    if (
      !resendApiKey ||
      !emailFrom ||
      !correctPassword
    ) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          error:
            "Missing server configuration",
        }),
      };
    }

    const safeName =
      customerName || "there";

    const total =
      Number(
        quoteTotal
      ).toFixed(2);

    const token =
      createCustomerToken(
        orderId
      );

    const acceptUrl =
      `https://beyond3dshop.com/.netlify/functions/accept-quote?id=${encodeURIComponent(
        orderId
      )}&token=${encodeURIComponent(
        token
      )}`;

    const response =
      await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${resendApiKey}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            from: emailFrom,

            to: [
              customerEmail,
            ],

            subject:
              `Your Beyond quotation – ${orderNumber}`,

            html: `
              <!doctype html>

              <html>
                <body style="
                  margin:0;
                  padding:0;
                  background:#f3f6fb;
                  font-family:Arial,sans-serif;
                  color:#111827;
                ">

                  <div style="
                    width:100%;
                    padding:40px 16px;
                    box-sizing:border-box;
                  ">

                    <div style="
                      max-width:600px;
                      margin:0 auto;
                      background:#ffffff;
                      border-radius:22px;
                      overflow:hidden;
                      box-shadow:0 20px 50px rgba(20,35,60,.08);
                    ">

                      <div style="
                        padding:34px;
                        background:#07111f;
                        color:#ffffff;
                      ">

                        <div style="
                          font-size:15px;
                          font-weight:700;
                          letter-spacing:7px;
                          margin-bottom:30px;
                        ">
                          BEYOND
                        </div>

                        <div style="
                          display:inline-block;
                          padding:8px 12px;
                          margin-bottom:16px;
                          border-radius:999px;
                          background:rgba(42,116,255,.18);
                          color:#77aaff;
                          font-size:11px;
                          font-weight:700;
                          letter-spacing:1.5px;
                        ">
                          QUOTATION
                        </div>

                        <h1 style="
                          margin:0;
                          font-size:32px;
                          line-height:1.15;
                        ">
                          Your quotation is ready
                        </h1>

                      </div>

                      <div style="
                        padding:34px;
                      ">

                        <p style="
                          margin:0 0 18px;
                          font-size:16px;
                        ">
                          Hi ${safeName},
                        </p>

                        <p style="
                          margin:0 0 28px;
                          color:#5f6b7c;
                          font-size:15px;
                          line-height:1.8;
                        ">
                          We've reviewed your project
                          and prepared your quotation.
                        </p>

                        <div style="
                          padding:24px;
                          border-radius:16px;
                          background:#f5f7fa;
                        ">

                          <div style="
                            color:#8390a3;
                            font-size:11px;
                            font-weight:700;
                            letter-spacing:1.2px;
                          ">
                            ORDER
                          </div>

                          <div style="
                            margin-top:6px;
                            font-size:18px;
                            font-weight:700;
                          ">
                            ${orderNumber}
                          </div>

                          <div style="
                            margin-top:22px;
                            color:#8390a3;
                            font-size:11px;
                            font-weight:700;
                            letter-spacing:1.2px;
                          ">
                            MATERIAL
                          </div>

                          <div style="
                            margin-top:6px;
                            font-size:16px;
                            font-weight:700;
                          ">
                            ${material ||
                              "Not specified"}
                          </div>

                          <div style="
                            margin-top:22px;
                            color:#8390a3;
                            font-size:11px;
                            font-weight:700;
                            letter-spacing:1.2px;
                          ">
                            QUANTITY
                          </div>

                          <div style="
                            margin-top:6px;
                            font-size:16px;
                            font-weight:700;
                          ">
                            ${quantity || 1}
                          </div>

                          <div style="
                            margin-top:25px;
                            color:#8390a3;
                            font-size:11px;
                            font-weight:700;
                            letter-spacing:1.2px;
                          ">
                            TOTAL
                          </div>

                          <div style="
                            margin-top:5px;
                            font-size:36px;
                            font-weight:700;
                          ">
                            ₪${total}
                          </div>

                        </div>

                        <div style="
                          margin:32px 0;
                          text-align:center;
                        ">

                          <a
                            href="${acceptUrl}"
                            style="
                              display:inline-block;
                              padding:16px 30px;
                              border-radius:999px;
                              background:#176bff;
                              color:#ffffff;
                              text-decoration:none;
                              font-weight:700;
                            "
                          >
                            Accept Quote
                          </a>

                        </div>

                        <p style="
                          margin:0;
                          color:#7c8797;
                          font-size:13px;
                          line-height:1.7;
                        ">
                          If you have any questions,
                          simply reply to this email.
                        </p>

                      </div>

                    </div>

                  </div>

                </body>
              </html>
            `,
          }),
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      console.error(
        "Resend quote error:",
        result
      );

      return {
        statusCode: 500,
        body: JSON.stringify({
          error:
            "Could not send quotation",
          details: result,
        }),
      };
    }

    /*
      Update order to Quoted
      after the email was sent.
    */

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const serviceKey =
      process.env
        .SUPABASE_SECRET_KEY;

    if (
      supabaseUrl &&
      serviceKey
    ) {
      const updateResponse =
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
                "return=minimal",
            },

            body:
              JSON.stringify({
                status: "Quoted",
                quote_status:
                  "Sent",
              }),
          }
        );

      if (!updateResponse.ok) {
        const updateError =
          await updateResponse.text();

        console.error(
          "Quote status update failed:",
          updateError
        );
      }
    }

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        success: true,
      }),
    };

  } catch (error) {
    console.error(
      "Send quote error:",
      error
    );

    return {
      statusCode: 500,

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        error:
          "Unable to send quotation",
      }),
    };
  }
};