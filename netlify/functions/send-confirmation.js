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
          subject: `Beyond order ${orderNumber} received`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #0b315f;">
              <h1 style="color: #0b315f;">Beyond 3D Printing</h1>

              <p>Hello ${escapeHtml(customerName)},</p>

              <p>Thank you for submitting your 3D-printing request.</p>

              <div style="background: #f2f4f7; padding: 20px; border-radius: 10px;">
                <p><strong>Order number:</strong> ${escapeHtml(orderNumber)}</p>
                <p><strong>Material:</strong> ${escapeHtml(material || "Not selected")}</p>
                <p><strong>Quantity:</strong> ${escapeHtml(String(quantity || 1))}</p>
                <p><strong>Status:</strong> Submitted</p>
              </div>

              <p>We will review your file and send you a quotation shortly.</p>

              <p>Thank you,<br><strong>Beyond 3D Printing</strong></p>
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
            <div style="font-family: Arial, sans-serif;">
              <h2>New order received</h2>
              <p><strong>Order:</strong> ${escapeHtml(orderNumber)}</p>
              <p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
              <p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
              <p><strong>Material:</strong> ${escapeHtml(material || "Not selected")}</p>
              <p><strong>Quantity:</strong> ${escapeHtml(String(quantity || 1))}</p>
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
        emailId: customerResult.id,
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
