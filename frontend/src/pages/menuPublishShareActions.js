import "./menuPublishShareActions.css";

const COPY = {
  en: { share: "Share", copy: "Copy link", copied: "Copied" },
  he: { share: "שיתוף", copy: "העתקת קישור", copied: "הועתק" },
  ar: { share: "مشاركة", copy: "نسخ الرابط", copied: "تم النسخ" },
};

const SHARE_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="18" cy="5" r="3"></circle>
    <circle cx="6" cy="12" r="3"></circle>
    <circle cx="18" cy="19" r="3"></circle>
    <path d="m8.6 10.5 6.8-4"></path>
    <path d="m8.6 13.5 6.8 4"></path>
  </svg>`;

const COPY_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
  </svg>`;

const CHECK_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m5 12 4 4L19 6"></path>
  </svg>`;

function languageFor(root) {
  const lang = root?.getAttribute("lang") || document.documentElement.lang || "en";
  return lang === "he" || lang === "ar" ? lang : "en";
}

function publicUrlFor(root) {
  const value = root?.querySelector(".menu-publish-v2-url-preview strong")?.textContent?.trim();
  return value || "";
}

async function copyText(value) {
  if (!value) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy clipboard path below.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

function feedback(button, label, icon = CHECK_ICON) {
  if (!button) return;
  const previous = button.innerHTML;
  button.innerHTML = `${icon}<span>${label}</span>`;
  button.classList.add("is-success");
  window.setTimeout(() => {
    if (!button.isConnected) return;
    button.innerHTML = previous;
    button.classList.remove("is-success");
  }, 1600);
}

function buildActions(root) {
  const preview = root.querySelector(".menu-publish-v2-url-preview");
  if (!preview || root.querySelector(".menu-publish-v2-share-actions")) return;

  const lang = languageFor(root);
  const t = COPY[lang] || COPY.en;
  const wrap = document.createElement("div");
  wrap.className = "menu-publish-v2-share-actions";
  wrap.innerHTML = `
    <button type="button" class="menu-publish-v2-share-button" aria-label="${t.share}">
      ${SHARE_ICON}<span>${t.share}</span>
    </button>
    <button type="button" class="menu-publish-v2-copy-button" aria-label="${t.copy}">
      ${COPY_ICON}<span>${t.copy}</span>
    </button>`;

  const shareButton = wrap.querySelector(".menu-publish-v2-share-button");
  const copyButton = wrap.querySelector(".menu-publish-v2-copy-button");

  copyButton?.addEventListener("click", async () => {
    const url = publicUrlFor(root);
    if (!url) return;
    if (await copyText(url)) feedback(copyButton, t.copied);
  });

  shareButton?.addEventListener("click", async () => {
    const url = publicUrlFor(root);
    if (!url) return;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: root.querySelector(".menu-studio-header-menu-name")?.textContent?.trim() || "Beyond Menu",
          url,
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    if (await copyText(url)) feedback(shareButton, t.copied);
  });

  preview.insertAdjacentElement("afterend", wrap);
}

function sync() {
  document.querySelectorAll(".menu-publish-v2").forEach(buildActions);
}

export default function installMenuPublishShareActions() {
  if (window.__beyondMenuPublishShareActionsInstalled) return;
  window.__beyondMenuPublishShareActionsInstalled = true;

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      sync();
    });
  };

  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
