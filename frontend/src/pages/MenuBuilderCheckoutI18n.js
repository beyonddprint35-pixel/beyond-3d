const MENU_BUILDER_EXTRA_HE = Object.freeze({
  "Turn your existing menu": "הפכו את התפריט הקיים שלכם",
  "into a digital experience.": "לחוויה דיגיטלית.",
  "Back to plans": "חזרה לחבילות",
  "04 / CHECKOUT": "04 / תשלום",
  "Activate your menu.": "הפעילו את התפריט שלכם.",
  "Your menu is ready. Confirm the restaurant and subscription before continuing to secure payment.": "התפריט שלכם מוכן. אשרו את המסעדה ואת החבילה לפני המעבר לתשלום מאובטח.",
  "RESTAURANT": "מסעדה",
  "Who is this subscription for?": "עבור איזו מסעדה החבילה?",
  "RESTAURANT NAME": "שם המסעדה",
  "Restaurant name": "שם המסעדה",
  "PAYER": "משלם",
  "Subscription payer": "משלם החבילה",
  "BEYOND ACCOUNT": "חשבון BEYOND",
  "Signed-in user": "משתמש מחובר",
  "This user pays for the restaurant subscription. Other users can be assigned to the restaurant later without purchasing another subscription.": "משתמש זה משלם עבור חבילת המסעדה. בהמשך ניתן לשייך משתמשים נוספים למסעדה ללא רכישת חבילה נוספת.",
  "PROMO CODE": "קוד הטבה",
  "Have a BEYOND code?": "יש לכם קוד BEYOND?",
  "Enter promo code": "הזינו קוד הטבה",
  "Checking...": "בודק...",
  "Apply": "החל",
  "Remove": "הסר",
  "ORDER SUMMARY": "סיכום הזמנה",
  "Billing": "חיוב",
  "Subscription": "חבילה",
  "Promo discount": "הנחת קוד",
  "TOTAL": "סה״כ",
  "No payment required": "אין צורך בתשלום",
  "per year": "לשנה",
  "Calculating...": "מחשב...",
  "Activate Subscription": "הפעלת החבילה",
  "Continue to Secure Payment": "המשך לתשלום מאובטח",
  "Recurring payment secured through BEYOND": "תשלום מתחדש מאובטח דרך BEYOND",
  "12 months of service · pay for 11": "12 חודשי שירות · משלמים על 11",
  "Enter a promo code first.": "יש להזין קודם קוד הטבה.",
  "Enter your restaurant name.": "יש להזין את שם המסעדה.",
  "Could not calculate this subscription.": "לא ניתן לחשב את החבילה הזו.",
  "100% promo verified. In the final flow this will activate the restaurant immediately without payment.": "קוד של 100% אומת. בתהליך הסופי הוא יפעיל את המסעדה מיד ללא תשלום.",
  "Checkout looks correct. The next step is connecting this button to secure recurring PayPlus payment.": "מסך התשלום נראה תקין. השלב הבא הוא לחבר את הכפתור לתשלום מתחדש ומאובטח דרך PayPlus."
});

const MENU_BUILDER_EXTRA_EN = new Map(
  Object.entries(MENU_BUILDER_EXTRA_HE).map(([english, hebrew]) => [clean(hebrew), english])
);

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function language() {
  return document.documentElement.getAttribute("data-beyond-language") ||
    document.documentElement.dataset.beyondLanguage ||
    (() => {
      try {
        return localStorage.getItem("beyond-language") || "en";
      } catch {
        return "en";
      }
    })();
}

function convert(value, lang) {
  const normalized = clean(value);
  if (!normalized) return null;

  if (lang === "he") {
    const applied = normalized.match(/^(.+) applied · (\d+)% discount$/i);
    if (applied) return `${applied[1]} הופעל · ${applied[2]}% הנחה`;

    const off = normalized.match(/^(\d+)% OFF$/i);
    if (off) return `${off[1]}% הנחה`;

    return MENU_BUILDER_EXTRA_HE[normalized] || null;
  }

  const appliedHe = normalized.match(/^(.+) הופעל · (\d+)% הנחה$/);
  if (appliedHe) return `${appliedHe[1]} applied · ${appliedHe[2]}% discount`;

  const offHe = normalized.match(/^(\d+)% הנחה$/);
  if (offHe) return `${offHe[1]}% OFF`;

  return MENU_BUILDER_EXTRA_EN.get(normalized) || null;
}

function excluded(element) {
  return !element || Boolean(
    element.closest(
      "script,style,code,pre,svg,canvas,.bm-public,.ep-page,.customers-template-menu,[data-customer-template-menu],[data-no-builder-translate]"
    )
  );
}

function applyExtraBuilderTranslation() {
  const root = document.querySelector(".menu-builder-unified");
  if (!root) return;

  const lang = language();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    if (!excluded(node.parentElement) && node.nodeValue?.trim()) {
      const next = convert(node.nodeValue, lang);
      if (next && clean(next) !== clean(node.nodeValue)) {
        const leading = node.nodeValue.match(/^\s*/)?.[0] || "";
        const trailing = node.nodeValue.match(/\s*$/)?.[0] || "";
        node.nodeValue = `${leading}${next}${trailing}`;
      }
    }
    node = walker.nextNode();
  }

  root.querySelectorAll("[placeholder],[title],[aria-label]").forEach((element) => {
    if (excluded(element)) return;

    ["placeholder", "title", "aria-label"].forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      const current = element.getAttribute(attribute);
      const next = convert(current, lang);
      if (next && next !== current) element.setAttribute(attribute, next);
    });
  });
}

let scheduled = 0;
function scheduleExtraBuilderTranslation() {
  if (scheduled) cancelAnimationFrame(scheduled);
  scheduled = requestAnimationFrame(() => {
    scheduled = 0;
    applyExtraBuilderTranslation();
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const observer = new MutationObserver(scheduleExtraBuilderTranslation);

  const start = () => {
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["data-beyond-language", "placeholder", "title", "aria-label"]
    });
    scheduleExtraBuilderTranslation();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
