exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const {
      customerName,
      customerEmail,
      orderNumber,
      material,
      quantity,
    } = JSON.parse(event.body);

    if (!customerEmail || !customerName || !orderNumber) {
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

    const customerEmailRequest = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: [customerEmail],
          subject: `We received your Beyond order ${orderNumber}`,
          html: `
            <div style="
              margin:0;
              padding:40px 20px;
              background:#f4f7fb;
              font-family:Arial,Helvetica,sans-serif;
              color:#0b315f;
            ">
              <div style="
                max-width:620px;
                margin:0 auto;
                background:#ffffff;
                border-radius:24px;
                overflow:hidden;
                box-shadow:0 18px 45px rgba(11,49,95,0.12);
              ">

                <div style="
                  padding:34px 34px 26px;
                  background:linear-gradient(135deg,#071a33,#0b315f,#1559a8);
                  color:white;
                ">
                  <div style="
                    font-size:13px;
                    letter-spacing:4px;
                    opacity:0.75;
                    margin-bottom:10px;
                  ">
                    BEYOND
                  </div>

                  <h1 style="
                    margin:0;
                    font-size:30px;
                    line-height:1.2;
                  ">
                    Your request is in.
                  </h1>

                  <p style="
                    margin:12px 0 0;
                    color:rgba(255,255,255,0.8);
                    font-size:16px;
                  ">
                    We’ve received your 3D printing project and will review it shortly.
                  </p>
                </div>

                <div style="padding:34px;">
                  <p style="font-size:16px; margin-top:0;">
                    Hi ${safeName},
                  </p>

                  <p style="
                    font-size:16px;
                    line-height:1.7;
                    color:#45566f;
                  ">
                    Thank you for submitting your project to Beyond.
                    We’ll review your file, material selection and quantity,
                    then send you a quotation.
                  </p>

                  <div style="
                    margin:28px 0;
                    padding:22px;
                    border-radius:18px;
                    background:#f2f6fb;
                    border:1px solid #e3eaf3;
                  ">
                    <div style="margin-bottom:14px;">
                      <strong>Order number</strong><br>
                      <span style="color:#4d6078;">${safeOrderNumber}</span>
                    </div>

                    <div style="margin-bottom:14px;">
                      <strong>Material</strong><br>
                      <span style="color:#4d6078;">${safeMaterial}</span>
                    </div>

                    <div style="margin-bottom:14px;">
                      <strong>Quantity</strong><br>
                      <span style="color:#4d6078;">${safeQuantity}</span>
                    </div>

                    <div>
                      <strong>Status</strong><br>
                      <span style="color:#4d6078;">Submitted</span>
                    </div>
                  </div>

                  <p style="
                    font-size:16px;
                    line-height:1.7;
                    color:#45566f;
                  ">
                    You’ll receive another email once your quotation is ready.
                  </p>

                  <p style="
                    margin-top:30px;
                    font-size:16px;
                  ">
                    Thank you,<br>
                    <strong>Beyond 3D Printing</strong>
                  </p>
                </div>
              </div>
            </div>
          `,
        }),
      }
    );

    const customerResult = await customerEmailRequest.json();

    if (!customerEmailRequest.ok) {
      console.error("Customer email failed:", customerResult);

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Customer email could not be sent",
          details: customerResult,
        }),
      };
    }

    const adminEmailRequest = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: [process.env.ADMIN_EMAIL],
          subject: `New Beyond order: ${orderNumber}`,
          html: `
            <div style="
              margin:0;
              padding:30px 18px;
              background:#f4f7fb;
              font-family:Arial,Helvetica,sans-serif;
              color:#0b315f;
            ">
              <div style="
                max-width:620px;
                margin:0 auto;
                background:#ffffff;
                border-radius:20px;
                padding:30px;
                box-shadow:0 15px 35px rgba(11,49,95,0.1);
              ">
                <div style="
                  font-size:12px;
                  letter-spacing:3px;
                  color:#54708f;
                ">
                  BEYOND ADMIN
                </div>

                <h2 style="
                  margin:8px 0 24px;
                  font-size:26px;
                  color:#0b315f;
                ">
                  New order received
                </h2>

                <div style="
                  padding:20px;
                  border-radius:16px;
                  background:#f2f6fb;
                ">
                  <p><strong>Order:</strong> ${safeOrderNumber}</p>
                  <p><strong>Customer:</strong> ${safeName}</p>
                  <p><strong>Email:</strong> ${safeEmail}</p>
                  <p><strong>Material:</strong> ${safeMaterial}</p>
                  <p><strong>Quantity:</strong> ${safeQuantity}</p>
                  <p><strong>Status:</strong> Submitted</p>
                </div>

                <p style="
                  margin-top:24px;
                  color:#4d6078;
                  line-height:1.6;
                ">
                  Open Supabase to review the order and uploaded file.
                </p>
              </div>
            </div>
          `,
        }),
      }
    );

    const adminResult = await adminEmailRequest.json();

    if (!adminEmailRequest.ok) {
      console.error("Admin email failed:", adminResult);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        customerEmailId: customerResult.id,
        adminEmailId: adminResult.id || null,
      }),
    };
  } catch (error) {
    console.error("Email function error:", error);

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
