import { collectV3TranslationRepairFields } from "../features/menu-engine/data/menuV3TranslationRepairService";
import { readMenuStudioV2Draft } from "../features/menu-engine/studio/menuStudioV2Session";
import "./menuTranslationReviewOverlay.css";

const COPY = {
  en: { title:(n)=>`${n} translation${n===1?"":"s"} need review`, review:"Review", next:"Next issue", close:"Close", category:"Category", item:"Item", field:{name:"Name",note:"General note",description:"Description",label:"Price option"}, reason:"Translation may be incomplete", language:{en:"English",he:"Hebrew",ar:"Arabic"} },
  he: { title:(n)=>`${n} תרגומים דורשים בדיקה`, review:"בדיקה", next:"לבעיה הבאה", close:"סגירה", category:"קטגוריה", item:"פריט", field:{name:"שם",note:"הערה כללית",description:"תיאור",label:"אפשרות מחיר"}, reason:"ייתכן שהתרגום אינו מלא", language:{en:"אנגלית",he:"עברית",ar:"ערבית"} },
  ar: { title:(n)=>`${n} ترجمة تحتاج إلى مراجعة`, review:"مراجعة", next:"المشكلة التالية", close:"إغلاق", category:"الفئة", item:"الصنف", field:{name:"الاسم",note:"ملاحظة عامة",description:"الوصف",label:"خيار السعر"}, reason:"قد تكون الترجمة غير مكتملة", language:{en:"الإنجليزية",he:"العبرية",ar:"العربية"} },
};

const text = (value) => value == null ? "" : String(value);
const localized = (value, language) => value && typeof value === "object" ? text(value[language] || value.en || value.he || value.ar) : text(value);

function uiLanguage() {
  const lang = document.documentElement.lang || document.querySelector(".menu-content-v2")?.getAttribute("lang") || "en";
  return ["en","he","ar"].includes(lang) ? lang : "en";
}

function resolveIssue(issue, menu) {
  const parts = text(issue?.key).split(".");
  const language = issue?.targetLanguage || parts.at(-1) || "en";
  let entityType = "";
  let entityName = "";
  let field = "";
  let current = "";

  if (parts[0] === "groups") {
    const group = menu?.groups?.[Number(parts[1])];
    entityType = "category";
    entityName = localized(group?.name, menu?.default_language || "he") || localized(group?.name, "en");
    field = parts[2] || "name";
    current = localized(group?.[field], language);
  } else if (parts[0] === "items") {
    const item = menu?.items?.[Number(parts[1])];
    entityType = "item";
    entityName = localized(item?.name, menu?.default_language || "he") || localized(item?.name, "en");
    if (parts[2] === "price_options") {
      field = "label";
      const option = item?.price_options?.[Number(parts[3])];
      current = text(option?.[`label_${language}`]);
    } else {
      field = parts[2] || "name";
      current = localized(item?.[field], language);
    }
  }

  return { ...issue, language, entityType, entityName, field, current };
}

function appendHighlightedText(container, value) {
  const source = text(value);
  const regex = /(\.{3,}|…+|\?{3,}|-{3,}|_{3,})/g;
  let last = 0;
  for (const match of source.matchAll(regex)) {
    if (match.index > last) container.append(document.createTextNode(source.slice(last, match.index)));
    const mark = document.createElement("mark");
    mark.textContent = match[0];
    container.append(mark);
    last = match.index + match[0].length;
  }
  if (last < source.length) container.append(document.createTextNode(source.slice(last)));
  if (!source) container.textContent = "—";
}

function buildOverlay() {
  const root = document.createElement("aside");
  root.className = "menu-translation-review-overlay";
  root.hidden = true;
  root.innerHTML = `
    <button type="button" class="menu-translation-review-summary" aria-expanded="false">
      <span class="warn">!</span><strong></strong><span class="review-label"></span>
    </button>
    <section class="menu-translation-review-panel" hidden>
      <header><strong class="panel-title"></strong><button type="button" class="close">×</button></header>
      <div class="meta"></div>
      <div class="reason"></div>
      <div class="snippet"></div>
      <footer><span class="counter"></span><button type="button" class="next"></button></footer>
    </section>`;
  document.body.append(root);
  return root;
}

export default function installMenuTranslationReviewOverlay() {
  let root = null;
  let currentIssues = [];
  let currentIndex = 0;

  function ensureRoot() { if (!root?.isConnected) root = buildOverlay(); return root; }

  function render() {
    const onContent = window.location.pathname.startsWith("/menu-studio/content");
    const el = ensureRoot();
    if (!onContent) { el.hidden = true; return; }

    const draft = readMenuStudioV2Draft();
    const issues = collectV3TranslationRepairFields(draft?.menu || {}).map((issue) => resolveIssue(issue, draft?.menu || {}));
    currentIssues = issues;
    if (!issues.length) { el.hidden = true; return; }
    el.hidden = false;
    currentIndex = Math.min(currentIndex, issues.length - 1);

    const lang = uiLanguage();
    const copy = COPY[lang] || COPY.en;
    el.querySelector(".menu-translation-review-summary strong").textContent = copy.title(issues.length);
    el.querySelector(".review-label").textContent = copy.review;
    el.querySelector(".panel-title").textContent = copy.title(issues.length);
    el.querySelector(".next").textContent = copy.next;

    const issue = issues[currentIndex];
    const entityLabel = issue.entityType === "item" ? copy.item : copy.category;
    const fieldLabel = copy.field[issue.field] || issue.field;
    const languageLabel = copy.language[issue.language] || issue.language.toUpperCase();
    el.querySelector(".meta").textContent = `${entityLabel}: ${issue.entityName || "—"}  ·  ${fieldLabel}  ·  ${languageLabel}`;
    el.querySelector(".reason").textContent = copy.reason;
    const snippet = el.querySelector(".snippet");
    snippet.textContent = "";
    appendHighlightedText(snippet, issue.current);
    el.querySelector(".counter").textContent = `${currentIndex + 1} / ${issues.length}`;
  }

  function wire() {
    const el = ensureRoot();
    const summary = el.querySelector(".menu-translation-review-summary");
    const panel = el.querySelector(".menu-translation-review-panel");
    summary.addEventListener("click", () => {
      const open = panel.hidden;
      panel.hidden = !open;
      summary.setAttribute("aria-expanded", open ? "true" : "false");
      render();
    });
    el.querySelector(".close").addEventListener("click", () => {
      panel.hidden = true;
      summary.setAttribute("aria-expanded", "false");
    });
    el.querySelector(".next").addEventListener("click", () => {
      if (!currentIssues.length) return;
      currentIndex = (currentIndex + 1) % currentIssues.length;
      render();
    });
  }

  wire();
  render();
  window.setInterval(render, 1200);
  window.addEventListener("popstate", render);
  window.addEventListener("hashchange", render);
}
