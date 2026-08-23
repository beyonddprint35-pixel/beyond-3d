import { supabase } from "../lib/supabaseClient";

const CARD_SELECTOR = ".account-generated-website-card";
const BUTTON_CLASS = "account-menu-draft-delete";
const DIALOG_CLASS = "account-menu-draft-delete-dialog";

let syncTimer = null;
let loadingDrafts = false;
let drafts = [];
let lastUserId = "";
let lastLoadedAt = 0;

function isHebrewUi() {
  return (
    document.documentElement.lang?.toLowerCase().startsWith("he") ||
    document.documentElement.dir === "rtl"
  );
}

function getDraftName(draft) {
  const menu = draft?.structured_menu || {};
  const branding = menu?.branding || {};

  return (
    branding.display_name ||
    menu.restaurant_name ||
    draft?.name ||
    (isHebrewUi() ? "תפריט ללא שם" : "Untitled menu")
  );
}

async function loadDrafts({ force = false } = {}) {
  if (loadingDrafts) return drafts;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user?.id) {
    drafts = [];
    lastUserId = "";
    return drafts;
  }

  const freshEnough =
    !force &&
    lastUserId === user.id &&
    Date.now() - lastLoadedAt < 5000;

  if (freshEnough) return drafts;

  loadingDrafts = true;

  try {
    const { data, error } = await supabase
      .from("menu_projects")
      .select(
        "id,owner_user_id,name,status,structured_menu,activated_site_id,created_at,updated_at"
      )
      .eq("owner_user_id", user.id)
      .eq("status", "ready")
      .is("activated_site_id", null)
      .not("structured_menu", "is", null)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    drafts = data || [];
    lastUserId = user.id;
    lastLoadedAt = Date.now();

    return drafts;
  } catch (error) {
    console.error("Unable to load deletable menu drafts:", error);
    return [];
  } finally {
    loadingDrafts = false;
  }
}

function closeDeleteDialog() {
  document.querySelector(`.${DIALOG_CLASS}`)?.remove();
}

function showDeleteDialog(draft, onConfirm) {
  closeDeleteDialog();

  const hebrew = isHebrewUi();
  const name = getDraftName(draft);

  const backdrop = document.createElement("div");
  backdrop.className = DIALOG_CLASS;
  backdrop.setAttribute("role", "presentation");

  const dialog = document.createElement("div");
  dialog.className = "account-menu-draft-delete-dialog-card";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute(
    "aria-label",
    hebrew ? `מחיקת ${name}` : `Delete ${name}`
  );

  dialog.innerHTML = `
    <div class="account-menu-draft-delete-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"></path>
        <path d="M8 6V4h8v2"></path>
        <path d="M19 6l-1 14H6L5 6"></path>
        <path d="M10 11v5"></path>
        <path d="M14 11v5"></path>
      </svg>
    </div>
    <div class="account-menu-draft-delete-copy">
      <span>${hebrew ? "מחיקת טיוטה" : "DELETE DRAFT"}</span>
      <h3>${hebrew ? "למחוק את התפריט הזה?" : "Delete this menu draft?"}</h3>
      <p>${hebrew ? `הטיוטה “${name}” תימחק לצמיתות. לא ניתן לבטל פעולה זו.` : `“${name}” will be permanently removed. This action cannot be undone.`}</p>
    </div>
    <div class="account-menu-draft-delete-error" aria-live="polite"></div>
    <div class="account-menu-draft-delete-actions">
      <button type="button" class="account-menu-draft-delete-cancel">${hebrew ? "ביטול" : "Cancel"}</button>
      <button type="button" class="account-menu-draft-delete-confirm">
        <span>${hebrew ? "מחיקת תפריט" : "Delete menu"}</span>
      </button>
    </div>
  `;

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  const cancelButton = dialog.querySelector(
    ".account-menu-draft-delete-cancel"
  );
  const confirmButton = dialog.querySelector(
    ".account-menu-draft-delete-confirm"
  );

  cancelButton?.addEventListener("click", closeDeleteDialog);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeDeleteDialog();
  });

  const handleEscape = (event) => {
    if (event.key !== "Escape") return;
    closeDeleteDialog();
    document.removeEventListener("keydown", handleEscape);
  };

  document.addEventListener("keydown", handleEscape);

  confirmButton?.addEventListener("click", async () => {
    const errorNode = dialog.querySelector(
      ".account-menu-draft-delete-error"
    );

    confirmButton.disabled = true;
    cancelButton.disabled = true;
    confirmButton.classList.add("is-loading");

    const label = confirmButton.querySelector("span");
    if (label) label.textContent = hebrew ? "מוחק..." : "Deleting...";

    try {
      await onConfirm();
      closeDeleteDialog();
    } catch (error) {
      console.error("Menu draft deletion failed:", error);

      if (errorNode) {
        errorNode.textContent =
          error?.message ||
          (hebrew
            ? "לא הצלחנו למחוק את התפריט. נסה שוב."
            : "We could not delete this menu. Please try again.");
      }

      confirmButton.disabled = false;
      cancelButton.disabled = false;
      confirmButton.classList.remove("is-loading");
      if (label) label.textContent = hebrew ? "מחיקת תפריט" : "Delete menu";
    }
  });

  window.setTimeout(() => confirmButton?.focus(), 0);
}

