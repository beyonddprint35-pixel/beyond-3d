const ordersList =
  document.getElementById("orders-list");

const totalOrders =
  document.getElementById("total-orders");

const submittedOrders =
  document.getElementById("submitted-orders");

const printingOrders =
  document.getElementById("printing-orders");

const completedOrders =
  document.getElementById("completed-orders");

const refreshButton =
  document.getElementById("refresh-button");

const logoutButton =
  document.getElementById("logout-button");

let adminPassword = "";

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function askForAdminPassword() {
  const savedPassword =
    sessionStorage.getItem(
      "beyond_admin_password"
    );

  if (savedPassword) {
    adminPassword = savedPassword;
    return true;
  }

  const enteredPassword = prompt(
    "Enter Beyond admin password"
  );

  if (!enteredPassword) {
    return false;
  }

  adminPassword = enteredPassword;

  sessionStorage.setItem(
    "beyond_admin_password",
    enteredPassword
  );

  return true;
}

function updateStats(orders) {
  totalOrders.textContent = orders.length;

  submittedOrders.textContent =
    orders.filter(
      (order) =>
        String(order.status)
          .toLowerCase() === "submitted"
    ).length;

  printingOrders.textContent =
    orders.filter(
      (order) =>
        String(order.status)
          .toLowerCase() === "printing"
    ).length;

  completedOrders.textContent =
    orders.filter(
      (order) =>
        String(order.status)
          .toLowerCase() === "completed"
    ).length;
}

function renderOrders(orders) {
  if (!orders.length) {
    ordersList.innerHTML = `
      <div class="loading">
        No orders found.
      </div>
    `;

    return;
  }

  ordersList.innerHTML =
    orders
      .map((order) => {
        const orderNumber =
          makeOrderNumber(order.id);

        const name =
          escapeHtml(
            order.customer_name ||
              "Unknown customer"
          );

        const email =
          escapeHtml(order.email || "");

        const material =
          escapeHtml(
            order.material ||
              "No material"
          );

        const color =
          escapeHtml(
            order.color ||
              "No color"
          );

        const quantity =
          escapeHtml(order.quantity || 1);

        const status =
          escapeHtml(
            order.status ||
              "Submitted"
          );

        return `
          <article class="order-card">

            <div>
              <div class="order-number">
                ${orderNumber}
              </div>

              <div class="customer-name">
                ${name}
              </div>

              <div class="muted">
                ${email}
              </div>
            </div>

            <div>
              <div>
                ${material}
              </div>

              <div class="muted">
                ${color}
              </div>
            </div>

            <div>
              <div>
                Qty ${quantity}
              </div>

              <div class="muted">
                <span class="status">
                  ${status}
                </span>
              </div>
            </div>

            <div>
              <button
                class="view-button"
                data-order-id="${escapeHtml(
                  order.id
                )}"
              >
                View
              </button>
            </div>

          </article>
        `;
      })
      .join("");

  document
    .querySelectorAll(".view-button")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const id =
            button.dataset.orderId;

          window.location.href =
            `order.html?id=${encodeURIComponent(
              id
            )}`;
        }
      );
    });
}

async function loadOrders() {
  ordersList.innerHTML = `
    <div class="loading">
      Loading orders...
    </div>
  `;

  try {
    if (!askForAdminPassword()) {
      ordersList.innerHTML = `
        <div class="error">
          Admin password required.
        </div>
      `;

      return;
    }

    const response = await fetch(
      "/.netlify/functions/get-orders",
      {
        headers: {
          "x-admin-password":
            adminPassword
        }
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      sessionStorage.removeItem(
        "beyond_admin_password"
      );

      adminPassword = "";

      ordersList.innerHTML = `
        <div class="error">
          Wrong admin password.
          Refresh the page and try again.
        </div>
      `;

      return;
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not load orders"
      );
    }

    const orders =
      data.orders || [];

    updateStats(orders);
    renderOrders(orders);
  } catch (error) {
    console.error(error);

    ordersList.innerHTML = `
      <div class="error">
        Unable to load orders.
      </div>
    `;
  }
}

function logoutAdmin() {
  sessionStorage.removeItem(
    "beyond_admin_password"
  );

  adminPassword = "";

  window.location.reload();
}

refreshButton.addEventListener(
  "click",
  loadOrders
);

logoutButton.addEventListener(
  "click",
  logoutAdmin
);

loadOrders();
