import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  LoaderCircle,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import {
  AI_DISH_REFERENCE_MAX_FILES,
  AI_DISH_REFERENCE_MIN_FILES,
  createDishReferenceCollage,
  createSingleImageReference,
  formatDishImageCost,
  generateDishImageWithAi,
  localizedDishText,
  validateDishReferenceFiles,
} from "../features/menu-engine/data/menuAiDishImageService";
import {
  readMenuStudioV2Draft,
  writeMenuStudioV2Draft,
} from "../features/menu-engine/studio/menuStudioV2Session";
import {
  readStudioLanguage,
  studioLanguageDirection,
  writeStudioLanguage,
} from "../features/menu-engine/studio/studioLanguage";
import "./MenuAiDishImagesV1.css";
import "./MenuAiDishImagesV1Guided.css";

const VIBES = [
  { id: "fresh", label: "Bright & fresh", text: "Bright natural daylight, fresh ingredients, clean modern plating, airy Mediterranean/cafe atmosphere, soft neutral table surface." },
  { id: "premium", label: "Premium editorial", text: "Refined restaurant editorial photography, controlled soft light, elegant styling, premium materials, shallow depth of field." },
  { id: "warm", label: "Cozy & warm", text: "Warm inviting restaurant light, natural wood and ceramic textures, authentic casual atmosphere, appetizing but not over-styled." },
  { id: "moody", label: "Dark moody bar", text: "Dark atmospheric bar photography, warm highlights, deeper shadows, realistic nightlife mood, premium but authentic bar environment." },
  { id: "modern", label: "Clean modern", text: "Clean contemporary restaurant photography, balanced neutral light, minimalist styling and believable atmosphere." },
];

const KNOWN_BRANDS = [
  "Guinness", "Heineken", "Carlsberg", "Tuborg", "Corona", "Budweiser", "Stella Artois",
  "Beck's", "Hoegaarden", "Coca-Cola", "Coca Cola", "Pepsi", "Sprite", "Fanta", "Red Bull", "Schweppes",
];

const CHANGE_OPTIONS = [
  { id: "accurate", label: "Make product more accurate", instruction: "Improve only the factual accuracy of the product/dish. Keep the current scene, background, lighting, camera angle and composition unchanged." },
  { id: "restaurant", label: "Match my restaurant better", instruction: "Adjust only details needed to better match the restaurant visual identity while preserving the current composition and product placement." },
  { id: "background", label: "Change background", instruction: "Change the background only. Preserve the product, its position, camera angle, scale and overall lighting relationship." },
  { id: "composition", label: "Change composition", instruction: "Create a different composition while keeping the same product identity, restaurant atmosphere and realistic presentation." },
];

