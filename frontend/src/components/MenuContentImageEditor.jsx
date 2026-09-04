import { useRef, useState } from "react";
import {
  ArrowLeftRight,
  Camera,
  Check,
  ImagePlus,
  Link2,
  LoaderCircle,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";

import {
  removeMenuItemImage,
  uploadMenuItemImage,
  validateMenuItemImage,
} from "../features/menu-engine/data/menuItemImageService";
import "./MenuContentImageEditor.css";

const PHOTO_COPY = {
  en: {
    title: "Dish photo",
    hint: "Use a real photo. Beyond can make it polished and consistent with your menu.",
    take: "Take photo",
    takeHint: "Open camera",
    choose: "Choose from phone",
    chooseHint: "Photo library",
    replace: "Replace photo",
    ready: "Photo added",
    prepare: "Make it menu-ready",
    prepareHint: "Improve lighting, color and presentation while keeping the real dish.",
    studioTitle: "Make this photo menu-ready",
    studioHint: "Pick the look you prefer. The food itself stays unchanged.",
    original: "Original",
    clean: "Clean",
    cleanHint: "Bright and natural",
    warm: "Warm",
    warmHint: "Rich and inviting",
    menu: "Menu style",
    menuHint: "Balanced and polished",
    recommended: "Recommended",
    compare: "Tap a style to preview",
    usePhoto: "Use this photo",
    processing: "Preparing your photo…",
    processingHint: "Beyond is applying the selected look and saving it to this item.",
    cancel: "Cancel",
    done: "Menu-ready",
    advancedAi: "Create a photo with AI instead",
    advancedAiHint: "Only use this when you do not have a real photo of the dish.",
  },
  he: {
    title: "תמונת המנה",
    hint: "השתמשו בתמונה אמיתית. Beyond יכול לשפר אותה ולהתאים אותה לשאר התפריט.",
    take: "צילום עכשיו",
    takeHint: "פתיחת המצלמה",
    choose: "בחירה מהטלפון",
    chooseHint: "ספריית התמונות",
    replace: "החלפת תמונה",
    ready: "התמונה נוספה",
    prepare: "הפכו אותה למוכנה לתפריט",
    prepareHint: "שיפור תאורה, צבע והצגה בלי לשנות את המנה עצמה.",
    studioTitle: "הכינו את התמונה לתפריט",
    studioHint: "בחרו את המראה המועדף. האוכל עצמו נשאר ללא שינוי.",
    original: "מקור",
    clean: "נקי",
    cleanHint: "בהיר וטבעי",
    warm: "חם",
    warmHint: "עשיר ומזמין",
    menu: "סגנון התפריט",
    menuHint: "מאוזן ומלוטש",
    recommended: "מומלץ",
    compare: "לחצו על סגנון כדי לראות תצוגה מקדימה",
    usePhoto: "השתמשו בתמונה הזו",
    processing: "מכין את התמונה…",
    processingHint: "Beyond מחיל את המראה שבחרתם ושומר אותו בפריט.",
    cancel: "ביטול",
    done: "מוכן לתפריט",
    advancedAi: "יצירת תמונה עם AI במקום",
    advancedAiHint: "השתמשו בזה רק כשאין תמונה אמיתית של המנה.",
  },
  ar: {
    title: "صورة الطبق",
    hint: "استخدم صورة حقيقية. يمكن لـ Beyond تحسينها وتوحيدها مع بقية القائمة.",
    take: "التقط صورة",
    takeHint: "فتح الكاميرا",
    choose: "اختر من الهاتف",
    chooseHint: "مكتبة الصور",
    replace: "استبدال الصورة",
    ready: "تمت إضافة الصورة",
    prepare: "اجعلها جاهزة للقائمة",
    prepareHint: "تحسين الإضاءة والألوان والعرض مع الحفاظ على الطبق الحقيقي.",
    studioTitle: "جهّز هذه الصورة للقائمة",
    studioHint: "اختر المظهر الذي تفضله. يبقى الطعام نفسه دون تغيير.",
    original: "الأصل",
    clean: "نظيف",
    cleanHint: "مشرق وطبيعي",
    warm: "دافئ",
    warmHint: "غني وجذاب",
    menu: "أسلوب القائمة",
    menuHint: "متوازن ومصقول",
    recommended: "موصى به",
    compare: "اضغط على نمط للمعاينة",
    usePhoto: "استخدم هذه الصورة",
    processing: "نجهز صورتك…",
    processingHint: "يطبّق Beyond المظهر المختار ويحفظه لهذا العنصر.",
    cancel: "إلغاء",
    done: "جاهزة للقائمة",
    advancedAi: "أنشئ صورة بالذكاء الاصطناعي بدلاً من ذلك",
    advancedAiHint: "استخدم هذا فقط عندما لا توجد صورة حقيقية للطبق.",
  },
};

const PRESETS = {
  original: { filter: "none" },
  clean: { filter: "brightness(1.08) contrast(1.06) saturate(1.04)" },
  warm: { filter: "brightness(1.04) contrast(1.08) saturate(1.13) sepia(0.06)" },
  menu: { filter: "brightness(1.06) contrast(1.11) saturate(1.09)" },
};

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not prepare this image."));
    };
    image.src = url;
  });
}

