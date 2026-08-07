const orderContent =
  document.getElementById("order-content");

let adminPassword = "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeOrderNumber(id) {
  if (!id) {
    return "B3D-UNKNOWN";
  }

  return (
    "B3D-" +
    String(id)
      .slice(0, 8)
      .toUpperCase()
  );
}

function getAdminPassword() {
  const savedPassword =
    sessionStorage.getItem(
      "beyond_admin_password"
    );

  if (!savedPassword) {
    window.location.href = "admin.html";
    return null;
  }

  adminPassword = savedPassword;
  return adminPassword;
}

function getOrderId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return params.get("id");
}

function formatDate(value) {
  if (!value) {
    return "Not specified";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString();
}

function formatFileSize(bytes) {
  if (!bytes) {
    return "";
  }

  const mb =
    Number(bytes) /
    1024 /
    1024;

  return `${mb.toFixed(2)} MB`;
}

function renderOrder(order, fileUrl) {
  const orderNumber =
    makeOrderNumber(order.id);

  document.title =
    `${orderNumber} | Beyond Admin`;

  const fileName =
    escapeHtml(
      order.file_name ||
      "No file uploaded"
    );

  const fileSize =
    formatFileSize(
      order.file_size
    );

  const downloadHtml =
    order.file_name && fileUrl
      ? `
        <a
          class="download-button"
          href="${escapeHtml(fileUrl)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download File
        </a>
      `
      : `
        <span
          class="download-button disabled"
        >
          No File
        </span>
      `;

  orderContent.innerHTML = `
    <section class="order-header">
      <div>
        <div class="eyebrow">
          Order
        </div>

        <h1>
          ${orderNumber}
        </h1>
      </div>

      <span class="status">
        ${escapeHtml(
          order.status ||
          "Submitted"
        )}
      </span>
    </section>

    <section class="grid">

      <article class="card">
        <h2>Customer</h2>

        <div class="info-grid">

          <div class="info-item">
            <div class="label">
              Name
            </div>

            <div class="value">
              ${escapeHtml(
                order.customer_name ||
                "Not provided"
              )}
            </div>
          </div>

          <div class="info-item">
            <div class="label">
              Email
            </div>

            <div class="value">
              ${escapeHtml(
                order.email ||
                "Not provided"
              )}
            </div>
          </div>

          <div class="info-item">
            <div class="label">
              Phone
            </div>

            <div class="value">
              ${escapeHtml(
                order.phone ||
                "Not provided"
              )}
            </div>
          </div>

          <div class="info-item">
            <div class="label">
              Needed By
            </div>

            <div class="value">
              ${escapeHtml(
                formatDate(
                  order.needed_by
                )
              )}
            </div>
          </div>

        </div>
      </article>

      <article class="card">
        <h2>Project</h2>

        <div class="info-grid">

          <div class="info-item">
            <div class="label">
              Project Type
            </div>

            <div class="value">
              ${escapeHtml(
                order.project_type ||
                "Not specified"
              )}
            </div>
          </div>

          <div class="info-item">
            <div class="label">
              Material
            </div>

            <div class="value">
              ${escapeHtml(
                order.material ||
                "Not specified"
              )}
            </div>
          </div>

          <div class="info-item">
            <div class="label">
              Color
            </div>

            <div class="value">
              ${escapeHtml(
                order.color ||
                "Not specified"
              )}
            </div>
          </div>

          <div class="info-item">
            <div class="label">
              Quantity
            </div>

            <div class="value">
              ${escapeHtml(
                order.quantity || 1
              )}
            </div>
          </div>

        </div>
      </article>

      <article class="card full-width">
        <h2>Project Description</h2>

        <div class="description">
          ${escapeHtml(
            order.description ||
            "No description provided."
          )}
        </div>
      </article>

      <article class="card full-width">
        <h2>Uploaded File</h2>

        <div class="file-card">

          <div>
            <div class="file-name">
              ${fileName}
            </div>

            <div class="file-meta">
              ${escapeHtml(fileSize)}
            </div>
          </div>

          ${downloadHtml}

        </div>
      </article>

    </section>
  `;
}

async function loadOrder() {
  const password =
    getAdminPassword();

  if (!password) {
    return;
  }

  const orderId =
    getOrderId();

  if (!orderId) {
    orderContent.innerHTML = `
      <div class="error">
        Missing order ID.
      </div>
    `;

    return;
  }

  try {
    const response =
      await fetch(
        `/.netlify/functions/get-order?id=${encodeURIComponent(
          orderId
        )}`,
        {
          headers: {
            "x-admin-password":
              password
          }
        }
      );

    const data =
      await response.json();

    if (
      response.status === 401
    ) {
      sessionStorage.removeItem(
        "beyond_admin_password"
      );

      window.location.href =
        "admin.html";

      return;
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Could not load order"
      );
    }

    renderOrder(
      data.order,
      data.fileUrl
    );

  } catch (error) {
    console.error(error);

    orderContent.innerHTML = `
      <div class="error">
        Unable to load this order.
      </div>
    `;
  }
}

loadOrder();
