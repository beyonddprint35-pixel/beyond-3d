import { useState } from "react";
import { ImagePlus, Link2, LoaderCircle, Sparkles, Trash2, Upload } from "lucide-react";

import {
  removeMenuItemImage,
  uploadMenuItemImage,
  validateMenuItemImage,
} from "../features/menu-engine/data/menuItemImageService";

const AI_COPY = {
  en: { title: "Create matching photos with AI", hint: "Use a few real restaurant dishes to generate matching visuals for selected menu items." },
  he: { title: "יצירת תמונות תואמות עם AI", hint: "השתמשו בכמה תמונות אמיתיות מהמסעדה כדי ליצור תמונות תואמות לפריטים נבחרים." },
  ar: { title: "إنشاء صور متناسقة بالذكاء الاصطناعي", hint: "استخدموا بعض صور الأطباق الحقيقية لإنشاء صور متناسقة لأصناف مختارة." },
};

export default function MenuContentImageEditor({ item, projectId = "draft", t, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showUrl, setShowUrl] = useState(false);

  async function chooseFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
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
    }
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

  return (
    <div className="menu-content-v2-image-editor">
      <div className="menu-content-v2-image-editor-head">
        <div><strong>{t.itemPhoto}</strong><small>{t.itemPhotoHint}</small></div>
        {item.image_url ? <button type="button" onClick={removeImage} disabled={uploading}><Trash2 size={13} /> {t.removePhoto}</button> : null}
      </div>

      {item.image_url ? (
        <div className="menu-content-v2-image-preview">
          <img src={item.image_url} alt="" />
          <label className="menu-content-v2-image-replace">
            {uploading ? <LoaderCircle size={14} className="spin" /> : <Upload size={14} />}
            <span>{uploading ? t.uploadingPhoto : t.replacePhoto}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} disabled={uploading} />
          </label>
        </div>
      ) : (
        <label className="menu-content-v2-image-upload">
          {uploading ? <LoaderCircle size={18} className="spin" /> : <ImagePlus size={18} />}
          <strong>{uploading ? t.uploadingPhoto : t.uploadPhoto}</strong>
          <small>{t.photoFormats}</small>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} disabled={uploading} />
        </label>
      )}

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
