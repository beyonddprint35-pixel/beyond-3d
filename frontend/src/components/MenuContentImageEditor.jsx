import { useRef, useState } from "react";
import { Camera, ImagePlus, Link2, LoaderCircle, Sparkles, Trash2, Upload } from "lucide-react";

import {
  removeMenuItemImage,
  uploadMenuItemImage,
  validateMenuItemImage,
} from "../features/menu-engine/data/menuItemImageService";
import "./MenuContentImageEditor.css";

const AI_COPY = {
  en: { title: "Create matching photos with AI", hint: "Use a few real restaurant dishes to generate matching visuals for selected menu items." },
  he: { title: "יצירת תמונות תואמות עם AI", hint: "השתמשו בכמה תמונות אמיתיות מהמסעדה כדי ליצור תמונות תואמות לפריטים נבחרים." },
  ar: { title: "إنشاء صور متناسقة بالذكاء الاصطناعي", hint: "استخدموا بعض صور الأطباق الحقيقية لإنشاء صور متناسقة لأصناف مختارة." },
};

const PHOTO_COPY = {
  en: {
    title: "Dish photo",
    hint: "Take a photo now or choose one from your phone.",
    take: "Take photo",
    takeHint: "Open camera",
    choose: "Choose from phone",
    chooseHint: "Photo library",
    replace: "Replace photo",
    ready: "Photo added",
  },
  he: {
    title: "תמונת המנה",
    hint: "צלמו עכשיו או בחרו תמונה מהטלפון.",
    take: "צילום עכשיו",
    takeHint: "פתיחת המצלמה",
    choose: "בחירה מהטלפון",
    chooseHint: "ספריית התמונות",
    replace: "החלפת תמונה",
    ready: "התמונה נוספה",
  },
  ar: {
    title: "صورة الطبق",
    hint: "التقط صورة الآن أو اختر صورة من هاتفك.",
    take: "التقط صورة",
    takeHint: "فتح الكاميرا",
    choose: "اختر من الهاتف",
    chooseHint: "مكتبة الصور",
    replace: "استبدال الصورة",
    ready: "تمت إضافة الصورة",
  },
};

export default function MenuContentImageEditor({ item, projectId = "draft", t, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);

  async function uploadFile(file) {
    if (!file || uploading) return;
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
      onChange?.(uploaded);
    } catch (uploadError) {
      setError(uploadError?.message || t.imageUploadError);
    } finally {
      setUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (libraryInputRef.current) libraryInputRef.current.value = "";
    }
  }

  function chooseFile(event) {
    const file = event.target.files?.[0];
    uploadFile(file);
  }

  async function removeImage() {
    setUploading(true);
    setError("");
    try {
      if (item.image_path) await removeMenuItemImage(item.image_path);
      onChange?.({ image_url: "", image_path: "" });
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

  const language = ["en", "he", "ar"].includes(document.documentElement.lang) ? document.documentElement.lang : "en";
  const aiCopy = AI_COPY[language] || AI_COPY.en;
  const photoCopy = PHOTO_COPY[language] || PHOTO_COPY.en;

  return (
    <div className="menu-content-v2-image-editor menu-content-v2-image-editor-friendly">
      <div className="menu-content-v2-image-editor-head">
        <div><strong>{photoCopy.title}</strong><small>{photoCopy.hint}</small></div>
        {item.image_url ? <button type="button" onClick={removeImage} disabled={uploading}><Trash2 size={13} /> {t.removePhoto}</button> : null}
      </div>

      {item.image_url ? (
        <div className="menu-content-v2-image-preview">
          <img src={item.image_url} alt="" />
          <div className="menu-content-v2-photo-ready-badge">✓ {photoCopy.ready}</div>
        </div>
      ) : null}

      <div className="menu-content-v2-photo-actions">
        <button type="button" className="menu-content-v2-photo-action menu-content-v2-photo-action-camera" disabled={uploading} onClick={() => cameraInputRef.current?.click()}>
          {uploading ? <LoaderCircle size={19} className="spin" /> : <Camera size={19} />}
          <span><strong>{uploading ? t.uploadingPhoto : photoCopy.take}</strong><small>{photoCopy.takeHint}</small></span>
        </button>
        <button type="button" className="menu-content-v2-photo-action" disabled={uploading} onClick={() => libraryInputRef.current?.click()}>
          {uploading ? <LoaderCircle size={19} className="spin" /> : <ImagePlus size={19} />}
          <span><strong>{item.image_url ? photoCopy.replace : photoCopy.choose}</strong><small>{photoCopy.chooseHint}</small></span>
        </button>
      </div>

      <input ref={cameraInputRef} className="menu-content-v2-photo-native-input" type="file" accept="image/*" capture="environment" onChange={chooseFile} disabled={uploading} />
      <input ref={libraryInputRef} className="menu-content-v2-photo-native-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} disabled={uploading} />

      <button type="button" className="menu-content-v2-image-ai" onClick={openAiPhotos}>
        <Sparkles size={15} />
        <span><strong>{aiCopy.title}</strong><small>{aiCopy.hint}</small></span>
      </button>

      <button type="button" className="menu-content-v2-image-url-toggle" onClick={() => setShowUrl((value) => !value)}>
        <Link2 size={13} /> {showUrl ? t.hideImageUrl : t.useImageUrl}
      </button>

      {showUrl ? (
        <div className="menu-content-v2-image-input">
          <Link2 size={15} />
          <input dir="ltr" value={item.image_url || ""} onChange={(event) => onChange?.({ image_url: event.target.value, image_path: "" })} placeholder="https://..." />
        </div>
      ) : null}

      {error ? <div className="menu-content-v2-image-error">{error}</div> : null}
    </div>
  );
}
