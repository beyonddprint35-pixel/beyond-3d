const INTERACTION_SELECTOR = ".menu-home-access-preview";

function buildMenuMarkup(isHebrew) {
  return `
    <div class="menu-home-access-live-menu" aria-hidden="true">
      <div class="menu-home-access-live-head">
        <div class="menu-home-access-live-logo">B</div>
        <div>
          <strong>BEYOND MENU</strong>
          <span>${isHebrew ? "מסעדה · בר" : "RESTAURANT · BAR"}</span>
        </div>
      </div>
      <div class="menu-home-access-live-tabs">
        <span class="active">${isHebrew ? "אוכל" : "FOOD"}</span>
        <span>${isHebrew ? "משקאות" : "DRINKS"}</span>
      </div>
      <div class="menu-home-access-live-item">
        <div><strong>${isHebrew ? "בוראטה ועגבניות" : "Burrata & Tomatoes"}</strong><span>${isHebrew ? "בוראטה טרייה, בזיליקום" : "Fresh burrata, basil"}</span></div><b>₪46</b>
      </div>
      <div class="menu-home-access-live-item">
        <div><strong>${isHebrew ? "ריגטוני כמהין" : "Truffle Rigatoni"}</strong><span>${isHebrew ? "פרמזן ופלפל שחור" : "Parmesan, black pepper"}</span></div><b>₪68</b>
      </div>
    </div>
  `;
}

function setupPreview(preview) {
  if (!preview || preview.dataset.accessInteractive === "true") return;
  preview.dataset.accessInteractive = "true";

  const stand = preview.querySelector(".menu-home-table-stand");
  const standCard = preview.querySelector(".menu-home-stand-card");
  const phone = preview.querySelector(".menu-home-access-phone");
  if (!stand || !standCard || !phone) return;

  const page = preview.closest(".menu-home");
  const isHebrew = page?.getAttribute("dir") === "rtl";

  stand.setAttribute("role", "button");
  stand.setAttribute("tabindex", "0");
  stand.setAttribute(
    "aria-label",
    isHebrew ? "הפעלת הדגמת פתיחת התפריט" : "Open the menu demo"
  );

  const hint = document.createElement("div");
  hint.className = "menu-home-access-interaction-hint";
  hint.innerHTML = `<span class="menu-home-access-hint-dot"></span>${
    isHebrew ? "לחצו או הצמידו לפתיחת התפריט" : "Tap the stand to open the menu"
  }`;
  preview.appendChild(hint);

  const signal = document.createElement("div");
  signal.className = "menu-home-access-signal";
  signal.innerHTML = "<i></i><i></i><i></i>";
  preview.appendChild(signal);

  phone.insertAdjacentHTML("beforeend", buildMenuMarkup(isHebrew));

  const statusSmall = phone.querySelector(":scope > small");
  const statusStrong = phone.querySelector(":scope > strong");
  const statusText = phone.querySelector(":scope > p");
  const check = phone.querySelector(".menu-home-access-check");
  const liveMenu = phone.querySelector(".menu-home-access-live-menu");

  let timers = [];
  let autoTimer = null;
  let initialAutoTimer = null;
  let userInteracted = false;

  function clearTimers() {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
  }

  function setState(state) {
    preview.classList.remove("is-idle", "is-connecting", "is-open");
    preview.classList.add(`is-${state}`);

    if (state === "idle") {
      if (statusSmall) statusSmall.textContent = isHebrew ? "מוכן לפתיחה" : "READY TO OPEN";
      if (statusStrong) statusStrong.textContent = "BEYOND MENU";
      if (statusText) statusText.textContent = isHebrew ? "סרקו או הצמידו את הטלפון" : "Scan the QR or tap with NFC.";
      if (check) check.setAttribute("aria-hidden", "true");
      if (liveMenu) liveMenu.setAttribute("aria-hidden", "true");
    }

    if (state === "connecting") {
      if (statusSmall) statusSmall.textContent = isHebrew ? "מתחבר..." : "OPENING MENU...";
      if (statusStrong) statusStrong.textContent = isHebrew ? "רק רגע" : "Just a moment";
      if (statusText) statusText.textContent = isHebrew ? "הקישור המאובטח נפתח" : "Opening the secure menu link";
      if (check) check.setAttribute("aria-hidden", "true");
      if (liveMenu) liveMenu.setAttribute("aria-hidden", "true");
    }

    if (state === "open") {
      if (statusSmall) statusSmall.textContent = isHebrew ? "התפריט נפתח" : "MENU OPENED";
      if (statusStrong) statusStrong.textContent = "BEYOND MENU";
      if (statusText) statusText.textContent = isHebrew ? "בלי אפליקציה. בלי התחברות." : "No app. No login.";
      if (check) check.setAttribute("aria-hidden", "false");
      if (liveMenu) liveMenu.setAttribute("aria-hidden", "false");
    }
  }

  function runDemo(fromUser = false) {
    clearTimers();
    if (fromUser) userInteracted = true;

    setState("connecting");
    timers.push(window.setTimeout(() => setState("open"), 900));
    timers.push(window.setTimeout(() => setState("idle"), 4900));
  }

  function activate(event) {
    if (event?.type === "keydown" && !["Enter", " "].includes(event.key)) return;
    if (event?.type === "keydown") event.preventDefault();
    runDemo(true);
  }

  stand.addEventListener("click", activate);
  stand.addEventListener("keydown", activate);

  setState("idle");

  initialAutoTimer = window.setTimeout(() => {
    if (!document.hidden && !userInteracted) runDemo(false);
  }, 1900);

  autoTimer = window.setInterval(() => {
    if (document.hidden || userInteracted) return;
    runDemo(false);
  }, 9000);

  preview._beyondAccessCleanup = () => {
    clearTimers();
    window.clearTimeout(initialAutoTimer);
    window.clearInterval(autoTimer);
    stand.removeEventListener("click", activate);
    stand.removeEventListener("keydown", activate);
  };
}

function scan() {
  document.querySelectorAll(INTERACTION_SELECTOR).forEach(setupPreview);
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