const COPY = {
  en: {
    eyebrow: "AI ITEM PHOTO",
    title: "Create the right photo for this item",
    hint: "Work on one item at a time. Choose exactly what should change and Beyond protects everything else.",
    back: "Back to Content",
    currentItem: "Current item",
    search: "Search item",
    references: "Restaurant references",
    referenceHint: `For a brand-new image, upload ${AI_DISH_REFERENCE_MIN_FILES}–${AI_DISH_REFERENCE_MAX_FILES} real restaurant photos so Beyond learns the atmosphere. Refining a saved version does not require re-uploading them.`,
    choosePhotos: "Choose restaurant photos",
    vibe: "Restaurant vibe",
    vibeHint: "Used for a brand-new image. When refining an existing version, the current image is locked and preserved.",
    createFirst: "Create first version",
    generating: "Generating…",
    results: "Photo versions",
    resultsHint: "Every generated version stays saved. Returning to V1/V2/V3 is free.",
    history: "Saved versions",
    selected: "Selected",
    use: "Use this image",
    used: "Using this image",
    selectChange: "1 · Select what to change",
    selectChangeHint: "Choose only what needs fixing. Beyond locks the rest of the image.",
    brandDetected: "Brand detected",
    addBrand: "Add branding",
    clearerBrand: "Make branding clearer",
    exactLogo: "Upload exact logo",
    exactLogoHint: "Best choice when logo accuracy matters. PNG/JPG/WEBP up to 5 MB.",
    removeLogo: "Remove logo file",
    anythingElse: "3 · Anything else?",
    freeText: "Optional extra instruction",
    freePlaceholder: "Example: Move the Guinness logo slightly higher on the glass. Do not change anything else.",
    preflight: "4 · Before generating",
    changes: "Beyond will change",
    locks: "Beyond will keep locked",
    noChanges: "Choose at least one change or write an instruction.",
    lockedDefault: "Background · composition · camera angle · lighting · product position · restaurant atmosphere · everything not requested",
    generateRefined: "Generate refined version · 1 generation",
    generateNew: "Generate new version · 1 generation",
    costNotice: "Only generating a new version uses AI. Selecting an older saved version is free.",
    failed: "Generation failed",
    totalCost: "Session AI cost",
    noDraft: "Open an existing menu in Studio before using AI item photos.",
    projectMissing: "This menu must be saved as a Studio project before AI photos can run.",
    logoError: "Could not prepare this logo file.",
    done: "Return to Content",
  },
  he: {
    eyebrow: "תמונת פריט AI", title: "צרו את התמונה הנכונה לפריט הזה", hint: "עובדים על פריט אחד בכל פעם. בוחרים בדיוק מה לשנות ו-Beyond שומר על כל השאר.", back: "חזרה לתוכן",
    currentItem: "פריט נוכחי", search: "חיפוש פריט", references: "תמונות מסעדה", referenceHint: `לתמונה חדשה העלו ${AI_DISH_REFERENCE_MIN_FILES}–${AI_DISH_REFERENCE_MAX_FILES} תמונות אמיתיות של המסעדה. בשיפור גרסה שמורה אין צורך להעלות אותן שוב.`, choosePhotos: "בחירת תמונות מסעדה", vibe: "אווירת המסעדה", vibeHint: "משמשת לתמונה חדשה. בשיפור גרסה קיימת התמונה הנוכחית ננעלת ונשמרת.", createFirst: "יצירת גרסה ראשונה", generating: "יוצר…", results: "גרסאות תמונה", resultsHint: "כל גרסה נשמרת. חזרה לגרסה קודמת היא ללא עלות AI.", history: "גרסאות שמורות", selected: "נבחרה", use: "שימוש בתמונה", used: "בשימוש", selectChange: "1 · מה לשנות", selectChangeHint: "בחרו רק מה שדורש תיקון. Beyond נועל את כל השאר.", brandDetected: "מותג זוהה", addBrand: "הוספת מיתוג", clearerBrand: "הבלטת המיתוג", exactLogo: "העלאת לוגו מדויק", exactLogoHint: "מומלץ כשדיוק הלוגו חשוב.", removeLogo: "הסרת קובץ הלוגו", anythingElse: "3 · משהו נוסף?", freeText: "הנחיה נוספת אופציונלית", freePlaceholder: "לדוגמה: העלה מעט את לוגו Guinness על הכוס. אל תשנה שום דבר אחר.", preflight: "4 · לפני היצירה", changes: "Beyond ישנה", locks: "Beyond ישמור נעול", noChanges: "בחרו לפחות שינוי אחד או כתבו הנחיה.", lockedDefault: "רקע · קומפוזיציה · זווית מצלמה · תאורה · מיקום המוצר · אווירת המסעדה · כל מה שלא ביקשתם לשנות", generateRefined: "יצירת גרסה משופרת · יצירת AI אחת", generateNew: "יצירת גרסה חדשה · יצירת AI אחת", costNotice: "רק יצירת גרסה חדשה משתמשת ב-AI. בחירת גרסה שמורה קודמת היא חינמית.", failed: "היצירה נכשלה", totalCost: "עלות AI בסשן", noDraft: "פתחו תפריט קיים ב-Studio.", projectMissing: "יש לשמור את התפריט כפרויקט Studio.", logoError: "לא ניתן להכין את קובץ הלוגו.", done: "חזרה לתוכן",
  },
  ar: {
    eyebrow: "صورة عنصر AI", title: "أنشئ الصورة المناسبة لهذا العنصر", hint: "اعمل على عنصر واحد كل مرة. اختر فقط ما تريد تغييره وسيحافظ Beyond على الباقي.", back: "العودة إلى المحتوى",
    currentItem: "العنصر الحالي", search: "بحث عن عنصر", references: "صور المطعم المرجعية", referenceHint: `للصورة الجديدة ارفع ${AI_DISH_REFERENCE_MIN_FILES}–${AI_DISH_REFERENCE_MAX_FILES} صور حقيقية للمطعم. تعديل نسخة محفوظة لا يحتاج إعادة رفعها.`, choosePhotos: "اختيار صور المطعم", vibe: "أجواء المطعم", vibeHint: "تستخدم للصورة الجديدة. عند تعديل نسخة موجودة يتم تثبيت الصورة الحالية.", createFirst: "إنشاء النسخة الأولى", generating: "جارٍ الإنشاء…", results: "نسخ الصورة", resultsHint: "كل نسخة تبقى محفوظة والعودة إلى نسخة سابقة مجانية.", history: "النسخ المحفوظة", selected: "مختارة", use: "استخدام هذه الصورة", used: "قيد الاستخدام", selectChange: "1 · اختر ما تريد تغييره", selectChangeHint: "اختر فقط ما يحتاج إلى تعديل وسيتم تثبيت كل شيء آخر.", brandDetected: "تم اكتشاف العلامة", addBrand: "إضافة العلامة", clearerBrand: "إظهار العلامة أكثر", exactLogo: "رفع الشعار الدقيق", exactLogoHint: "الأفضل عندما تكون دقة الشعار مهمة.", removeLogo: "إزالة ملف الشعار", anythingElse: "3 · شيء آخر؟", freeText: "تعليمات إضافية اختيارية", freePlaceholder: "مثال: ارفع شعار Guinness قليلاً على الكأس ولا تغيّر أي شيء آخر.", preflight: "4 · قبل الإنشاء", changes: "سيغيّر Beyond", locks: "سيحافظ Beyond على", noChanges: "اختر تغييراً واحداً على الأقل أو اكتب تعليمات.", lockedDefault: "الخلفية · التكوين · زاوية الكاميرا · الإضاءة · موضع المنتج · أجواء المطعم · كل ما لم تطلب تغييره", generateRefined: "إنشاء نسخة معدلة · عملية AI واحدة", generateNew: "إنشاء نسخة جديدة · عملية AI واحدة", costNotice: "إنشاء نسخة جديدة فقط يستخدم AI. اختيار نسخة محفوظة سابقة مجاني.", failed: "فشل الإنشاء", totalCost: "تكلفة AI للجلسة", noDraft: "افتح قائمة موجودة في Studio.", projectMissing: "يجب حفظ القائمة كمشروع Studio.", logoError: "تعذر تجهيز ملف الشعار.", done: "العودة إلى المحتوى",
  },
};

