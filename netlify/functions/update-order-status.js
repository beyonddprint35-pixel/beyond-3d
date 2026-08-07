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
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          error:
            "Order ID is required",
        }),
      };
    }

    if (
      !status ||
      !allowedStatuses.includes(
        status
      )
    ) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          error:
            "Invalid order status",
        }),
      };
    }

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const serviceKey =
      process.env
        .SUPABASE_SECRET_KEY;

    const resendApiKey =
      process.env.RESEND_API_KEY;

    const emailFrom =
      process.env.EMAIL_FROM;

    const secret =
      process.env.ADMIN_PASSWORD;

    if (
      !supabaseUrl ||
      !serviceKey
    ) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          error:
            "Missing Supabase configuration",
        }),
      };
    }

    /*
      =========================
      UPDATE ORDER
      =========================
    */

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
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          error:
            "Could not update order status",

          details:
            data,
        }),
      };
    }

    if (!data.length) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          error:
            "Order not found",
        }),
      };
    }

    const order =
      data[0];

    /*
      =========================
      TRACKING URL
      =========================
    */

    let trackUrl = null;

    if (
      secret &&
      order.id
    ) {
      const token =
        createCustomerToken(
          order.id,
          secret
        );

      trackUrl =
        `https://beyond3dshop.com/track?id=${encodeURIComponent(
          order.id
        )}&token=${encodeURIComponent(
          token
        )}`;
    }

    /*
      =========================
      CUSTOMER EMAIL
      =========================
    */

    let emailSent =
      false;

    let emailError =
      null;

    const shouldNotify =
      status === "Printing" ||
      status === "Completed";

    if (shouldNotify) {
      try {
        if (
          !resendApiKey ||
          !emailFrom
        ) {
          throw new Error(
            "Missing email configuration"
          );
        }

        if (!order.email) {
          throw new Error(
            "Customer email is missing"
          );
        }

        if (!trackUrl) {
          throw new Error(
            "Tracking link could not be created"
          );
        }

        const customerName =
          order.customer_name ||
          "there";

        const orderNumber =
          `B3D-${String(
            order.id
          )
            .slice(0, 8)
            .toUpperCase()}`;

        let subject = "";
        let title = "";
        let message = "";
        let badge = "";

        if (
          status ===
          "Printing"
        ) {
          subject =
            `Your Beyond order is now printing – ${orderNumber}`;

          title =
            "Your project is now printing";

          message =
            "Your project has entered production and is currently being printed. You can follow the latest status using the tracking link below.";

          badge =
            "PRINTING";
        }

        if (
          status ===
          "Completed"
        ) {
          subject =
            `Your Beyond order is completed – ${orderNumber}`;

          title =
            "Your order is ready";

          message =
            "Great news — your 3D printing order has been completed. You can review the final status below, and we'll contact you regarding delivery or collection.";

          badge =
            "COMPLETED";
        }

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
                  order.email,
                ],

                subject,

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
                          max-width:600px;
                          margin:0 auto;
                          background:#ffffff;
                          border-radius:22px;
                          overflow:hidden;
                          box-shadow:0 20px 50px rgba(20,35,60,.08);
                        ">

                          <div style="
                            padding:34px 34px 30px;
                            background:#07111f;
                            color:white;
                          ">

                            <div style="
                              font-size:15px;
                              font-weight:700;
                              letter-spacing:7px;
                              margin-bottom:32px;
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
                              ${badge}
                            </div>

                            <h1 style="
                              margin:0;
                              font-size:32px;
                              line-height:1.15;
                              letter-spacing:-1px;
                            ">
                              ${title}
                            </h1>

                          </div>

                          <div style="
                            padding:34px;
                          ">

                            <p style="
                              margin:0 0 18px;
                              font-size:16px;
                              line-height:1.7;
                            ">
                              Hi ${customerName},
                            </p>

                            <p style="
                              margin:0 0 28px;
                              color:#5f6b7c;
                              font-size:15px;
                              line-height:1.8;
                            ">
                              ${message}
                            </p>

                            <div style="
                              padding:22px;
                              border-radius:16px;
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
                                STATUS
                              </div>

                              <div style="
                                margin-top:6px;
                                font-size:18px;
                                font-weight:700;
                                color:#176bff;
                              ">
                                ${status}
                              </div>

                              ${
                                order.material
                                  ? `
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
                                      ${order.material}
                                    </div>
                                  `
                                  : ""
                              }

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
                                ${order.quantity || 1}
                              </div>

                            </div>

                            <div style="
                              margin:32px 0 24px;
                              text-align:center;
                            ">

                              <a
                                href="${trackUrl}"
                                target="_blank"
                                style="
                                  display:inline-block;
                                  min-width:180px;
                                  padding:16px 28px;
                                  border-radius:999px;
                                  background:#176bff;
                                  color:#ffffff;
                                  text-decoration:none;
                                  font-size:14px;
                                  font-weight:700;
                                  box-shadow:0 12px 30px rgba(23,107,255,.22);
                                "
                              >
                                Track My Order
                              </a>

                            </div>

                            <p style="
                              margin:0;
                              text-align:center;
                              color:#8792a2;
                              font-size:12px;
                              line-height:1.7;
                            ">
                              Use your private tracking
                              link at any time to see the
                              latest order status.
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
                              Questions about your order?
                              Simply reply to this email.
                            </p>

                            <p style="
                              margin:24px 0 0;
                              font-size:14px;
                              font-weight:700;
                            ">
                              Beyond 3D
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

        const emailResult =
          await emailResponse.json();

        if (!emailResponse.ok) {
          console.error(
            "Customer status email failed:",
            emailResult
          );

          throw new Error(
            "Customer notification could not be sent"
          );
        }

        emailSent =
          true;

      } catch (error) {
        /*
          We intentionally keep the
          database status change even
          if Resend has a problem.
        */

        console.error(
          "Status notification error:",
          error
        );

        emailError =
          error.message;
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

        order,

        notification: {
          attempted:
            shouldNotify,

          sent:
            emailSent,

          error:
            emailError,
        },
      }),
    };

  } catch (error) {
    console.error(
      "Update order status error:",
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
          "Unable to update order status",
      }),
    };
  }
};