async function createProcessedFile(sourceUrl, preset, itemId) {
  const response = await fetch(sourceUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load this image for processing.");
  const blob = await response.blob();
  const image = await loadImageFromBlob(blob);

  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not prepare this image.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (preset !== "original" && "filter" in ctx) ctx.filter = PRESETS[preset]?.filter || PRESETS.menu.filter;
  ctx.drawImage(image, 0, 0, width, height);
  ctx.filter = "none";

  const outputBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!outputBlob) throw new Error("Could not create the menu-ready image.");
  return new File([outputBlob], `${itemId || "dish"}-${preset}-menu-ready.jpg`, { type: "image/jpeg" });
}

export default function MenuContentImageEditor({ item, projectId = "draft", t, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [preset, setPreset] = useState("menu");
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);

  const language = ["en", "he", "ar"].includes(document.documentElement.lang) ? document.documentElement.lang : "en";
  const copy = PHOTO_COPY[language] || PHOTO_COPY.en;
  const sourceUrl = item.image_original_url || item.image_url || "";
  const sourcePath = item.image_original_path || item.image_path || "";
  const previewFilter = PRESETS[preset]?.filter || PRESETS.menu.filter;
  const isMenuReady = Boolean(item.image_processed_url || item.image_variant);

  async function uploadFile(file) {
    if (!file || uploading || processing) return;
    const validation = validateMenuItemImage(file);
    if (validation) {
      setError(validation);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadMenuItemImage({
        file,
        itemId: item.id,
        projectId,
        previousPath: item.image_path || "",
      });
      onChange?.({
        ...uploaded,
        image_original_url: uploaded.image_url,
        image_original_path: uploaded.image_path,
        image_processed_url: "",
        image_processed_path: "",
        image_variant: "",
      });
      setPreset("menu");
      setStudioOpen(true);
    } catch (uploadError) {
      setError(uploadError?.message || t.imageUploadError);
    } finally {
      setUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (libraryInputRef.current) libraryInputRef.current.value = "";
    }
  }

  function chooseFile(event) {
    uploadFile(event.target.files?.[0]);
  }

  async function applyPreset() {
    if (!sourceUrl || processing) return;
    if (preset === "original") {
      onChange?.({ image_url: sourceUrl, image_path: sourcePath, image_variant: "original" });
      setStudioOpen(false);
      return;
    }

    setProcessing(true);
    setError("");
    try {
      const file = await createProcessedFile(sourceUrl, preset, item.id);
      const uploaded = await uploadMenuItemImage({
        file,
        itemId: item.id,
        projectId,
        previousPath: item.image_processed_path || "",
      });
      onChange?.({
        image_url: uploaded.image_url,
        image_path: uploaded.image_path,
        image_original_url: sourceUrl,
        image_original_path: sourcePath,
        image_processed_url: uploaded.image_url,
        image_processed_path: uploaded.image_path,
        image_variant: preset,
      });
      setStudioOpen(false);
    } catch (processError) {
      setError(processError?.message || "Could not prepare this photo.");
    } finally {
      setProcessing(false);
    }
  }

  async function removeImage() {
    setUploading(true);
    setError("");
    try {
      const paths = [...new Set([item.image_path, item.image_original_path, item.image_processed_path].filter(Boolean))];
      for (const path of paths) await removeMenuItemImage(path);
      onChange?.({
        image_url: "",
        image_path: "",
        image_original_url: "",
        image_original_path: "",
        image_processed_url: "",
        image_processed_path: "",
        image_variant: "",
      });
      setStudioOpen(false);
    } catch (removeError) {
      setError(removeError?.message || t.imageRemoveError);
    } finally {
      setUploading(false);
    }
  }

  function openAiPhotos() {
    const params = new URLSearchParams(window.location.search || "");
    params.set("item", item.id);
    window.location.assign(`/menu-studio/ai-images?${params.toString()}`);
  }

  return (
    <div className="menu-content-v2-image-editor menu-content-v2-image-editor-friendly">
      <div className="menu-content-v2-image-editor-head">
        <div><strong>{copy.title}</strong><small>{copy.hint}</small></div>
        {item.image_url ? <button type="button" onClick={removeImage} disabled={uploading || processing}><Trash2 size={13} /> {t.removePhoto}</button> : null}
      </div>

      {item.image_url ? (
        <div className="menu-content-v2-image-preview menu-content-v2-image-preview-friendly">
          <img src={item.image_url} alt="" />
          <div className={`menu-content-v2-photo-ready-badge ${isMenuReady ? "is-finished" : ""}`}>
            {isMenuReady ? <><Check size={10} /> {copy.done}</> : <>✓ {copy.ready}</>}
          </div>
        </div>
      ) : null}

      {item.image_url && !studioOpen ? (
        <button type="button" className="menu-content-v2-photo-prepare" onClick={() => { setPreset(item.image_variant && item.image_variant !== "original" ? item.image_variant : "menu"); setStudioOpen(true); }} disabled={uploading || processing}>
          <span className="menu-content-v2-photo-prepare-icon"><WandSparkles size={18} /></span>
          <span><strong>{copy.prepare}</strong><small>{copy.prepareHint}</small></span>
          <span className="menu-content-v2-photo-prepare-arrow">›</span>
        </button>
      ) : null}

      {studioOpen && item.image_url ? (
        <div className="menu-content-v2-photo-studio">
          <div className="menu-content-v2-photo-studio-head">
            <div><strong>{copy.studioTitle}</strong><small>{copy.studioHint}</small></div>
            <button type="button" onClick={() => setStudioOpen(false)} disabled={processing} aria-label={copy.cancel}><X size={16} /></button>
          </div>

          <div className="menu-content-v2-photo-studio-preview">
            <img src={sourceUrl} alt="" style={{ filter: previewFilter }} />
            <span><ArrowLeftRight size={12} /> {preset === "original" ? copy.original : copy[preset]}</span>
            {processing ? (
              <div className="menu-content-v2-photo-processing">
                <LoaderCircle size={25} className="spin" />
                <strong>{copy.processing}</strong>
                <small>{copy.processingHint}</small>
              </div>
            ) : null}
          </div>

          <small className="menu-content-v2-photo-compare-hint">{copy.compare}</small>
          <div className="menu-content-v2-photo-presets">
            {[
              ["original", copy.original, ""],
              ["clean", copy.clean, copy.cleanHint],
              ["warm", copy.warm, copy.warmHint],
              ["menu", copy.menu, copy.menuHint],
            ].map(([key, label, hint]) => (
              <button key={key} type="button" className={preset === key ? "active" : ""} onClick={() => setPreset(key)} disabled={processing}>
                <span className="menu-content-v2-photo-preset-thumb"><img src={sourceUrl} alt="" style={{ filter: PRESETS[key].filter }} /></span>
                <span><strong>{label}</strong>{hint ? <small>{hint}</small> : null}{key === "menu" ? <em>{copy.recommended}</em> : null}</span>
              </button>
            ))}
          </div>

          <div className="menu-content-v2-photo-studio-actions">
            <button type="button" className="secondary" onClick={() => setStudioOpen(false)} disabled={processing}>{copy.cancel}</button>
            <button type="button" className="primary" onClick={applyPreset} disabled={processing}>
              {processing ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}
              {copy.usePhoto}
            </button>
          </div>
        </div>
      ) : null}

      {!studioOpen ? (
        <div className="menu-content-v2-photo-actions">
          <button type="button" className="menu-content-v2-photo-action menu-content-v2-photo-action-camera" disabled={uploading || processing} onClick={() => cameraInputRef.current?.click()}>
            {uploading ? <LoaderCircle size={19} className="spin" /> : <Camera size={19} />}
            <span><strong>{uploading ? t.uploadingPhoto : copy.take}</strong><small>{copy.takeHint}</small></span>
          </button>
          <button type="button" className="menu-content-v2-photo-action" disabled={uploading || processing} onClick={() => libraryInputRef.current?.click()}>
            {uploading ? <LoaderCircle size={19} className="spin" /> : <ImagePlus size={19} />}
            <span><strong>{item.image_url ? copy.replace : copy.choose}</strong><small>{copy.chooseHint}</small></span>
          </button>
        </div>
      ) : null}

      <input ref={cameraInputRef} className="menu-content-v2-photo-native-input" type="file" accept="image/*" capture="environment" onChange={chooseFile} disabled={uploading || processing} />
      <input ref={libraryInputRef} className="menu-content-v2-photo-native-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} disabled={uploading || processing} />

      {!studioOpen ? (
        <button type="button" className="menu-content-v2-image-ai menu-content-v2-image-ai-secondary" onClick={openAiPhotos}>
          <Sparkles size={15} />
          <span><strong>{copy.advancedAi}</strong><small>{copy.advancedAiHint}</small></span>
        </button>
      ) : null}

      {!studioOpen ? (
        <button type="button" className="menu-content-v2-image-url-toggle" onClick={() => setShowUrl((value) => !value)}>
          <Link2 size={13} /> {showUrl ? t.hideImageUrl : t.useImageUrl}
        </button>
      ) : null}

      {showUrl && !studioOpen ? (
        <div className="menu-content-v2-image-input">
          <Link2 size={15} />
          <input dir="ltr" value={item.image_url || ""} onChange={(event) => onChange?.({ image_url: event.target.value, image_path: "" })} placeholder="https://..." />
        </div>
      ) : null}

      {error ? <div className="menu-content-v2-image-error">{error}</div> : null}
    </div>
  );
}