function projectIdFor(draft) {
  const query = new URLSearchParams(window.location.search).get("project") || "";
  return query || draft?.importProject?.id || draft?.profile?.importedProjectId || draft?.menu?.source_project_id || "";
}
function itemLabel(item, language) { return localizedDishText(item?.name, language) || localizedDishText(item?.name, "en") || "Unnamed item"; }
function descriptionLabel(item, language) { return localizedDishText(item?.description, language) || localizedDishText(item?.description, "en"); }
function historyFor(item) { return Array.isArray(item?.image_ai_history) ? item.image_ai_history.filter((entry) => entry?.imageUrl && entry?.imagePath) : []; }
function detectBrand(item) {
  const text = `${itemLabel(item, "en")} ${itemLabel(item, "he")} ${itemLabel(item, "ar")}`.toLowerCase();
  return KNOWN_BRANDS.find((brand) => text.includes(brand.toLowerCase())) || "";
}
function resultFromItem(item) {
  const versions = historyFor(item);
  if (!versions.length) return null;
  let activeIndex = versions.findIndex((version) => version.imagePath === item.image_path);
  if (activeIndex < 0) activeIndex = versions.length - 1;
  const active = versions[activeIndex];
  return { status: "ready", ...active, versions, activeVersion: activeIndex, approved: active.imagePath === item.image_path };
}
function resultsFromDraft(draft) {
  const next = {};
  for (const item of draft?.menu?.items || []) {
    const result = resultFromItem(item);
    if (result) next[item.id] = result;
  }
  return next;
}

