exports.handler = async function (event) {
  try {
    const id =
      event.queryStringParameters?.id;

    const token =
      event.queryStringParameters?.token;

    if (!id || !token) {
      return {
        statusCode: 400,

        headers: {
          "Content-Type":
            "text/html; charset=utf-8",
        },

        body: `
          <h1>Invalid quotation link</h1>
        `,
      };
    }

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const serviceKey =
      process.env.SUPABASE_SECRET_KEY;

    const adminPassword =
      process.env.ADMIN_PASSWORD;

    if (
      !supabaseUrl ||
      !serviceKey ||
      !adminPassword
    ) {
      console.error(
        "Missing environment configuration."
      );

      return {
        statusCode: 500,

        body:
          "Server configuration error.",
      };
    }

    const expectedToken =
      Buffer.from(
        `${id}:${adminPassword}`
      ).toString("base64url");

    if (token !== expectedToken) {
      return {
        statusCode: 403,

        headers: {
          "Content-Type":
            "text/html; charset=utf-8",
        },

        body: `
          <h1>Invalid quotation link</h1>
        `,
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

          body: JSON.stringify({
            status: "Accepted",
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

    if (!data.length) {
      return {
        statusCode: 404,

        body:
          "Order not found.",
      };
    }

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
                margin:0;
                color:#9aa9bf;
                line-height:1.7;
              ">
                Thank you. Beyond has received
                your approval and will continue
                with your order.
              </p>

            </div>

          </body>
        </html>
      `,
    };
  } catch (error) {
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