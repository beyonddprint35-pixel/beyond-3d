const crypto = require("crypto");

function createCustomerToken(orderId) {
  const secret =
    process.env.ADMIN_PASSWORD;

  if (!secret) {
    throw new Error(
      "ADMIN_PASSWORD is missing"
    );
  }

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
        error:
          "Method not allowed",
      }),
    };
  }

  try {
    /*
      =========================
      ADMIN AUTHENTICATION
      =========================
    */

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
          error:
            "Unauthorized",
        }),
      };
    }

    /*
      =========================
      REQUEST DATA
      =========================
    */

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
      quoteTotal === undefined ||
      quoteTotal === null
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

    /*
      =========================
      ENVIRONMENT
      =========================
    */

    const resendApiKey =
      process.env.RESEND_API_KEY;

    const emailFrom =
      process.env.EMAIL_FROM;

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const serviceKey =
      process.env
        .SUPABASE_SECRET_KEY;

    if (
      !resendApiKey ||
      !emailFrom
    ) {
      return {
        statusCode: 500,

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          error:
            "Missing email configuration",
        }),
      };
    }

    /*
      =========================
      ACCEPT QUOTE LINK
      =========================
    */

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

    const safeName =
      customerName || "there";

    const total =
      Number(
        quoteTotal
      ).toFixed(2);

    /*
      =========================
      SEND EMAIL
      =========================
    */

    const emailResponse =
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
            from:
              emailFrom,

            to: [
              customerEmail,
            ],

            subject:
              `Your Beyond quotation – ${orderNumber}`,

            html: `
              <!doctype html>

              <html>
                <head>
                  <meta charset="utf-8" />

                  <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                  />
                </head>

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
                      width:100%;
                      max-width:600px;
                      margin:0 auto;
                      background:#ffffff;
                      border-radius:24px;
                      overflow:hidden;
                      box-shadow:0 20px 60px rgba(20,35,60,.10);
                    ">

                      <!-- HEADER -->

                      <div style="
                        padding:36px 34px 32px;
                        background:#07111f;
                        color:#ffffff;
                      ">

                        <div style="
                          margin-bottom:34px;
                          display:flex;
                          align-items:center;
                          gap:12px;
                        ">
                          <img
                            src="https://beyond3dshop.com/beyond-logo.png"
                            width="50"
                            height="50"
                            alt="Beyond"
                            style="
                              display:block;
                              width:50px;
                              height:50px;
                              object-fit:contain;
                              border:0;
                            "
                          />

                          <div style="
                            color:#ffffff;
                            font-size:15px;
                            font-weight:700;
                            letter-spacing:7px;
                            line-height:1;
                          ">
                            BEYOND
                          </div>
                        </div>

                        <div style="
                          display:inline-block;
                          margin-bottom:17px;
                          padding:8px 12px;
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
                          letter-spacing:-1px;
                        ">
                          Your quotation is ready
                        </h1>

                      </div>

                      <!-- CONTENT -->

                      <div style="
                        padding:34px;
                      ">

                        <p style="
                          margin:0 0 18px;
                          font-size:16px;
                          line-height:1.7;
                        ">
                          Hi ${safeName},
                        </p>

                        <p style="
                          margin:0 0 28px;
                          color:#5f6b7c;
                          font-size:15px;
                          line-height:1.8;
                        ">
                          We've reviewed your
                          project and prepared
                          your quotation.
                        </p>

                        <!-- QUOTE DETAILS -->

                        <div style="
                          padding:24px;
                          border-radius:18px;
                          background:#f5f7fa;
                          border:1px solid #edf0f4;
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
                            ${
                              material ||
                              "Not specified"
                            }
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
                            ${
                              quantity ||
                              1
                            }
                          </div>

                          <div style="
                            height:1px;
                            margin:25px 0;
                            background:#dde3eb;
                          "></div>

                          <div style="
                            color:#8390a3;
                            font-size:11px;
                            font-weight:700;
                            letter-spacing:1.2px;
                          ">
                            TOTAL
                          </div>

                          <div style="
                            margin-top:6px;
                            font-size:38px;
                            font-weight:700;
                            letter-spacing:-1px;
                            color:#111827;
                          ">
                            ₪${total}
                          </div>

                        </div>

                        <!-- ACCEPT BUTTON -->

                        <div style="
                          margin:34px 0 24px;
                          text-align:center;
                        ">

                          <a
                            href="${acceptUrl}"
                            target="_blank"
                            style="
                              display:inline-block;
                              width:auto;
                              min-width:180px;
                              padding:17px 30px;
                              border-radius:999px;
                              background:#176bff;
                              color:#ffffff;
                              text-decoration:none;
                              font-size:15px;
                              font-weight:700;
                              box-shadow:0 12px 30px rgba(23,107,255,.25);
                            "
                          >
                            Accept Quote
                          </a>

                        </div>

                        <p style="
                          margin:0;
                          text-align:center;
                          color:#8792a2;
                          font-size:12px;
                          line-height:1.7;
                        ">
                          By clicking Accept Quote,
                          you confirm that you would
                          like Beyond to proceed with
                          this order.
                        </p>

                        <div style="
                          height:1px;
                          margin:30px 0;
                          background:#edf0f4;
                        "></div>

                        <p style="
                          margin:0;
                          color:#7c8797;
                          font-size:13px;
                          line-height:1.7;
                        ">
                          Have a question or need
                          something changed?
                          Simply reply to this email
                          before accepting the quote.
                        </p>

                        <div style="
                          margin-top:25px;
                          display:flex;
                          align-items:center;
                          gap:9px;
                        ">
                          <img
                            src="https://beyond3dshop.com/beyond-logo.png"
                            width="30"
                            height="30"
                            alt=""
                            style="
                              display:block;
                              width:30px;
                              height:30px;
                              object-fit:contain;
                              background:#07111f;
                              border-radius:7px;
                            "
                          />

                          <span style="
                            color:#111827;
                            font-size:14px;
                            font-weight:700;
                            letter-spacing:2px;
                          ">
                            BEYOND 3D
                          </span>
                        </div>

                      </div>

                    </div>

                  </div>

                </body>
              </html>
            `,
          }),
        }
      );

    const emailResult =
      await emailResponse.json();

    if (!emailResponse.ok) {
      console.error(
        "Resend quote error:",
        emailResult
      );

      return {
        statusCode: 500,

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          error:
            "Could not send quotation",

          details:
            emailResult,
        }),
      };
    }

    /*
      =========================
      UPDATE DATABASE STATUS
      =========================

      Only update to Quoted after
      the email was successfully sent.
    */

    let updatedOrder = null;

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
                "return=representation",
            },

            body:
              JSON.stringify({
                status:
                  "Quoted",

                quote_status:
                  "Sent",
              }),
          }
        );

      const updateData =
        await updateResponse.json();

      if (!updateResponse.ok) {
        console.error(
          "Quote status update failed:",
          updateData
        );

        /*
          The email already succeeded,
          so we don't report the entire
          operation as failed.
        */
      } else {
        updatedOrder =
          updateData?.[0] ||
          null;
      }
    }

    /*
      =========================
      SUCCESS
      =========================
    */

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        success: true,

        message:
          "Quote sent successfully",

        emailId:
          emailResult?.id ||
          null,

        order:
          updatedOrder,
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