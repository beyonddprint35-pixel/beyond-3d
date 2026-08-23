import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Moon, Sun } from "lucide-react";

import MenuBuilder from "./MenuBuilder";
import { BEYOND_HE } from "../i18n/beyondUiTranslations";

import "./MenuBuilderUnified.css";
import "./MenuBuilderUnifiedFixes.css";

const THEME_STORAGE_KEY = "beyond-theme";
const BUILDER_LANGUAGE_STORAGE_KEY = "beyond-menu-builder-ui-language";

const BUILDER_HE = Object.freeze({
  ...BEYOND_HE,
  "Loading BEYOND Menu...": "טוען את BEYOND Menu...",
  "Returning to BEYOND...": "חוזר ל-BEYOND...",
  "Back to BEYOND": "חזרה ל-BEYOND",
  "Loading attempts...": "טוען ניסיונות...",
  "Admin access · Unlimited builds": "גישת מנהל · בניות ללא הגבלה",
  "BEYOND MENU AI": "BEYOND MENU AI",
  "Turn your existing menu": "הפכו את התפריט הקיים שלכם",
  "into a digital experience.": "\u00A0לחוויה דיגיטלית.",
  "Turn your existing menu into a digital experience.": "הפכו את התפריט הקיים שלכם לחוויה דיגיטלית.",
  "Upload a PDF, add menu photos, paste your text — or combine them. BEYOND AI will structure the menu and show you a private preview before you choose a subscription.": "העלו PDF, הוסיפו תמונות של התפריט, הדביקו טקסט — או שלבו ביניהם. BEYOND AI יסדר את התפריט ויציג לכם תצוגה פרטית לפני בחירת החבילה.",
  "Checking for your saved menu...": "בודק אם יש לכם תפריט שמור...",
  "Your menu is saved to your BEYOND account.": "התפריט שלכם שמור בחשבון BEYOND.",
  "You can log out and come back later. We will restore this menu automatically.": "אפשר להתנתק ולחזור מאוחר יותר. התפריט ישוחזר אוטומטית.",
  "Saved menu restored": "התפריט השמור שוחזר",
  "Saving...": "שומר...",
  "Could not save changes": "לא ניתן לשמור את השינויים",
  "Saved automatically": "נשמר אוטומטית",
  "AI menu saved": "תפריט ה-AI נשמר",
  "MENU MODELS": "מודלים של תפריט",
  "01 / LANGUAGES": "01 / שפות",
  "Which languages do you want?": "באילו שפות תרצו את התפריט?",
  "Choose one or more languages for the live customer menu.": "בחרו שפה אחת או יותר לתפריט החי של הלקוחות.",
  "Choose at least one language.": "בחרו לפחות שפה אחת.",
  English: "אנגלית",
  "02 / SOURCE": "02 / מקור",
  "Give us your menu.": "תנו לנו את התפריט שלכם.",
  "Up to 12 files · 25 MB total": "עד 12 קבצים · 25 MB בסך הכול",
  "Upload PDF or photos": "העלאת PDF או תמונות",
  "PDF, JPG, PNG or WEBP. You can combine several menu pages.": "PDF, JPG, PNG או WEBP. אפשר לשלב כמה עמודי תפריט.",
  "Choose files": "בחירת קבצים",
  "Write or paste": "כתיבה או הדבקה",
  Remove: "הסר",
  "You can upload up to 12 files.": "ניתן להעלות עד 12 קבצים.",
  "The combined upload can be up to 25 MB.": "המשקל הכולל של הקבצים יכול להיות עד 25 MB.",
  "The combined upload can be up to 25 MB. Remove a file or choose smaller files.": "המשקל הכולל של הקבצים יכול להיות עד 25 MB. הסירו קובץ או בחרו קבצים קטנים יותר.",
  "Only PDF, JPG, PNG or WEBP files are supported.": "ניתן להעלות רק קובצי PDF, JPG, PNG או WEBP.",
  "Your AI preview is private.": "תצוגת ה-AI שלכם פרטית.",
  "A successful build uses 1 of your 3 attempts. System failures are refunded automatically.": "בנייה מוצלחת משתמשת בניסיון אחד מתוך שלושה. תקלות מערכת מוחזרות אוטומטית.",
  "Building your menu...": "בונה את התפריט שלכם...",
  "Build My Menu": "בניית התפריט שלי",
  "03 / BRAND & PREVIEW": "03 / מותג ותצוגה",
  "02 / BRAND & PREVIEW": "03 / מותג ותצוגה",
  "Design your live menu.": "עצבו את התפריט החי שלכם.",
  "This is the same BEYOND customer-menu system that your restaurant will use live. Add your logo, choose the brand colors and fonts, switch languages and preview the final customer experience before subscribing.": "זוהי אותה מערכת תפריט הלקוחות של BEYOND שבה המסעדה שלכם תשתמש בפועל. הוסיפו לוגו, בחרו צבעי מותג ופונטים, החליפו שפות וצפו בחוויית הלקוח הסופית לפני ההצטרפות.",
  "Saving design...": "שומר את העיצוב...",
  "Save Design & Continue": "שמירת העיצוב והמשך",
  "LIVE CUSTOMER PREVIEW": "תצוגת לקוח חיה",
  "Changes appear instantly": "השינויים מופיעים מיד",
  "Mobile View": "תצוגת מובייל",
  "LIVE MOBILE PREVIEW": "תצוגת מובייל חיה",
  "Your real customer menu on mobile": "התפריט האמיתי של הלקוח במובייל",
  "Close mobile preview": "סגירת תצוגת המובייל",

  /* Menu Studio */
  "03 / STYLE": "03 / עיצוב",
  "Menu Studio": "סטודיו התפריט",
  Design: "עיצוב",
  "Color Templates": "תבניות צבע",
  Brand: "מותג",
  Colors: "צבעים",
  Type: "טיפוגרפיה",
  "Choose a menu layout": "בחרו עיצוב לתפריט",
  "Every design is mobile-first and supports RTL.": "כל עיצוב מותאם קודם למובייל ותומך ב-RTL.",
  Classic: "קלאסי",
  "Balanced hero, category pills and clean menu cards.": "כותרת מאוזנת, קטגוריות ברורות וכרטיסי תפריט נקיים.",
  Compact: "קומפקטי",
  "Tighter spacing for restaurants with long menus.": "מרווחים צפופים יותר למסעדות עם תפריטים ארוכים.",
  Cards: "כרטיסים",
  "More visual separation with a card-focused menu grid.": "הפרדה חזותית חזקה יותר באמצעות כרטיסי תפריט.",
  Editorial: "אלגנטי",
  "Elegant typography with a refined restaurant feel.": "טיפוגרפיה אלגנטית ומראה מסעדה מעודן.",
  Minimal: "מינימלי",
  "Quiet, lightweight layout with fewer visual borders.": "עיצוב נקי וקליל עם פחות מסגרות חזותיות.",
  Bold: "מודגש",
  "Strong hero and high-impact category navigation.": "כותרת חזקה וניווט קטגוריות בולט.",
  "Apply a ready-made palette without changing the selected layout.": "החילו פלטת צבעים מוכנה בלי לשנות את העיצוב שנבחר.",
  "RESTAURANT NAME": "שם המסעדה",
  SUBTITLE: "כותרת משנה",
  "Current logo": "לוגו נוכחי",
  "Upload & Crop Again": "העלאה וחיתוך מחדש",
  "Upload & Crop Logo": "העלאה וחיתוך לוגו",
  "Remove logo": "הסרת לוגו",
  "Font family": "משפחת גופנים",
  HEADINGS: "כותרות",
  BODY: "טקסט",
  "Font sizes": "גדלי גופן",
  "Reset font sizes": "איפוס גדלי גופן",

  "04 / ACTIVATE": "04 / הפעלה",
  "Choose your BEYOND plan.": "בחרו את חבילת BEYOND שלכם.",
  "Your menu draft is ready. Choose how you want to run it live.": "טיוטת התפריט מוכנה. בחרו כיצד להפעיל אותה אונליין.",
  Monthly: "חודשי",
  Annual: "שנתי",
  "PAY FOR 11": "משלמים על 11",
  "PREMIUM EXPERIENCE": "חוויית PREMIUM",
  Basic: "בסיסי",
  Premium: "פרימיום",
  "per year · 12 months of service": "לשנה · 12 חודשי שירות",
  "per month": "לחודש",
  "1 month included free": "חודש אחד כלול ללא עלות",
  "Digital restaurant menu": "תפריט דיגיטלי למסעדה",
  "Menu management": "ניהול תפריט",
  "Multi-language support": "תמיכה במספר שפות",
  "AI menu import": "ייבוא תפריט באמצעות AI",
  "Pictures inside the menu": "תמונות בתוך התפריט",
  "+ More plan features coming": "+ תכונות נוספות יתווספו בהמשך",
  "ADMIN · AI COST": "מנהל · עלות AI",
  "Cost of this try": "עלות הניסיון הזה",
  Model: "מודל",
  "OpenAI requests": "בקשות OpenAI",
  "Input tokens": "טוקנים בקלט",
  "Cached input": "קלט מהמטמון",
  "Output tokens": "טוקנים בפלט",
  "Total tokens": "סה״כ טוקנים",
  "Cache hit · No OpenAI request · $0 cost": "נמצא במטמון · ללא בקשת OpenAI · עלות $0",
  "Estimated from the actual token usage returned by OpenAI": "הערכה לפי שימוש הטוקנים בפועל שחזר מ-OpenAI",
  "SMART RECOVERY": "שחזור חכם",
  "visible items detected": "פריטים גלויים זוהו",
  "confidently read": "נקראו בביטחון",
  "Best option: original PDF": "האפשרות הטובה ביותר: PDF מקורי",
  "Upload the restaurant's original PDF whenever possible. Text is usually much clearer than in a screenshot.": "ככל שניתן, העלו את קובץ ה-PDF המקורי של המסעדה. הטקסט בדרך כלל ברור יותר מאשר בצילום מסך.",
  "Use close-up menu images": "השתמשו בתמונות תקריב של התפריט",
  "Upload 2–12 close-ups so each section and item is large enough to read accurately.": "העלו 2–12 תמונות תקריב כדי שכל קטגוריה ופריט יהיו גדולים מספיק לקריאה מדויקת.",
  "Upload 2–6 close-ups so each section and item is large enough to read accurately.": "העלו 2–12 תמונות תקריב כדי שכל קטגוריה ופריט יהיו גדולים מספיק לקריאה מדויקת.",
  "Add menu text": "הוסיפו טקסט של התפריט",
  "Paste any available text into the box above. BEYOND can combine text with your uploaded images.": "הדביקו כל טקסט זמין בתיבה למעלה. BEYOND יכול לשלב את הטקסט עם התמונות שהעליתם.",
  "Preparing close-ups...": "מכין תמונות תקריב...",
  "Smart Retry with automatic close-ups": "ניסיון חכם עם תמונות תקריב אוטומטיות",
  "Automatic recovery has already been used for this menu. To avoid unnecessary AI cost, upload the original PDF or clearer close-up images instead of retrying again.": "השחזור האוטומטי כבר הופעל עבור התפריט הזה. כדי להימנע מעלות AI מיותרת, העלו PDF מקורי או תמונות תקריב ברורות יותר במקום לנסות שוב.",
  "This failed build was not counted against your AI builds.": "הבנייה שנכשלה לא נספרה במכסת בניות ה-AI שלכם.",
  "BEYOND only counts successful AI menu builds.": "BEYOND סופר רק בניות AI שהושלמו בהצלחה.",
  "Back to plans": "חזרה לחבילות",
  "04 / CHECKOUT": "04 / תשלום",
  "Activate your menu.": "הפעילו את התפריט שלכם.",
  "Your menu is ready. Confirm the restaurant and subscription before continuing to secure payment.": "התפריט שלכם מוכן. אשרו את המסעדה ואת החבילה לפני המעבר לתשלום מאובטח.",
  RESTAURANT: "מסעדה",
  "Who is this subscription for?": "עבור איזו מסעדה החבילה?",
  "Restaurant name": "שם המסעדה",
  PAYER: "משלם",
  "Subscription payer": "משלם החבילה",
  "BEYOND ACCOUNT": "חשבון BEYOND",
  "Signed-in user": "משתמש מחובר",
  "This user pays for the restaurant subscription. Other users can be assigned to the restaurant later without purchasing another subscription.": "משתמש זה משלם עבור חבילת המסעדה. בהמשך ניתן לשייך משתמשים נוספים למסעדה ללא רכישת חבילה נוספת.",
  "PROMO CODE": "קוד הטבה",
  "Have a BEYOND code?": "יש לכם קוד BEYOND?",
  "Enter promo code": "הזינו קוד הטבה",
  "Checking...": "בודק...",
  Apply: "החל",
  "ORDER SUMMARY": "סיכום הזמנה",
  Billing: "חיוב",
  Subscription: "חבילה",
  "Promo discount": "הנחת קוד",
  TOTAL: "סה״כ",
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

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const BUILDER_EN = new Map(
  Object.entries(BUILDER_HE).map(([english, hebrew]) => [normalizeText(hebrew), english])
);

function readTheme() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function readBuilderLanguage() {
  try {
    const saved = window.localStorage.getItem(BUILDER_LANGUAGE_STORAGE_KEY);
    if (saved === "he" || saved === "en") return saved;
    return window.localStorage.getItem("beyond-language") === "he" ? "he" : "en";
  } catch {
    return "en";
  }
}

function translateDynamic(value, language) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  if (language === "he") {
    const remaining = normalized.match(/^(\d+) of (\d+) AI builds remaining$/i);
    if (remaining) return `נשארו ${remaining[1]} מתוך ${remaining[2]} בניות AI`;

    const savedModels = normalized.match(/^(\d+) saved models?$/i);
    if (savedModels) {
      const count = Number(savedModels[1]);
      return count === 1 ? "מודל שמור אחד" : `${count} מודלים שמורים`;
    }

    const choosePlan = normalized.match(/^Choose (.+)$/i);
    if (choosePlan) return `בחירת ${choosePlan[1]}`;

    const applied = normalized.match(/^(.+) applied · (\d+)% discount$/i);
    if (applied) return `${applied[1]} הופעל · ${applied[2]}% הנחה`;

    const off = normalized.match(/^(\d+)% OFF$/i);
    if (off) return `${off[1]}% הנחה`;

    return BUILDER_HE[normalized] || null;
  }

  const remainingHe = normalized.match(/^נשארו (\d+) מתוך (\d+) בניות AI$/);
  if (remainingHe) return `${remainingHe[1]} of ${remainingHe[2]} AI builds remaining`;
  if (normalized === "מודל שמור אחד") return "1 saved model";

  const savedModelsHe = normalized.match(/^(\d+) מודלים שמורים$/);
  if (savedModelsHe) {
    const count = Number(savedModelsHe[1]);
    return `${count} saved ${count === 1 ? "model" : "models"}`;
  }

  const choosePlanHe = normalized.match(/^בחירת (.+)$/);
  if (choosePlanHe) return `Choose ${choosePlanHe[1]}`;

  const appliedHe = normalized.match(/^(.+) הופעל · (\d+)% הנחה$/);
  if (appliedHe) return `${appliedHe[1]} applied · ${appliedHe[2]}% discount`;

  const offHe = normalized.match(/^(\d+)% הנחה$/);
  if (offHe) return `${offHe[1]}% OFF`;

  return BUILDER_EN.get(normalized) || null;
}

function shouldSkipTranslation(element) {
  if (!element) return true;

  return Boolean(
    element.closest(
      [
        "script",
        "style",
        "code",
        "pre",
        "svg",
        "canvas",
        ".digital-menu-template",
        ".bm-public",
        ".ep-page",
        ".customers-template-menu",
        "[data-customer-template-menu]",
        "[data-no-builder-translate]"
      ].join(",")
    )
  );
}

function StableBuilderTranslator({ language, rootRef }) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    function translateTextNode(node) {
      const parent = node?.parentElement;
      if (!parent || shouldSkipTranslation(parent)) return;

      const current = node.nodeValue;
      if (!current || !current.trim()) return;

      const converted = translateDynamic(current, language);
      if (!converted || normalizeText(current) === normalizeText(converted)) return;

      const leading = current.match(/^\s*/)?.[0] || "";
      const trailing = current.match(/\s*$/)?.[0] || "";
      node.nodeValue = `${leading}${converted}${trailing}`;
    }

    function translateAttributes(element) {
      if (!(element instanceof Element) || shouldSkipTranslation(element)) return;

      ["placeholder", "title", "aria-label"].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        const current = element.getAttribute(attribute);
        const converted = translateDynamic(current, language);
        if (converted && converted !== current) element.setAttribute(attribute, converted);
      });
    }

    function translateSubtree(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        translateTextNode(node);
        return;
      }

      if (!(node instanceof Element)) return;
      if (shouldSkipTranslation(node)) return;

      translateAttributes(node);

      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode) {
        translateTextNode(textNode);
        textNode = walker.nextNode();
      }

      node.querySelectorAll("*").forEach(translateAttributes);
    }

    translateSubtree(root);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target);
          continue;
        }
        mutation.addedNodes.forEach(translateSubtree);
      }
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true
    });

    return () => observer.disconnect();
  }, [language, rootRef]);

  return null;
}

