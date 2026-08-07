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
    const {
      customerName,
      customerEmail,
      orderNumber,
      material,
      quantity,
    } = JSON.parse(event.body || "{}");

    if (!customerName || !customerEmail || !orderNumber) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing customer information",
        }),
      };
    }

    const safeName = escapeHtml(customerName);
    const safeEmail = escapeHtml(customerEmail);
    const safeOrderNumber = escapeHtml(orderNumber);
    const safeMaterial = escapeHtml(material || "Not selected");
    const safeQuantity = escapeHtml(String(quantity || 1));

    // ---------------------------
    // CUSTOMER CONFIRMATION EMAIL
    // ---------------------------

    const customerResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            process.env.EMAIL_FROM ||
            "Beyond <orders@beyond3dshop.com>",

          to: [customerEmail],

          reply_to: "beyonddprint35@gmail.com",

          subject: `We received your Beyond order ${orderNumber}`,

          html: `
            <div
              style="
                margin:0;
                padding:40px 20px;
                background:#050816;
                font-family:Arial,Helvetica,sans-serif;
              "
            >
              <div
                style="
                  max-width:620px;
                  margin:0 auto;
                  background:#0d1628;
                  border:1px solid rgba(255,255,255,0.08);
                  border-radius:24px;
                  overflow:hidden;
                  box-shadow:0 20px 60px rgba(0,70,180,0.30);
                "
              >

                <div
                  style="
                    padding:36px 34px 30px;
                    background:
                      linear-gradient(
                        135deg,
                        #071a33 0%,
                        #0b315f 55%,
                        #176bd6 100%
                      );
                    color:white;
                  "
                >
                  <div
                    style="
                      font-size:13px;
                      letter-spacing:5px;
                      font-weight:700;
                      opacity:0.8;
                      margin-bottom:12px;
                    "
                  >
                    BEYOND
                  </div>

                  <h1
                    style="
                      margin:0;
                      font-size:30px;
                      line-height:1.2;
                      color:#ffffff;
                    "
                  >
                    Your project is in.
                  </h1>

                  <p
                    style="
                      margin:14px 0 0;
                      font-size:16px;
                      line-height:1.6;
                      color:rgba(255,255,255,0.82);
                    "
                  >
                    We’ve received your 3D printing request
                    and will review it shortly.
                  </p>
                </div>

                <div
                  style="
                    padding:34px;
                    color:#ffffff;
                  "
                >
                  <p
                    style="
                      margin-top:0;
                      font-size:16px;
                      line-height:1.7;
                      color:#ffffff;
                    "
                  >
                    Hi ${safeName},
                  </p>

                  <p
                    style="
                      font-size:16px;
                      line-height:1.7;
                      color:#aab8cc;
                    "
                  >
                    Thank you for submitting your project to Beyond.
                    We’ll review your uploaded file, material selection,
                    quantity and project requirements, then send you
                    a quotation.
                  </p>

                  <div
                    style="
                      margin:28px 0;
                      padding:22px;
                      border-radius:18px;
                      background:#111d33;
                      border:1px solid rgba(255,255,255,0.08);
                    "
                  >
                    <div style="margin-bottom:16px;">
                      <div
                        style="
                          font-size:12px;
                          color:#7890ad;
                          text-transform:uppercase;
                          letter-spacing:1px;
                          margin-bottom:5px;
                        "
                      >
                        Order number
                      </div>

                      <div
                        style="
                          color:#ffffff;
                          font-size:17px;
                          font-weight:700;
                        "
                      >
                        ${safeOrderNumber}
                      </div>
                    </div>

                    <div style="margin-bottom:16px;">
                      <div
                        style="
                          font-size:12px;
                          color:#7890ad;
                          text-transform:uppercase;
                          letter-spacing:1px;
                          margin-bottom:5px;
                        "
                      >
                        Material
                      </div>

                      <div
                        style="
                          color:#ffffff;
                          font-size:16px;
                        "
                      >
                        ${safeMaterial}
                      </div>
                    </div>

                    <div style="margin-bottom:16px;">
                      <div
                        style="
                          font-size:12px;
                          color:#7890ad;
                          text-transform:uppercase;
                          letter-spacing:1px;
                          margin-bottom:5px;
                        "
                      >
                        Quantity
                      </div>

                      <div
                        style="
                          color:#ffffff;
                          font-size:16px;
                        "
                      >
                        ${safeQuantity}
                      </div>
                    </div>

                    <div>
                      <div
                        style="
                          font-size:12px;
                          color:#7890ad;
                          text-transform:uppercase;
                          letter-spacing:1px;
                          margin-bottom:5px;
                        "
                      >
                        Status
                      </div>

                      <div
                        style="
                          display:inline-block;
                          padding:7px 12px;
                          border-radius:999px;
                          background:rgba(47,125,255,0.16);
                          color:#69a6ff;
                          font-size:14px;
                          font-weight:700;
                        "
                      >
                        Submitted
                      </div>
                    </div>
                  </div>

                  <p
                    style="
                      font-size:16px;
                      line-height:1.7;
                      color:#aab8cc;
                    "
                  >
                    You’ll receive another email once your quotation
                    is ready.
                  </p>

                  <p
                    style="
                      margin-top:32px;
                      font-size:16px;
                      line-height:1.6;
                      color:#ffffff;
                    "
                  >
                    Thank you,<br>
                    <strong>Beyond 3D Printing</strong>
                  </p>

                  <div
                    style="
                      margin-top:30px;
                      padding-top:22px;
                      border-top:1px solid rgba(255,255,255,0.08);
                      color:#6f829d;
                      font-size:12px;
                      line-height:1.6;
                    "
                  >
                    beyond3dshop.com
                    <br>
                    Replies to this email will be sent to
                    beyonddprint35@gmail.com
                  </div>
                </div>
              </div>
            </div>
          `,
        }),
      }
    );

    const customerResult = await customerResponse.json();

    if (!customerResponse.ok) {
      console.error(
        "Customer email failed:",
        customerResult
      );

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Customer email could not be sent",
          details: customerResult,
        }),
      };
    }

    // ---------------------------
    // ADMIN NOTIFICATION EMAIL
    // ---------------------------

    const adminResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            process.env.EMAIL_FROM ||
            "Beyond <orders@beyond3dshop.com>",

          to: [process.env.ADMIN_EMAIL],

          reply_to: customerEmail,

          subject: `New Beyond order: ${orderNumber}`,

          html: `
            <div
              style="
                margin:0;
                padding:35px 18px;
                background:#f3f6fa;
                font-family:Arial,Helvetica,sans-serif;
                color:#0b315f;
              "
            >
              <div
                style="
                  max-width:620px;
                  margin:0 auto;
                  background:#ffffff;
                  border-radius:20px;
                  padding:30px;
                  box-shadow:0 16px 40px rgba(11,49,95,0.12);
                "
              >

                <div
                  style="
                    font-size:12px;
                    letter-spacing:4px;
                    color:#66809f;
                    margin-bottom:8px;
                  "
                >
                  BEYOND ADMIN
                </div>

                <h2
                  style="
                    margin:0 0 26px;
                    font-size:27px;
                    color:#0b315f;
                  "
                >
                  New order received
                </h2>

                <div
                  style="
                    padding:22px;
                    border-radius:16px;
                    background:#f2f6fb;
                    border:1px solid #e2eaf3;
                  "
                >
                  <p>
                    <strong>Order:</strong><br>
                    ${safeOrderNumber}
                  </p>

                  <p>
                    <strong>Customer:</strong><br>
                    ${safeName}
                  </p>

                  <p>
                    <strong>Email:</strong><br>
                    ${safeEmail}
                  </p>

                  <p>
                    <strong>Material:</strong><br>
                    ${safeMaterial}
                  </p>

                  <p>
                    <strong>Quantity:</strong><br>
                    ${safeQuantity}
                  </p>

                  <p style="margin-bottom:0;">
                    <strong>Status:</strong><br>
                    Submitted
                  </p>
                </div>

                <p
                  style="
                    margin-top:24px;
                    color:#4f6177;
                    line-height:1.6;
                  "
                >
                  Review the order and uploaded file in Supabase.
                </p>

                <p
                  style="
                    color:#4f6177;
                    line-height:1.6;
                  "
                >
                  You can reply directly to this email and
                  the reply will go to the customer.
                </p>
              </div>
            </div>
          `,
        }),
      }
    );

    const adminResult = await adminResponse.json();

    if (!adminResponse.ok) {
      console.error(
        "Admin email failed:",
        adminResult
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        customerEmailId:
          customerResult.id || null,
        adminEmailId:
          adminResult.id || null,
      }),
    };
  } catch (error) {
    console.error(
      "Email function error:",
      error
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Unable to send confirmation email",
      }),
    };
  }
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
