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
        body: JSON.stringify({
          error:
            "Missing Supabase configuration",
        }),
      };
    }

    const now =
      new Date().toISOString();

    const updatePayload = {
      status,
    };

    if (
      status ===
      "Accepted"
    ) {
      updatePayload.accepted_at =
        now;
    }

    if (
      status ===
      "Printing"
    ) {
      updatePayload.printing_at =
        now;
    }

    if (
      status ===
      "Completed"
    ) {
      updatePayload.completed_at =
        now;
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

          body:
            JSON.stringify(
              updatePayload
            ),
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

          details:
            data,
        }),
      };
    }

    if (!data.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error:
            "Order not found",
        }),
      };
    }

    const order =
      data[0];

    let trackUrl =
      null;

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

        const customerName =
          order.customer_name ||
          "there";

        const orderNumber =
          `B3D-${String(
            order.id
          )
            .slice(0, 8)
            .toUpperCase()}`;

        const subject =
          status === "Printing"
            ? `Your Beyond order is now printing – ${orderNumber}`
            : `Your Beyond order is completed – ${orderNumber}`;

        const title =
          status === "Printing"
            ? "Your project is now printing"
            : "Your order is ready";

        const message =
          status === "Printing"
            ? "Your project has entered production and is currently being printed."
            : "Great news — your 3D printing order has been completed.";

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

              body:
                JSON.stringify({
                  from:
                    emailFrom,

                  to: [
                    order.email,
                  ],

                  subject,

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
                          ">

                            <div style="
                              padding:34px;
                              background:#07111f;
                              color:white;
                            ">

                              <div style="
                                font-size:15px;
                                font-weight:700;
                                letter-spacing:7px;
                                margin-bottom:30px;
                              ">
                                BEYOND
                              </div>

                              <h1 style="
                                margin:0;
                                font-size:32px;
                              ">
                                ${title}
                              </h1>

                            </div>

                            <div style="
                              padding:34px;
                            ">

                              <p>
                                Hi ${customerName},
                              </p>

                              <p style="
                                color:#5f6b7c;
                                line-height:1.8;
                              ">
                                ${message}
                              </p>

                              <div style="
                                margin-top:28px;
                                padding:22px;
                                border-radius:16px;
                                background:#f5f7fa;
                              ">

                                <strong>
                                  ${orderNumber}
                                </strong>

                                <div style="
                                  margin-top:12px;
                                  color:#176bff;
                                  font-weight:700;
                                ">
                                  ${status}
                                </div>

                              </div>

                              <div style="
                                margin:32px 0 0;
                                text-align:center;
                              ">

                                <a
                                  href="${trackUrl}"
                                  style="
                                    display:inline-block;
                                    padding:16px 28px;
                                    border-radius:999px;
                                    background:#176bff;
                                    color:#ffffff;
                                    text-decoration:none;
                                    font-weight:700;
                                  "
                                >
                                  Track My Order
                                </a>

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
          throw new Error(
            emailResult?.message ||
              "Customer notification could not be sent"
          );
        }

        emailSent =
          true;

      } catch (error) {
        console.error(
          "Status notification error:",
          error
        );

        emailError =
          error.message;
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

      body: JSON.stringify({
        error:
          "Unable to update order status",
      }),
    };
  }
};