function BuilderToolbarControls({ language, setLanguage, theme, setTheme }) {
  return (
    <div className="menu-builder-unified-controls" data-no-builder-translate>
      <div className="menu-builder-ui-language" aria-label="Menu Builder language">
        <button
          type="button"
          className={language === "en" ? "active" : ""}
          onClick={() => setLanguage("en")}
          aria-pressed={language === "en"}
        >
          EN
        </button>
        <button
          type="button"
          className={language === "he" ? "active" : ""}
          onClick={() => setLanguage("he")}
          aria-pressed={language === "he"}
        >
          עב
        </button>
      </div>

      <button
        type="button"
        className="menu-builder-theme-toggle"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={theme === "dark" ? "Use light mode" : "Use dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </div>
  );
}

export default function MenuBuilderStable() {
  const [language, setLanguage] = useState(readBuilderLanguage);
  const [theme, setTheme] = useState(readTheme);
  const [toolbarTarget, setToolbarTarget] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(BUILDER_LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Storage may be unavailable.
    }
  }, [language]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage may be unavailable.
    }

    document.documentElement.setAttribute("data-beyond-theme", theme);
    window.dispatchEvent(new CustomEvent("beyond-theme-change", { detail: { theme } }));
  }, [theme]);

  useEffect(() => {
    let stopped = false;
    let timer = 0;

    function findToolbar() {
      if (stopped) return;
      const target = rootRef.current?.querySelector(".menu-builder-topbar-right") || null;
      if (target) {
        setToolbarTarget((current) => (current === target ? current : target));
        return;
      }
      timer = window.setTimeout(findToolbar, 100);
    }

    findToolbar();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`menu-builder-unified theme-${theme}`}
      data-builder-language={language}
      data-no-beyond-translate="true"
      dir={language === "he" ? "rtl" : "ltr"}
      lang={language === "he" ? "he" : "en"}
    >
      <StableBuilderTranslator language={language} rootRef={rootRef} />
      <MenuBuilder />

      {toolbarTarget
        ? createPortal(
            <BuilderToolbarControls
              language={language}
              setLanguage={setLanguage}
              theme={theme}
              setTheme={setTheme}
            />,
            toolbarTarget
          )
        : null}
    </div>
  );
}