async function deleteDraft(draft, card, button) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user?.id) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  button.disabled = true;
  card?.classList.add("is-deleting-menu-draft");

  try {
    const { data, error } = await supabase
      .from("menu_projects")
      .delete()
      .eq("id", draft.id)
      .eq("owner_user_id", user.id)
      .is("activated_site_id", null)
      .select("id");

    if (error) throw error;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(
        "This draft could not be deleted. It may already be active or you may not have permission."
      );
    }

    drafts = drafts.filter((item) => item.id !== draft.id);
    lastLoadedAt = 0;

    // Let the existing React account refresh its own state instead of
    // manually mutating the card list and getting out of sync.
    window.setTimeout(() => {
      const refresh = document.querySelector(".account-refresh");
      if (refresh instanceof HTMLButtonElement && !refresh.disabled) {
        refresh.click();
      }

      scheduleSync(true);
    }, 80);
  } catch (error) {
    button.disabled = false;
    card?.classList.remove("is-deleting-menu-draft");
    throw error;
  }
}

function makeDeleteButton(draft, card) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = BUTTON_CLASS;
  button.dataset.menuDraftId = draft.id;
  button.setAttribute(
    "aria-label",
    isHebrewUi()
      ? `מחיקת ${getDraftName(draft)}`
      : `Delete ${getDraftName(draft)}`
  );

  button.innerHTML = `
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18"></path>
      <path d="M8 6V4h8v2"></path>
      <path d="M19 6l-1 14H6L5 6"></path>
    </svg>
    <span>${isHebrewUi() ? "מחיקה" : "Delete"}</span>
  `;

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    showDeleteDialog(draft, () => deleteDraft(draft, card, button));
  });

  return button;
}

async function syncDeleteButtons({ force = false } = {}) {
  const cards = Array.from(document.querySelectorAll(CARD_SELECTOR));
  if (!cards.length) return;

  const rows = await loadDrafts({
    force: force || cards.length !== drafts.length,
  });

  cards.forEach((card, index) => {
    const draft = rows[index];
    const existing = card.querySelector(`.${BUTTON_CLASS}`);

    if (!draft) {
      existing?.remove();
      return;
    }

    if (existing?.dataset.menuDraftId === draft.id) return;
    existing?.remove();

    const footer = card.querySelector(".account-generated-draft-date");
    const actions = card.querySelector(".account-website-actions");
    const target = footer || actions || card;

    target.appendChild(makeDeleteButton(draft, card));
  });
}

function scheduleSync(force = false) {
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncDeleteButtons({ force });
  }, 100);
}

function startMenuDraftDeleteObserver() {
  scheduleSync(true);

  const observer = new MutationObserver(() => {
    scheduleSync(false);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startMenuDraftDeleteObserver,
    { once: true }
  );
} else {
  startMenuDraftDeleteObserver();
}
