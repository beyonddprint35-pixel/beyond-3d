import { useRef, useState } from "react";
import { uploadMenuItemImage } from "./menuItemImageStorage";
import "./MenuStudioItemPhotoField.css";

const COPY = {
  en:{label:"Item photo",upload:"Upload photo",replace:"Replace photo",remove:"Remove",uploading:"Optimizing & uploading…",hint:"JPEG, PNG or WebP · up to 20 MB · Beyond optimizes the image automatically",drop:"Drop a food photo here",empty:"Add a photo for image-led menu designs",error:"Photo upload failed"},
  he:{label:"תמונת הפריט",upload:"העלאת תמונה",replace:"החלפת תמונה",remove:"הסרה",uploading:"מייעל ומעלה…",hint:"JPEG, PNG או WebP · עד 20MB · Beyond ממטב את התמונה אוטומטית",drop:"שחררו כאן תמונת מנה",empty:"הוסיפו תמונה לעיצובים מבוססי תמונות",error:"העלאת התמונה נכשלה"},
  ar:{label:"صورة العنصر",upload:"رفع صورة",replace:"استبدال الصورة",remove:"إزالة",uploading:"جارٍ التحسين والرفع…",hint:"JPEG أو PNG أو WebP · حتى 20 MB · يقوم Beyond بتحسين الصورة تلقائيًا",drop:"أفلت صورة الطبق هنا",empty:"أضف صورة لتصاميم القوائم المعتمدة على الصور",error:"فشل رفع الصورة"},
};

export default function MenuStudioItemPhotoField({ item, onChange, siteId, slug, studioLanguage="en" }) {
  const copy = COPY[studioLanguage] || COPY.en;
  const inputRef = useRef(null);
  const [uploading,setUploading] = useState(false);
  const [dragging,setDragging] = useState(false);
  const [error,setError] = useState("");

  const imageUrl = String(item?.image_url || "");

  async function handleFile(file) {
    if (!file || uploading) return;
    setError("");
    setUploading(true);
    try {
      const uploaded = await uploadMenuItemImage({ file, siteId, slug, itemId:item?.id });
      onChange?.({
        image_url:uploaded.url,
        image_path:uploaded.path,
        image_width:uploaded.width,
        image_height:uploaded.height,
      });
    } catch (err) {
      setError(err?.message || copy.error);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  return <section className="studio-v3-item-photo-field">
    <div className="studio-v3-item-photo-label-row">
      <strong>{copy.label}</strong>
      <small>{copy.hint}</small>
    </div>

    <div
      className={`studio-v3-item-photo-dropzone ${imageUrl ? "has-image" : "empty"} ${dragging ? "is-dragging" : ""} ${uploading ? "is-uploading" : ""}`}
      onDragEnter={event => { event.preventDefault(); setDragging(true); }}
      onDragOver={event => event.preventDefault()}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={handleDrop}
    >
      {imageUrl ? <img src={imageUrl} alt=""/> : <div className="studio-v3-item-photo-empty"><span className="studio-v3-item-photo-icon" aria-hidden="true"><i/><i/></span><strong>{dragging ? copy.drop : copy.empty}</strong></div>}
      <div className="studio-v3-item-photo-overlay">
        <button type="button" className="primary" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading ? copy.uploading : (imageUrl ? copy.replace : copy.upload)}</button>
        {imageUrl ? <button type="button" className="secondary" disabled={uploading} onClick={() => { setError(""); onChange?.({ image_url:"", image_path:"", image_width:null, image_height:null }); }}>{copy.remove}</button> : null}
      </div>
      {uploading ? <span className="studio-v3-item-photo-progress" aria-hidden="true"/> : null}
    </div>

    <input ref={inputRef} className="studio-v3-item-photo-native-input" type="file" accept="image/*" onChange={event => handleFile(event.target.files?.[0])}/>
    {error ? <div className="studio-v3-item-photo-error" role="alert">{error}</div> : null}
  </section>;
}
