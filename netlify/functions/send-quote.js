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

    const {
      customerName,
      customerEmail,
      orderNumber,
      material,
      quantity,
      quoteTotal,
    } = JSON.parse(event.body || "{}");

    if (
      !customerEmail ||
      !orderNumber ||
      quoteTotal === undefined
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing quote information",
        }),
      };
    }

    const resendApiKey =
      process.env.RESEND_API_KEY;

    const emailFrom =
      process.env.EMAIL_FROM;

    if (!resendApiKey || !emailFrom) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing email configuration",
        }),
      };
    }

    const safeName =
      customerName || "there";

    const total =
      Number(quoteTotal).toFixed(2);

    const response = await fetch(
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

          to: [customerEmail],

          subject:
            `Your Beyond quotation – ${orderNumber}`,

          html: `
            <div style="
              max-width:600px;
              margin:0 auto;
              font-family:Arial,sans-serif;
              color:#111827;
              line-height:1.6;
            ">

              <h1>
                Your quotation is ready
              </h1>

              <p>
                Hi ${safeName},
              </p>

              <p>
                We've reviewed your project and
                prepared your quotation.
              </p>

              <div style="
                margin:28px 0;
                padding:24px;
                border-radius:16px;
                background:#f4f7fb;
              ">

                <p style="
                  margin:0 0 8px;
                  color:#6b7280;
                  font-size:13px;
                ">
                  ORDER
                </p>

                <strong>
                  ${orderNumber}
                </strong>

                <p style="
                  margin:20px 0 8px;
                  color:#6b7280;
                  font-size:13px;
                ">
                  MATERIAL
                </p>

                <strong>
                  ${material || "Not specified"}
                </strong>

                <p style="
                  margin:20px 0 8px;
                  color:#6b7280;
                  font-size:13px;
                ">
                  QUANTITY
                </p>

                <strong>
                  ${quantity || 1}
                </strong>

                <p style="
                  margin:24px 0 8px;
                  color:#6b7280;
                  font-size:13px;
                ">
                  TOTAL
                </p>

                <div style="
                  font-size:34px;
                  font-weight:700;
                ">
                  ₪${total}
                </div>

              </div>

              <p>
                If you'd like to proceed,
                simply reply to this email and
                we'll continue with production.
              </p>

              <p style="
                margin-top:32px;
              ">
                Beyond 3D
              </p>

            </div>
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

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        success: true,
        email: result,
      }),
    };
  } catch (error) {
    console.error(
      "Send quote error:",
      error
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "Unable to send quotation",
      }),
    };
  }
};