import "./menuPublishShareActions.css";

const COPY = {
  en: {
    share: "Share",
    copy: "Copy link",
    copied: "Copied",
    whatsapp: "WhatsApp",
    sms: "SMS",
    message: "Check out our menu",
  },
  he: {
    share: "שיתוף",
    copy: "העתקת קישור",
    copied: "הועתק",
    whatsapp: "WhatsApp",
    sms: "SMS",
    message: "הנה התפריט שלנו",
  },
  ar: {
    share: "مشاركة",
    copy: "نسخ الرابط",
    copied: "تم النسخ",
    whatsapp: "WhatsApp",
    sms: "SMS",
    message: "تفضلوا قائمتنا",
  },
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

const WHATSAPP_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.4-4.7A8.5 8.5 0 1 1 20.5 11.6Z"></path>
    <path d="M8.1 7.7c.3-.6.6-.6.9-.6h.5c.2 0 .4.1.5.4l.8 1.9c.1.3.1.5-.1.7l-.6.8c-.2.2-.1.4 0 .6.6 1.1 1.5 2 2.6 2.6.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.2l1.9.9c.3.1.4.3.4.5 0 .3-.2 1.3-.9 1.8-.5.4-1.2.7-2 .6-1.2-.2-2.8-.8-4.4-2.2-1.9-1.7-3.1-3.8-3.4-5-.2-.8.1-1.5.7-1.7Z"></path>
  </svg>`;

const SMS_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-7a4 4 0 0 1-1-2.6V7a4 4 0 0 1 4-4h11a4 4 0 0 1 4 4Z"></path>
    <path d="M7 9h10M7 13h7"></path>
  </svg>`;

function languageFor(root) {
  const lang = root?.getAttribute("lang") || document.documentElement.lang || "en";
  return lang === "he" || lang === "ar" ? lang : "en";
}

function publicUrlFor(root) {
  const value = root?.querySelector(".menu-publish-v2-url-preview strong")?.textContent?.trim();
  return value || "";
}

function menuNameFor(root) {
  return root?.querySelector(".menu-studio-header-menu-name")?.textContent?.trim() || "Beyond Menu";
}

function shareText(root, url, t) {
  const name = menuNameFor(root);
  return `${t.message} — ${name}\n${url}`;
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
    <button type="button" class="menu-publish-v2-whatsapp-button" aria-label="${t.whatsapp}">
      ${WHATSAPP_ICON}<span>${t.whatsapp}</span>
    </button>
    <button type="button" class="menu-publish-v2-sms-button" aria-label="${t.sms}">
      ${SMS_ICON}<span>${t.sms}</span>
    </button>
    <button type="button" class="menu-publish-v2-share-button" aria-label="${t.share}">
      ${SHARE_ICON}<span>${t.share}</span>
    </button>
    <button type="button" class="menu-publish-v2-copy-button" aria-label="${t.copy}">
      ${COPY_ICON}<span>${t.copy}</span>
    </button>`;

  const whatsappButton = wrap.querySelector(".menu-publish-v2-whatsapp-button");
  const smsButton = wrap.querySelector(".menu-publish-v2-sms-button");
  const shareButton = wrap.querySelector(".menu-publish-v2-share-button");
  const copyButton = wrap.querySelector(".menu-publish-v2-copy-button");

  whatsappButton?.addEventListener("click", () => {
    const url = publicUrlFor(root);
    if (!url) return;
    const message = shareText(root, url, t);
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  });

  smsButton?.addEventListener("click", () => {
    const url = publicUrlFor(root);
    if (!url) return;
    const message = shareText(root, url, t);
    window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
  });

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
          title: menuNameFor(root),
          text: t.message,
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
