import { useEffect, useMemo, useState } from "react";
import "./MenuPhotoReviewCompare.css";

const COPY = {
  en:{eyebrow:"PHOTO REVIEW",title:"Before / Pro Finish",before:"Original",after:"Pro finish",enhanced:"Enhanced",integrity:"Dish Integrity Lock",hint:"Drag the divider to compare the real original with Beyond's finished version.",useOriginal:"Use original",useFinish:"Use Pro Finish",usingOriginal:"Original selected",usingFinish:"Pro Finish selected",local:"Local vision",ai:"AI + guardrails"},
  he:{eyebrow:"בדיקת תמונה",title:"לפני / גימור מקצועי",before:"מקור",after:"גימור מקצועי",enhanced:"משופר",integrity:"נעילת שלמות המנה",hint:"גררו את המחיצה כדי להשוות בין תמונת המקור האמיתית לגרסה המלוטשת של Beyond.",useOriginal:"שימוש במקור",useFinish:"שימוש בגימור מקצועי",usingOriginal:"המקור נבחר",usingFinish:"הגימור המקצועי נבחר",local:"ראייה מקומית",ai:"AI + מגבלות"},
  ar:{eyebrow:"مراجعة الصورة",title:"قبل / التشطيب الاحترافي",before:"الأصل",after:"تشطيب احترافي",enhanced:"محسنة",integrity:"قفل سلامة الطبق",hint:"اسحب الفاصل لمقارنة الصورة الأصلية الحقيقية بنسخة Beyond المصقولة.",useOriginal:"استخدام الأصل",useFinish:"استخدام التشطيب",usingOriginal:"تم اختيار الأصل",usingFinish:"تم اختيار التشطيب",local:"رؤية محلية",ai:"AI + ضوابط"},
};

function clamp(value) {
  return Math.min(100, Math.max(0, Number(value) || 50));
}

export default function MenuPhotoReviewCompare({
  originalUrl,
  finishedUrl,
  finishedKind="theme",
  activeVariant="theme",
  focusX=50,
  focusY=50,
  finishSource="",
  finishSafety="",
  language="en",
  onSelect,
}) {
  const copy = COPY[language] || COPY.en;
  const [split,setSplit] = useState(50);
  const safeX = clamp(focusX);
  const safeY = clamp(focusY);
  const hasReview = Boolean(originalUrl && finishedUrl && originalUrl !== finishedUrl);
  const finishedActive = activeVariant === finishedKind || (finishedKind === "theme" && activeVariant === "theme");
  const engine = useMemo(() => String(finishSource || "").includes("ai-vision") ? copy.ai : copy.local, [finishSource, copy]);

  useEffect(() => { setSplit(50); }, [originalUrl, finishedUrl]);
  if (!hasReview) return null;

  return <section className="studio-v3-photo-review">
    <div className="studio-v3-photo-review-head">
      <div><span>{copy.eyebrow}</span><strong>{copy.title}</strong></div>
      <div className="studio-v3-photo-review-badges">
        <span>{engine}</span>
        {finishSafety === "dish-integrity-locked" ? <b>✓ {copy.integrity}</b> : null}
      </div>
    </div>

    <div className="studio-v3-photo-review-stage" style={{"--review-focus-x":`${safeX}%`,"--review-focus-y":`${safeY}%`,"--review-split":`${split}%`}}>
      <img className="studio-v3-photo-review-before" src={originalUrl} alt=""/>
      <div className="studio-v3-photo-review-after"><img src={finishedUrl} alt=""/></div>
      <div className="studio-v3-photo-review-divider" style={{left:`${split}%`}} aria-hidden="true"><i/><span>↔</span></div>
      <span className="studio-v3-photo-review-label before">{copy.before}</span>
      <span className="studio-v3-photo-review-label after">{finishedKind === "theme" ? copy.after : copy.enhanced}</span>
      <input
        type="range"
        min="0"
        max="100"
        value={split}
        aria-label={copy.hint}
        onChange={event => setSplit(Number(event.target.value))}
      />
    </div>

    <p>{copy.hint}</p>
    <div className="studio-v3-photo-review-actions">
      <button type="button" className={activeVariant === "original" ? "active" : ""} onClick={() => onSelect?.("original")}>{activeVariant === "original" ? `✓ ${copy.usingOriginal}` : copy.useOriginal}</button>
      <button type="button" className={finishedActive ? "active pro" : "pro"} onClick={() => onSelect?.(finishedKind)}>{finishedActive ? `✓ ${copy.usingFinish}` : copy.useFinish}</button>
    </div>
  </section>;
}
