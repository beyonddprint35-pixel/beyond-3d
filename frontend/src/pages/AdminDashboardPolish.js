const ADMIN_POLISH_CLASS = "beyond-admin-polish-ready";
const HOME_BUTTON_CLASS = "admin-home-button";
const DELETE_BUTTON_CLASS = "admin-delete-order-button";

function makeHomeButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = HOME_BUTTON_CLASS;
  button.setAttribute("aria-label", "Back to home page");
  button.setAttribute("title", "Home");
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 11.5 12 4l9 7.5"></path>
      <path d="M5.5 10.5V20h13v-9.5"></path>
      <path d="M9.5 20v-5.5h5V20"></path>
    </svg>
    <span>Home</span>
  `;
  button.addEventListener("click", () => {
    window.location.assign("/");
  });
  return button;
}

function decorateLogout(button) {
  if (!button || button.dataset.beyondPolished === "true") return;
  button.dataset.beyondPolished = "true";
  button.setAttribute("aria-label", "Logout");
  button.setAttribute("title", "Logout");
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 17l5-5-5-5"></path>
      <path d="M15 12H3"></path>
      <path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"></path>
    </svg>
    <span>Logout</span>
  `;
}

function syncTopbar() {
  const topbar = document.querySelector(".admin-topbar");
  if (!topbar) return;

  let home = topbar.querySelector(`.${HOME_BUTTON_CLASS}`);
  if (!home) {
    home = makeHomeButton();
    topbar.appendChild(home);
  }

  const theme = topbar.querySelector(".admin-theme-toggle");
  const logout = topbar.querySelector(".admin-logout-button");
  decorateLogout(logout);

  // Keep the brand first, then one compact action group: Home / Theme / Logout.
  if (home) topbar.appendChild(home);
  if (theme) topbar.appendChild(theme);
  if (logout) topbar.appendChild(logout);

  topbar.classList.add(ADMIN_POLISH_CLASS);
}

function tagFinancialStats() {
  document.querySelectorAll(".admin-page > section").forEach((section) => {
    const directCards = Array.from(section.children).filter((child) =>
      child.classList?.contains("order-detail-card")
    );
    if (directCards.length === 4) {
      section.classList.add("admin-financial-stats");
    }
  });
}

function getOrderId(card) {
  const link = card.querySelector('a.admin-view-button[href^="/admin/order/"]');
  if (!link) return "";
  const href = link.getAttribute("href") || "";
  return href.split("/admin/order/")[1]?.split(/[?#]/)[0] || "";
}

async function deleteOrder(orderId, button) {
  const adminPassword = sessionStorage.getItem("beyond_admin_password") || "";
  if (!adminPassword) {
    window.alert("Your admin session has expired. Please log in again.");
    return;
  }

  const confirmed = window.confirm(
    "Delete this order permanently? This action cannot be undone."
  );
  if (!confirmed) return;

  button.disabled = true;
  button.classList.add("is-deleting");

  try {
    const response = await fetch("/.netlify/functions/delete-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPassword,
      },
      body: JSON.stringify({ orderId }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Could not delete this order.");
    }

    const refreshButton = document.querySelector(".admin-heading .primary-button");
    if (refreshButton) refreshButton.click();
    else window.location.reload();
  } catch (error) {
    console.error("Delete order failed:", error);
    window.alert(error.message || "Could not delete this order.");
    button.disabled = false;
    button.classList.remove("is-deleting");
  }
}

function syncDeleteButtons() {
  document.querySelectorAll(".admin-order-card").forEach((card) => {
    if (card.querySelector(`.${DELETE_BUTTON_CLASS}`)) return;

    const orderId = getOrderId(card);
    if (!orderId) return;

    const viewButton = card.querySelector(".admin-view-button");
    if (!viewButton) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = DELETE_BUTTON_CLASS;
    button.setAttribute("aria-label", "Delete order");
    button.setAttribute("title", "Delete order");
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"></path>
        <path d="M8 6V4h8v2"></path>
        <path d="m19 6-1 14H6L5 6"></path>
        <path d="M10 11v5M14 11v5"></path>
      </svg>
      <span>Delete</span>
    `;
    button.addEventListener("click", () => deleteOrder(orderId, button));
    viewButton.insertAdjacentElement("afterend", button);
  });
}

function syncAdminPolish() {
  if (!window.location.pathname.startsWith("/admin")) return;
  syncTopbar();
  tagFinancialStats();
  syncDeleteButtons();
}

function startAdminPolish() {
  syncAdminPolish();
  const observer = new MutationObserver(syncAdminPolish);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", syncAdminPolish);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAdminPolish, { once: true });
} else {
  startAdminPolish();
}
