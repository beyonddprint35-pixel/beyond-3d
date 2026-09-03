import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import { removeMenuItemImage } from "../features/menu-engine/data/menuItemImageService";
import {
  AI_DISH_MAX_ITEMS,
  AI_DISH_MIN_ITEMS,
  AI_DISH_REFERENCE_MAX_FILES,
  AI_DISH_REFERENCE_MIN_FILES,
  createDishReferenceCollage,
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

const VIBES = [
  { id: "fresh", label: "Bright & fresh", text: "Bright natural daylight, fresh ingredients, clean modern plating, airy Mediterranean/cafe atmosphere, soft neutral table surface." },
  { id: "premium", label: "Premium editorial", text: "Refined restaurant editorial photography, controlled soft light, elegant plating, restrained styling, premium materials, shallow depth of field." },
  { id: "warm", label: "Cozy & warm", text: "Warm inviting restaurant light, natural wood and ceramic textures, comforting plating, authentic casual atmosphere, appetizing but not over-styled." },
  { id: "rustic", label: "Rustic authentic", text: "Authentic rustic food photography, tactile natural surfaces, honest portions, handmade plating, warm daylight, minimal styling." },
  { id: "moody", label: "Dark moody bar", text: "Dark atmospheric bar/restaurant photography, directional warm highlights, deeper shadows, dramatic but realistic food lighting, premium nightlife mood." },
  { id: "modern", label: "Clean modern", text: "Clean contemporary restaurant photography, balanced neutral light, minimalist plating, subtle architectural background, polished but believable." },
];

const COPY = {
  en: {
    eyebrow: "AI DISH PHOTOS · TEST",
    title: "Teach BEYOND your restaurant look",
    hint: "Upload a few real dishes, choose your vibe, then generate matching photos for 2–3 menu items. Your reference photos are used only to guide this generation test.",
    back: "Back to Content",
    references: "1 · Reference dishes",
    referenceHint: `Upload ${AI_DISH_REFERENCE_MIN_FILES}–${AI_DISH_REFERENCE_MAX_FILES} real photos from this restaurant. Different dishes and table settings help AI learn the visual language.`,
    choosePhotos: "Choose reference photos",
    vibe: "2 · Restaurant vibe",
    vibeHint: "This guides lighting and mood. The real uploaded dishes remain the strongest visual reference.",
    custom: "Optional extra direction",
    customPlaceholder: "Example: white ceramic plates, pale stone table, natural window light…",
    items: "3 · Choose 2–3 items",
    itemHint: "For this first test, pick visually clear dishes. You can regenerate one item without paying to redo the others.",
    search: "Search menu items",
    selected: "selected",
    max: "Maximum 3 items",
    generate: "Generate test images",
    preparing: "Preparing references…",
    generating: "Generating",
    results: "AI results",
    resultsHint: "Approve only images that are representative of what guests will actually receive.",
    use: "Use this image",
    used: "Using this image",
    regenerate: "Regenerate",
    failed: "Generation failed",
    cost: "AI cost",
    totalCost: "Test generation cost",
    noDraft: "Open an existing menu in Studio before using AI dish photos.",
    projectMissing: "This menu must be saved as a Studio project before the image test can run.",
    accuracy: "AI images are visual representations. The restaurant owner should verify ingredients, portion and plating before publishing.",
    done: "Return to Content",
  },
  he: {
    eyebrow: "תמונות מנות AI · בדיקה",
    title: "למדו את BEYOND איך המסעדה שלכם נראית",
    hint: "העלו כמה תמונות אמיתיות של מנות, בחרו אווירה ואז צרו תמונות תואמות עבור 2–3 פריטים בתפריט.",
    back: "חזרה לתוכן",
    references: "1 · תמונות מקור",
    referenceHint: `העלו ${AI_DISH_REFERENCE_MIN_FILES}–${AI_DISH_REFERENCE_MAX_FILES} תמונות אמיתיות מהמסעדה.`,
    choosePhotos: "בחירת תמונות מקור",
    vibe: "2 · אווירת המסעדה",
    vibeHint: "האווירה מנחה את התאורה והסגנון; התמונות האמיתיות הן ההפניה המרכזית.",
    custom: "הנחיה נוספת אופציונלית",
    customPlaceholder: "לדוגמה: צלחות קרמיקה לבנות, שולחן אבן, אור טבעי…",
    items: "3 · בחרו 2–3 פריטים",
    itemHint: "לבדיקה הראשונה בחרו מנות שקל לזהות ויזואלית.",
    search: "חיפוש פריטים",
    selected: "נבחרו",
    max: "עד 3 פריטים",
    generate: "יצירת תמונות בדיקה",
    preparing: "מכין תמונות מקור…",
    generating: "יוצר",
    results: "תוצאות AI",
    resultsHint: "אשרו רק תמונות שמייצגות באופן סביר את המנה שהלקוח יקבל.",
    use: "שימוש בתמונה",
    used: "התמונה נבחרה",
    regenerate: "יצירה מחדש",
    failed: "היצירה נכשלה",
    cost: "עלות AI",
    totalCost: "עלות יצירת הבדיקה",
    noDraft: "פתחו תפריט קיים ב-Studio לפני שימוש בתמונות AI.",
    projectMissing: "צריך לשמור את התפריט כפרויקט Studio לפני יצירת תמונות AI.",
    accuracy: "תמונות AI הן המחשה. יש לוודא מרכיבים, גודל מנה והגשה לפני פרסום.",
    done: "חזרה לתוכן",
  },
  ar: {
    eyebrow: "صور أطباق AI · اختبار",
    title: "علّموا BEYOND شكل مطعمكم",
    hint: "ارفعوا بعض الصور الحقيقية للأطباق، اختاروا الأجواء، ثم أنشئوا صوراً متناسقة لـ 2–3 أصناف.",
    back: "العودة إلى المحتوى",
    references: "1 · صور مرجعية",
    referenceHint: `ارفعوا ${AI_DISH_REFERENCE_MIN_FILES}–${AI_DISH_REFERENCE_MAX_FILES} صور حقيقية من المطعم.`,
    choosePhotos: "اختيار صور مرجعية",
    vibe: "2 · أجواء المطعم",
    vibeHint: "الأجواء توجه الإضاءة والمزاج، بينما تبقى الصور الحقيقية المرجع الأساسي.",
    custom: "توجيه إضافي اختياري",
    customPlaceholder: "مثال: أطباق خزفية بيضاء، طاولة حجرية، إضاءة نافذة طبيعية…",
    items: "3 · اختاروا 2–3 أصناف",
    itemHint: "للاختبار الأول اختاروا أطباقاً واضحة بصرياً.",
    search: "البحث في الأصناف",
    selected: "مختارة",
    max: "الحد الأقصى 3 أصناف",
    generate: "إنشاء صور الاختبار",
    preparing: "جارٍ تجهيز الصور المرجعية…",
    generating: "جارٍ إنشاء",
    results: "نتائج AI",
    resultsHint: "اعتمدوا فقط الصور التي تمثل بشكل معقول ما سيحصل عليه الزبون.",
    use: "استخدام هذه الصورة",
    used: "تم اختيار الصورة",
    regenerate: "إعادة الإنشاء",
    failed: "فشل الإنشاء",
    cost: "تكلفة AI",
    totalCost: "تكلفة إنشاء الاختبار",
    noDraft: "افتحوا قائمة موجودة في Studio قبل استخدام صور AI.",
    projectMissing: "يجب حفظ القائمة كمشروع Studio قبل اختبار صور AI.",
    accuracy: "صور AI تمثيلية. يجب على صاحب المطعم التحقق من المكونات والحصة والتقديم قبل النشر.",
    done: "العودة إلى المحتوى",
  },
};

function projectIdFor(draft) {
  const query = new URLSearchParams(window.location.search).get("project") || "";
  return query
    || draft?.importProject?.id
    || draft?.profile?.importedProjectId
    || draft?.menu?.source_project_id
    || "";
}

function itemLabel(item, language) {
  return localizedDishText(item?.name, language) || localizedDishText(item?.name, "en") || "Unnamed item";
}

function descriptionLabel(item, language) {
  return localizedDishText(item?.description, language) || localizedDishText(item?.description, "en");
}

export default function MenuAiDishImagesV1() {
  const initialDraft = useMemo(() => readMenuStudioV2Draft(), []);
  const [draft, setDraft] = useState(initialDraft);
  const [uiLanguage, setUiLanguage] = useState(() => readStudioLanguage(initialDraft?.contentLanguage || "en"));
  const [files, setFiles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [vibeId, setVibeId] = useState("fresh");
  const [customVibe, setCustomVibe] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({});
  const [reference, setReference] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const t = COPY[uiLanguage] || COPY.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const menu = draft?.menu;
  const projectId = projectIdFor(draft);
  const vibe = `${VIBES.find((entry) => entry.id === vibeId)?.text || VIBES[0].text}${customVibe.trim() ? ` Additional restaurant direction: ${customVibe.trim()}` : ""}`;

  const groupsById = useMemo(() => new Map((menu?.groups || []).map((group) => [group.id, group])), [menu?.groups]);
  const itemRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (menu?.items || [])
      .filter((item) => item.visible !== false)
      .map((item) => {
        const group = groupsById.get(item.group_id);
        const name = itemLabel(item, uiLanguage);
        const category = localizedDishText(group?.name, uiLanguage) || localizedDishText(group?.name, "en");
        return { item, name, category };
      })
      .filter(({ name, category }) => !needle || `${name} ${category}`.toLowerCase().includes(needle));
  }, [menu?.items, groupsById, query, uiLanguage]);

  const filePreviews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => filePreviews.forEach(({ url }) => URL.revokeObjectURL(url)), [filePreviews]);

  function goBack() {
    window.location.assign(`/menu-studio/content${window.location.search || ""}`);
  }

  function changeLanguage(language) {
    setUiLanguage(language);
    writeStudioLanguage(language);
  }

  function chooseFiles(event) {
    const selected = Array.from(event.target.files || []).slice(0, AI_DISH_REFERENCE_MAX_FILES);
    event.target.value = "";
    if (!selected.length) return;
    const validation = validateDishReferenceFiles(selected);
    if (validation) {
      setError(validation);
      return;
    }
    setFiles(selected);
    setReference(null);
    setResults({});
    setError("");
  }

  function removeFile(index) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setReference(null);
    setResults({});
  }

  function toggleItem(itemId) {
    setSelectedIds((current) => {
      if (current.includes(itemId)) return current.filter((id) => id !== itemId);
      if (current.length >= AI_DISH_MAX_ITEMS) return current;
      return [...current, itemId];
    });
    setResults({});
  }

  async function ensureReference() {
    if (reference) return reference;
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

  async function generateOne(item, forceReference = null) {
    const preparedReference = forceReference || await ensureReference();
    setResults((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), status: "generating", error: "" } }));
    try {
      const result = await generateDishImageWithAi({
        projectId,
        restaurantName: menu?.restaurant_name || "",
        vibe,
        item: payloadFor(item),
        reference: preparedReference,
      });
      setResults((current) => ({ ...current, [item.id]: { status: "ready", ...result, approved: false } }));
      return result;
    } catch (generationError) {
      setResults((current) => ({ ...current, [item.id]: { status: "error", error: generationError?.message || t.failed } }));
      return null;
    }
  }

  async function generateSelected() {
    setError("");
    const validation = validateDishReferenceFiles(files);
    if (validation) {
      setError(validation);
      return;
    }
    if (selectedIds.length < AI_DISH_MIN_ITEMS || selectedIds.length > AI_DISH_MAX_ITEMS) {
      setError(`Choose ${AI_DISH_MIN_ITEMS}–${AI_DISH_MAX_ITEMS} menu items for this test.`);
      return;
    }
    if (!projectId) {
      setError(t.projectMissing);
      return;
    }
    setRunning(true);
    try {
      const preparedReference = await ensureReference();
      for (const itemId of selectedIds) {
        const item = menu.items.find((entry) => entry.id === itemId);
        if (item) await generateOne(item, preparedReference);
      }
    } catch (generationError) {
      setError(generationError?.message || "Could not prepare the test images.");
    } finally {
      setRunning(false);
    }
  }

  async function regenerate(item) {
    const previous = results[item.id];
    if (previous?.imagePath && !previous?.approved) {
      await removeMenuItemImage(previous.imagePath).catch(() => {});
    }
    await generateOne(item);
  }

  function approve(itemId) {
    const candidate = results[itemId];
    if (!candidate?.imageUrl || !draft?.menu) return;
    const nextDraft = {
      ...draft,
      menu: {
        ...draft.menu,
        items: draft.menu.items.map((item) => item.id === itemId ? {
          ...item,
          image_url: candidate.imageUrl,
          image_path: candidate.imagePath,
          image_ai_generated: true,
          image_ai_model: candidate.model || "gpt-image-2",
          image_ai_vibe: vibeId,
          image_ai_generated_at: new Date().toISOString(),
        } : item),
      },
    };
    writeMenuStudioV2Draft(nextDraft);
    setDraft(nextDraft);
    setResults((current) => ({ ...current, [itemId]: { ...current[itemId], approved: true } }));
  }

  const totalCost = Object.values(results).reduce((sum, result) => sum + Number(result?.cost?.estimated_cost_usd || 0), 0);
  const readyCount = Object.values(results).filter((result) => result?.status === "ready").length;
  const approvedCount = Object.values(results).filter((result) => result?.approved).length;

  if (!draft?.menu) {
    return (
      <main className="ai-dish-v1 ai-dish-v1-empty" dir={rtl ? "rtl" : "ltr"}>
        <div><ImagePlus size={28} /><h1>{t.noDraft}</h1><button type="button" onClick={goBack}>{t.back}</button></div>
      </main>
    );
  }

  return (
    <main className="ai-dish-v1" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <header className="ai-dish-v1-topbar">
        <button type="button" className="ai-dish-v1-back" onClick={goBack}><BackIcon size={16} /> {t.back}</button>
        <div className="ai-dish-v1-brand"><img src={beyondLogo} alt="" /><span><strong>BEYOND</strong><small>AI Dish Photos</small></span></div>
        <StudioLanguageMenu value={uiLanguage} onChange={changeLanguage} compact />
      </header>

      <div className="ai-dish-v1-shell">
        <section className="ai-dish-v1-hero">
          <span><Sparkles size={14} /> {t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.hint}</p>
        </section>

        <div className="ai-dish-v1-grid">
          <div className="ai-dish-v1-setup">
            <section className="ai-dish-v1-card">
              <header><div><strong>{t.references}</strong><p>{t.referenceHint}</p></div><b>{files.length}/{AI_DISH_REFERENCE_MAX_FILES}</b></header>
              <label className="ai-dish-v1-upload"><Upload size={20} /><strong>{t.choosePhotos}</strong><small>JPG · PNG · WEBP</small><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={chooseFiles} /></label>
              {filePreviews.length ? <div className="ai-dish-v1-reference-grid">{filePreviews.map(({ file, url }, index) => (
                <figure key={`${file.name}-${index}`}><img src={url} alt="" /><button type="button" onClick={() => removeFile(index)}><X size={13} /></button></figure>
              ))}</div> : null}
            </section>

            <section className="ai-dish-v1-card">
              <header><div><strong>{t.vibe}</strong><p>{t.vibeHint}</p></div></header>
              <div className="ai-dish-v1-vibes">{VIBES.map((entry) => <button type="button" key={entry.id} className={vibeId === entry.id ? "active" : ""} onClick={() => { setVibeId(entry.id); setResults({}); }}>{vibeId === entry.id ? <Check size={13} /> : null}<span>{entry.label}</span></button>)}</div>
              <label className="ai-dish-v1-custom"><span>{t.custom}</span><textarea value={customVibe} onChange={(event) => { setCustomVibe(event.target.value); setResults({}); }} placeholder={t.customPlaceholder} /></label>
            </section>

            <section className="ai-dish-v1-card ai-dish-v1-items-card">
              <header><div><strong>{t.items}</strong><p>{t.itemHint}</p></div><b>{selectedIds.length} {t.selected}</b></header>
              <label className="ai-dish-v1-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label>
              <div className="ai-dish-v1-items-list">{itemRows.map(({ item, name, category }) => {
                const selected = selectedIds.includes(item.id);
                const disabled = !selected && selectedIds.length >= AI_DISH_MAX_ITEMS;
                return <button type="button" key={item.id} className={selected ? "selected" : ""} disabled={disabled} onClick={() => toggleItem(item.id)}>
                  <span className="check">{selected ? <Check size={13} /> : null}</span>
                  {item.image_url ? <img src={item.image_url} alt="" /> : <span className="thumb"><ImagePlus size={14} /></span>}
                  <span className="copy"><strong>{name}</strong><small>{category}</small></span>
                </button>;
              })}</div>
              <small className="ai-dish-v1-limit">{t.max}</small>
            </section>

            {error ? <div className="ai-dish-v1-error">{error}</div> : null}
            <button type="button" className="ai-dish-v1-generate" disabled={running || preparing || selectedIds.length < AI_DISH_MIN_ITEMS || files.length < AI_DISH_REFERENCE_MIN_FILES || !projectId} onClick={generateSelected}>
              {running || preparing ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
              {preparing ? t.preparing : running ? `${t.generating} ${readyCount + 1}/${selectedIds.length}` : t.generate}
            </button>
            {!projectId ? <div className="ai-dish-v1-error">{t.projectMissing}</div> : null}
          </div>

          <aside className="ai-dish-v1-results">
            <section className="ai-dish-v1-results-head"><div><span>{t.results}</span><p>{t.resultsHint}</p></div>{totalCost > 0 ? <b>{t.totalCost}: {formatDishImageCost(totalCost)}</b> : null}</section>
            <div className="ai-dish-v1-result-list">
              {selectedIds.map((itemId) => {
                const item = menu.items.find((entry) => entry.id === itemId);
                if (!item) return null;
                const result = results[itemId];
                return (
                  <article className={`ai-dish-v1-result ${result?.approved ? "approved" : ""}`} key={itemId}>
                    <header><div><strong>{itemLabel(item, uiLanguage)}</strong><small>{localizedDishText(groupsById.get(item.group_id)?.name, uiLanguage)}</small></div>{result?.approved ? <span><Check size={12} /> {t.used}</span> : null}</header>
                    <div className="ai-dish-v1-result-image">
                      {result?.status === "generating" ? <div className="loading"><LoaderCircle className="spin" size={26} /><span>{t.generating}…</span></div>
                        : result?.imageUrl ? <img src={result.imageUrl} alt="" />
                          : result?.status === "error" ? <div className="failed"><ImagePlus size={24} /><strong>{t.failed}</strong><small>{result.error}</small></div>
                            : <div className="empty"><ImagePlus size={24} /><span>AI preview</span></div>}
                    </div>
                    {result?.imageUrl ? <div className="ai-dish-v1-result-meta"><span>{t.cost}</span><strong>{formatDishImageCost(result?.cost?.estimated_cost_usd)}</strong></div> : null}
                    <div className="ai-dish-v1-result-actions">
                      <button type="button" className="secondary" disabled={result?.status === "generating" || running} onClick={() => regenerate(item)}><RefreshCw size={14} /> {t.regenerate}</button>
                      <button type="button" className="primary" disabled={!result?.imageUrl || result?.approved} onClick={() => approve(itemId)}><Check size={14} /> {result?.approved ? t.used : t.use}</button>
                    </div>
                  </article>
                );
              })}
              {!selectedIds.length ? <div className="ai-dish-v1-results-empty"><ImagePlus size={30} /><p>{t.itemHint}</p></div> : null}
            </div>

            <div className="ai-dish-v1-accuracy"><Sparkles size={15} /><p>{t.accuracy}</p></div>
            {approvedCount ? <button type="button" className="ai-dish-v1-done" onClick={goBack}>{t.done} <ArrowRight size={15} /></button> : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