export default function MenuAiDishImagesV1() {
  const initialDraft = useMemo(() => readMenuStudioV2Draft(), []);
  const [draft, setDraft] = useState(initialDraft);
  const [uiLanguage, setUiLanguage] = useState(() => readStudioLanguage(initialDraft?.contentLanguage || "en"));
  const [itemId, setItemId] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("item") || "";
    return requested || initialDraft?.menu?.items?.find((item) => item.visible !== false)?.id || "";
  });
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState([]);
  const [reference, setReference] = useState(null);
  const [vibeId, setVibeId] = useState("moody");
  const [results, setResults] = useState(() => resultsFromDraft(initialDraft));
  const [changes, setChanges] = useState([]);
  const [brandMode, setBrandMode] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [freeText, setFreeText] = useState("");
  const [running, setRunning] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [sessionCost, setSessionCost] = useState(0);
  const [error, setError] = useState("");

  const t = COPY[uiLanguage] || COPY.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const menu = draft?.menu;
  const projectId = projectIdFor(draft);
  const currentItem = menu?.items?.find((item) => item.id === itemId) || null;
  const currentResult = currentItem ? results[currentItem.id] || resultFromItem(currentItem) : null;
  const brandName = currentItem ? detectBrand(currentItem) : "";
  const vibe = VIBES.find((entry) => entry.id === vibeId)?.text || VIBES[0].text;
  const groupsById = useMemo(() => new Map((menu?.groups || []).map((group) => [group.id, group])), [menu?.groups]);
  const itemRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (menu?.items || []).filter((item) => item.visible !== false).filter((item) => {
      const group = groupsById.get(item.group_id);
      const haystack = `${itemLabel(item, uiLanguage)} ${localizedDishText(group?.name, uiLanguage)}`.toLowerCase();
      return !needle || haystack.includes(needle);
    });
  }, [menu?.items, groupsById, query, uiLanguage]);

  const filePreviews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => filePreviews.forEach(({ url }) => URL.revokeObjectURL(url)), [filePreviews]);
  const logoPreview = useMemo(() => logoFile ? URL.createObjectURL(logoFile) : "", [logoFile]);
  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  function goBack() { window.location.assign(`/menu-studio/content${window.location.search || ""}`); }
  function changeLanguage(language) { setUiLanguage(language); writeStudioLanguage(language); }
  function chooseItem(nextId) {
    setItemId(nextId);
    setChanges([]);
    setBrandMode("");
    setLogoFile(null);
    setFreeText("");
    setError("");
    const params = new URLSearchParams(window.location.search || "");
    params.set("item", nextId);
    history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }
  function chooseFiles(event) {
    const selected = Array.from(event.target.files || []).slice(0, AI_DISH_REFERENCE_MAX_FILES);
    event.target.value = "";
    if (!selected.length) return;
    const validation = validateDishReferenceFiles(selected);
    if (validation) return setError(validation);
    setFiles(selected);
    setReference(null);
    setError("");
  }
  function removeFile(index) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setReference(null);
  }
  function toggleChange(id) {
    setChanges((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }
  async function ensureReference() {
    if (reference) return reference;
    const validation = validateDishReferenceFiles(files);
    if (validation) throw new Error(validation);
    setPreparing(true);
    try {
      const next = await createDishReferenceCollage(files);
      setReference(next);
      return next;
    } finally {
      setPreparing(false);
    }
  }
  function payloadFor(item) {
    const group = groupsById.get(item.group_id);
    return {
      id: item.id,
      name: itemLabel(item, uiLanguage),
      description: descriptionLabel(item, uiLanguage),
      category: localizedDishText(group?.name, uiLanguage) || localizedDishText(group?.name, "en"),
    };
  }
  function persistVersion(itemIdToUpdate, version) {
    setDraft((current) => {
      if (!current?.menu) return current;
      const nextDraft = {
        ...current,
        menu: {
          ...current.menu,
          items: current.menu.items.map((item) => item.id === itemIdToUpdate ? { ...item, image_ai_history: [...historyFor(item), version] } : item),
        },
      };
      writeMenuStudioV2Draft(nextDraft);
      return nextDraft;
    });
  }
  function changeSummary() {
    const selected = CHANGE_OPTIONS.filter((option) => changes.includes(option.id)).map((option) => option.label);
    if (brandMode === "add" && brandName) selected.push(`Add ${brandName} branding`);
    if (brandMode === "clearer" && brandName) selected.push(`Make ${brandName} branding clearer`);
    if (brandMode === "exact_logo" && brandName) selected.push(`Use uploaded ${brandName} logo`);
    if (freeText.trim()) selected.push(freeText.trim());
    return selected;
  }
  function adjustmentText() {
    const instructions = CHANGE_OPTIONS.filter((option) => changes.includes(option.id)).map((option) => option.instruction);
    if (freeText.trim()) instructions.push(`Customer instruction: ${freeText.trim()}`);
    return instructions.join("\n");
  }
  async function generate({ refine = false } = {}) {
    if (!currentItem || running || preparing) return;
    if (!projectId) return setError(t.projectMissing);
    const summary = changeSummary();
    if (refine && !summary.length) return setError(t.noChanges);
    setRunning(true);
    setError("");
    try {
      let preparedReference = reference;
      if (!refine) preparedReference = await ensureReference();
      let brandReference = null;
      if (brandMode === "exact_logo" && logoFile) brandReference = await createSingleImageReference(logoFile);
      const generated = await generateDishImageWithAi({
        projectId,
        restaurantName: menu?.restaurant_name || "",
        vibe,
        item: payloadFor(currentItem),
        reference: preparedReference,
        editReferencePath: refine ? currentResult?.imagePath || "" : "",
        adjustment: refine ? adjustmentText() : "",
        brandName,
        brandMode,
        brandReference,
      });
      setSessionCost((current) => current + Number(generated?.cost?.estimated_cost_usd || 0));
      const version = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${currentItem.id}-${Date.now()}`,
        imageUrl: generated.imageUrl,
        imagePath: generated.imagePath,
        model: generated.model || "gpt-image-2",
        styleLocked: Boolean(generated.styleLocked),
        editLocked: Boolean(generated.editLocked),
        cost: generated.cost || null,
        adjustment: refine ? adjustmentText() : "",
        changeSummary: summary,
        createdAt: new Date().toISOString(),
      };
      const existingVersions = currentResult?.versions || historyFor(currentItem);
      const versions = [...existingVersions, version];
      persistVersion(currentItem.id, version);
      setResults((current) => ({ ...current, [currentItem.id]: { status: "ready", ...version, versions, activeVersion: versions.length - 1, approved: false } }));
      setChanges([]);
      setBrandMode("");
      setLogoFile(null);
      setFreeText("");
    } catch (generationError) {
      setError(generationError?.message || t.failed);
    } finally {
      setRunning(false);
    }
  }
  function selectVersion(index) {
    if (!currentItem) return;
    setResults((current) => {
      const result = current[currentItem.id] || resultFromItem(currentItem);
      const version = result?.versions?.[index];
      if (!version) return current;
      return { ...current, [currentItem.id]: { ...result, ...version, status: "ready", activeVersion: index, approved: version.imagePath === currentItem.image_path } };
    });
  }
  function approve() {
    if (!currentItem || !currentResult?.imageUrl || !draft?.menu) return;
    const nextDraft = {
      ...draft,
      menu: {
        ...draft.menu,
        items: draft.menu.items.map((item) => item.id === currentItem.id ? {
          ...item,
          image_url: currentResult.imageUrl,
          image_path: currentResult.imagePath,
          image_ai_generated: true,
          image_ai_model: currentResult.model || "gpt-image-2",
          image_ai_vibe: vibeId,
          image_ai_generated_at: new Date().toISOString(),
          image_ai_selected_version: currentResult.id || "",
        } : item),
      },
    };
    writeMenuStudioV2Draft(nextDraft);
    setDraft(nextDraft);
    setResults((current) => ({ ...current, [currentItem.id]: { ...current[currentItem.id], approved: true } }));
  }

  if (!draft?.menu) return <main className="ai-dish-v1 ai-dish-v1-empty" dir={rtl ? "rtl" : "ltr"}><div><ImagePlus size={28} /><h1>{t.noDraft}</h1><button type="button" onClick={goBack}>{t.back}</button></div></main>;

  const versions = currentResult?.versions || historyFor(currentItem);
  const summary = changeSummary();
  const canRefine = Boolean(currentResult?.imagePath && summary.length && !running && !preparing);
  const canCreateFirst = Boolean(currentItem && files.length >= AI_DISH_REFERENCE_MIN_FILES && !currentResult && projectId && !running && !preparing);

  return (
    <main className="ai-dish-v1 ai-dish-guided" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <header className="ai-dish-v1-topbar">
        <button type="button" className="ai-dish-v1-back" onClick={goBack}><BackIcon size={16} /> {t.back}</button>
        <div className="ai-dish-v1-brand"><img src={beyondLogo} alt="" /><span><strong>BEYOND</strong><small>AI Item Photo</small></span></div>
        <StudioLanguageMenu value={uiLanguage} onChange={changeLanguage} compact />
      </header>

      <div className="ai-dish-v1-shell">
        <section className="ai-dish-v1-hero"><span><Sparkles size={14} /> {t.eyebrow}</span><h1>{t.title}</h1><p>{t.hint}</p></section>

        <div className="ai-dish-guided-grid">
          <div className="ai-dish-guided-controls">
            <section className="ai-dish-v1-card ai-dish-single-item-card">
              <header><div><strong>{t.currentItem}</strong><p>{currentItem ? localizedDishText(groupsById.get(currentItem.group_id)?.name, uiLanguage) : ""}</p></div></header>
              <label className="ai-dish-v1-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label>
              <div className="ai-dish-single-item-list">{itemRows.map((item) => <button type="button" key={item.id} className={item.id === itemId ? "selected" : ""} onClick={() => chooseItem(item.id)}>{item.image_url ? <img src={item.image_url} alt="" /> : <span className="thumb"><ImagePlus size={14} /></span>}<span><strong>{itemLabel(item, uiLanguage)}</strong><small>{localizedDishText(groupsById.get(item.group_id)?.name, uiLanguage)}</small></span>{item.id === itemId ? <Check size={14} /> : null}</button>)}</div>
            </section>

            {!currentResult ? <>
              <section className="ai-dish-v1-card">
                <header><div><strong>{t.references}</strong><p>{t.referenceHint}</p></div><b>{files.length}/{AI_DISH_REFERENCE_MAX_FILES}</b></header>
                <label className="ai-dish-v1-upload"><Upload size={20} /><strong>{t.choosePhotos}</strong><small>JPG · PNG · WEBP</small><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={chooseFiles} /></label>
                {filePreviews.length ? <div className="ai-dish-v1-reference-grid">{filePreviews.map(({ file, url }, index) => <figure key={`${file.name}-${index}`}><img src={url} alt="" /><button type="button" onClick={() => removeFile(index)}><X size={13} /></button></figure>)}</div> : null}
              </section>
              <section className="ai-dish-v1-card">
                <header><div><strong>{t.vibe}</strong><p>{t.vibeHint}</p></div></header>
                <div className="ai-dish-v1-vibes">{VIBES.map((entry) => <button type="button" key={entry.id} className={vibeId === entry.id ? "active" : ""} onClick={() => setVibeId(entry.id)}>{vibeId === entry.id ? <Check size={13} /> : null}<span>{entry.label}</span></button>)}</div>
              </section>
              <button type="button" className="ai-dish-v1-generate" disabled={!canCreateFirst} onClick={() => generate({ refine: false })}>{running || preparing ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}{running || preparing ? t.generating : t.createFirst}</button>
            </> : <>
              <section className="ai-dish-v1-card ai-dish-change-card">
                <header><div><strong>{t.selectChange}</strong><p>{t.selectChangeHint}</p></div></header>
                <div className="ai-dish-smart-chips">{CHANGE_OPTIONS.map((option) => <button type="button" key={option.id} className={changes.includes(option.id) ? "active" : ""} onClick={() => toggleChange(option.id)}>{changes.includes(option.id) ? <Check size={13} /> : null}{option.label}</button>)}</div>
              </section>

              {brandName ? <section className="ai-dish-v1-card ai-dish-brand-card">
                <header><div><strong>2 · {t.brandDetected}: {brandName}</strong><p>{t.exactLogoHint}</p></div></header>
                <div className="ai-dish-brand-options">
                  <button type="button" className={brandMode === "add" ? "active" : ""} onClick={() => setBrandMode((current) => current === "add" ? "" : "add")}>{brandMode === "add" ? <Check size={13} /> : null}{t.addBrand}</button>
                  <button type="button" className={brandMode === "clearer" ? "active" : ""} onClick={() => setBrandMode((current) => current === "clearer" ? "" : "clearer")}>{brandMode === "clearer" ? <Check size={13} /> : null}{t.clearerBrand}</button>
                  <label className={brandMode === "exact_logo" ? "active upload" : "upload"}><Upload size={13} />{t.exactLogo}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] || null; setLogoFile(file); setBrandMode(file ? "exact_logo" : ""); event.target.value = ""; }} /></label>
                </div>
                {logoFile ? <div className="ai-dish-logo-preview"><img src={logoPreview} alt="" /><div><strong>{logoFile.name}</strong><small>{brandName}</small></div><button type="button" onClick={() => { setLogoFile(null); setBrandMode(""); }}><X size={13} /> {t.removeLogo}</button></div> : null}
              </section> : null}

              <section className="ai-dish-v1-card ai-dish-free-card">
                <header><div><strong>{t.anythingElse}</strong><p>{t.freeText}</p></div></header>
                <textarea value={freeText} onChange={(event) => setFreeText(event.target.value)} placeholder={t.freePlaceholder} />
              </section>

              <section className="ai-dish-v1-card ai-dish-preflight">
                <header><div><strong>{t.preflight}</strong><p>{t.costNotice}</p></div></header>
                <div className="ai-dish-preflight-row"><span>{t.changes}</span>{summary.length ? <ul>{summary.map((entry, index) => <li key={`${entry}-${index}`}>{entry}</li>)}</ul> : <em>{t.noChanges}</em>}</div>
                <div className="ai-dish-preflight-row locked"><span>{t.locks}</span><p>{t.lockedDefault}</p></div>
                <button type="button" className="ai-dish-guided-generate" disabled={!canRefine} onClick={() => generate({ refine: true })}>{running || preparing ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}{running || preparing ? t.generating : t.generateRefined}</button>
              </section>
            </>}

            {error ? <div className="ai-dish-v1-error">{error}</div> : null}
            {!projectId ? <div className="ai-dish-v1-error">{t.projectMissing}</div> : null}
          </div>

          <aside className="ai-dish-v1-results ai-dish-guided-results">
            <section className="ai-dish-v1-results-head"><div><span>{t.results}</span><p>{t.resultsHint}</p></div>{sessionCost > 0 ? <b>{t.totalCost}: {formatDishImageCost(sessionCost)}</b> : null}</section>
            <article className={`ai-dish-v1-result ${currentResult?.approved ? "approved" : ""}`}>
              <header><div><strong>{currentItem ? itemLabel(currentItem, uiLanguage) : ""}</strong><small>{currentItem ? localizedDishText(groupsById.get(currentItem.group_id)?.name, uiLanguage) : ""}</small></div>{currentResult?.approved ? <span><Check size={12} /> {t.used}</span> : null}</header>
              <div className="ai-dish-v1-result-image">{running ? <div className="loading"><LoaderCircle className="spin" size={26} /><span>{t.generating}</span></div> : currentResult?.imageUrl ? <img src={currentResult.imageUrl} alt="" /> : currentItem?.image_url ? <img src={currentItem.image_url} alt="" /> : <div className="empty"><ImagePlus size={24} /><span>AI preview</span></div>}</div>
              {currentResult?.imageUrl ? <div className="ai-dish-v1-result-meta"><span>AI cost</span><strong>{formatDishImageCost(currentResult?.cost?.estimated_cost_usd)}</strong></div> : null}

              {versions.length ? <section className="ai-dish-v1-history"><div className="ai-dish-v1-history-head"><strong>{t.history}</strong><small>{t.resultsHint}</small></div><div className="ai-dish-v1-history-strip">{versions.map((version, index) => <button type="button" key={version.id || version.imagePath} className={currentResult?.imagePath === version.imagePath ? "active" : ""} onClick={() => selectVersion(index)}><img src={version.imageUrl} alt="" /><span>V{index + 1}</span>{currentItem?.image_path === version.imagePath ? <em><Check size={10} /> {t.selected}</em> : null}</button>)}</div></section> : null}

              {currentResult?.imageUrl ? <div className="ai-dish-v1-result-actions"><button type="button" className="primary" disabled={currentResult.approved} onClick={approve}><Check size={14} /> {currentResult.approved ? t.used : t.use}</button></div> : null}
            </article>
            <div className="ai-dish-guided-principle"><Sparkles size={15} /><p><strong>Choose what to change.</strong> Beyond protects everything else.</p></div>
            {currentResult?.approved ? <button type="button" className="ai-dish-v1-done" onClick={goBack}>{t.done} <ArrowRight size={15} /></button> : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
