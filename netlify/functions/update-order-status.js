exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
      },
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
        headers: {
          "Content-Type": "application/json",
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Order ID is required",
        }),
      };
    }

    if (
      !status ||
      !allowedStatuses.includes(status)
    ) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Invalid order status",
        }),
      };
    }

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const serviceKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !supabaseUrl ||
      !serviceKey
    ) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error:
            "Missing Supabase configuration",
        }),
      };
    }

    /*
      Update the order in Supabase.
      We request the updated row back
      because we need the customer's
      email address for notifications.
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
          "Content-Type": "application/json",
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
          "Content-Type": "application/json",
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
      Send customer notifications only
      for production statuses.

      We do NOT send emails when changing
      back to Submitted / Quoted / Accepted.
    */

    let emailSent = false;
    let emailError = null;

    if (
      status === "Printing" ||
      status === "Completed"
    ) {
      try {
        const resendApiKey =
          process.env.RESEND_API_KEY;

        const emailFrom =
          process.env.EMAIL_FROM;

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

        let subject = "";
        let title = "";
        let message = "";
        let badge = "";

        if (
          status === "Printing"
        ) {
          subject =
            `Your Beyond order is now printing – ${orderNumber}`;

          title =
            "Your project is now printing";

          message =
            "Your quotation was approved and your project has now entered production. We'll let you know as soon as your order is completed.";

          badge =
            "PRINTING";
        }

        if (
          status === "Completed"
        ) {
          subject =
            `Your Beyond order is completed – ${orderNumber}`;

          title =
            "Your order is ready";

          message =
            "Great news — your 3D printing order has been completed. We'll contact you regarding delivery or collection.";

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
                            padding:34px 34px 26px;
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
                            ">

                              <div style="
                                margin-bottom:6px;
                                color:#8390a3;
                                font-size:11px;
                                font-weight:700;
                                letter-spacing:1.2px;
                              ">
                                ORDER
                              </div>

                              <div style="
                                font-size:18px;
                                font-weight:700;
                              ">
                                ${orderNumber}
                              </div>

                              <div style="
                                margin-top:20px;
                                margin-bottom:6px;
                                color:#8390a3;
                                font-size:11px;
                                font-weight:700;
                                letter-spacing:1.2px;
                              ">
                                STATUS
                              </div>

                              <div style="
                                font-size:18px;
                                font-weight:700;
                                color:#176bff;
                              ">
                                ${status}
                              </div>

                            </div>

                            <p style="
                              margin:30px 0 0;
                              color:#7c8797;
                              font-size:13px;
                              line-height:1.7;
                            ">
                              Questions about your order?
                              Simply reply to this email.
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

        emailSent = true;

      } catch (error) {
        /*
          Important:
          We do NOT undo the status update
          if the email fails.

          The production status is more
          important than the notification.
        */

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
            status ===
              "Printing" ||
            status ===
              "Completed",

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