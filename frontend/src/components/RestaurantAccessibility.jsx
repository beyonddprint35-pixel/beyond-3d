import { useEffect, useState } from "react";
import "./RestaurantAccessibility.css";

const STORAGE_KEY = "beyondRestaurantAccessibilityV1";
const DEFAULT_STATE = { font:0, contrast:false, dark:false, grayscale:false, readable:false, reducedMotion:false, links:false };

const COPY = {
  en: {
    skip:"Skip to main content", accessibility:"Accessibility", close:"Close", increase:"Increase text", decrease:"Decrease text",
    contrast:"High contrast", dark:"Dark mode", grayscale:"Grayscale", readable:"Readable font", motion:"Reduce motion", links:"Highlight links",
    reset:"Reset settings", statement:"Accessibility statement", note:"Accessibility tools for easier use, including keyboard navigation, clear focus and assistive technology support.",
    eyebrow:"ACCESSIBILITY", intro:(name)=>`We aim to provide a comfortable and accessible digital menu experience for ${name}.`, adjustments:"Accessibility features",
    features:["Keyboard navigation and clear focus.","Increase and decrease text size.","High contrast and dark mode.","Readable font and grayscale.","Reduced motion option.","Highlighted links and buttons."],
    updating:"Updating content", updatingText:"The menu may change from time to time. If you encounter an item or component that is not accessible, please contact the restaurant and report it.",
    closing:"We continue working to improve usability and accessibility.", enabled:"enabled", disabled:"disabled", max:"Text size is at maximum", normal:"Text size returned to normal", increased:"Text size increased", decreased:"Text size decreased", resetDone:"Accessibility settings reset"
  },
  he: {
    skip:"דלג לתוכן הראשי", accessibility:"נגישות", close:"סגירה", increase:"הגדלת טקסט", decrease:"הקטנת טקסט",
    contrast:"ניגודיות גבוהה", dark:"מצב כהה", grayscale:"גווני אפור", readable:"גופן קריא", motion:"הפחתת תנועה", links:"הדגשת קישורים",
    reset:"איפוס הגדרות", statement:"הצהרת נגישות", note:"כלי עזר לנוחות שימוש, כולל ניווט מקלדת, פוקוס ברור ותמיכה בטכנולוגיות מסייעות.",
    eyebrow:"נגישות", intro:(name)=>`אנו שואפים לאפשר שימוש נוח ונגיש בתפריט הדיגיטלי של ${name}.`, adjustments:"התאמות באתר",
    features:["ניווט באמצעות מקלדת ופוקוס ברור.","הגדלה והקטנה של טקסט.","מצב ניגודיות גבוהה ומצב כהה.","גופן קריא וגווני אפור.","אפשרות להפחתת תנועה.","הדגשת קישורים וכפתורים."],
    updating:"תוכן מתעדכן", updatingText:"התפריט עשוי להתעדכן מעת לעת. אם נתקלתם בפריט או רכיב שאינו נגיש, ניתן לפנות לבית העסק ולדווח על כך.",
    closing:"אנו ממשיכים לפעול לשיפור חוויית השימוש והנגישות באתר.", enabled:"הופעל", disabled:"בוטל", max:"גודל הטקסט במקסימום", normal:"גודל הטקסט חזר לרגיל", increased:"הטקסט הוגדל", decreased:"הטקסט הוקטן", resetDone:"הגדרות הנגישות אופסו"
  },
  ar: {
    skip:"تخطي إلى المحتوى الرئيسي", accessibility:"إمكانية الوصول", close:"إغلاق", increase:"تكبير النص", decrease:"تصغير النص",
    contrast:"تباين عالٍ", dark:"الوضع الداكن", grayscale:"تدرج رمادي", readable:"خط سهل القراءة", motion:"تقليل الحركة", links:"إبراز الروابط",
    reset:"إعادة ضبط الإعدادات", statement:"بيان إمكانية الوصول", note:"أدوات للمساعدة على سهولة الاستخدام، تشمل التنقل بلوحة المفاتيح والتركيز الواضح ودعم التقنيات المساعدة.",
    eyebrow:"إمكانية الوصول", intro:(name)=>`نسعى لتوفير تجربة قائمة رقمية مريحة وسهلة الوصول لـ ${name}.`, adjustments:"ميزات إمكانية الوصول",
    features:["التنقل بلوحة المفاتيح والتركيز الواضح.","تكبير وتصغير حجم النص.","التباين العالي والوضع الداكن.","خط سهل القراءة وتدرج رمادي.","خيار تقليل الحركة.","إبراز الروابط والأزرار."],
    updating:"محتوى متجدد", updatingText:"قد يتم تحديث القائمة من وقت لآخر. إذا واجهت عنصراً أو مكوناً غير متاح، يرجى التواصل مع المطعم والإبلاغ عنه.",
    closing:"نواصل العمل على تحسين سهولة الاستخدام وإمكانية الوصول.", enabled:"مفعّل", disabled:"معطّل", max:"حجم النص في الحد الأقصى", normal:"عاد حجم النص للوضع الطبيعي", increased:"تم تكبير النص", decreased:"تم تصغير حجم النص", resetDone:"تمت إعادة ضبط إعدادات إمكانية الوصول"
  }
};

function CloseIcon(){
  return <svg className="restaurant-a11y-close-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>;
}

export default function RestaurantAccessibility({ restaurantName="Restaurant", language="he" }) {
  const lang = ["he","en","ar"].includes(language) ? language : "en";
  const t = COPY[lang];
  const rtl = lang === "he" || lang === "ar";
  const [open,setOpen] = useState(false);
  const [statementOpen,setStatementOpen] = useState(false);
  const [settings,setSettings] = useState(DEFAULT_STATE);
  const [status,setStatus] = useState("");

  useEffect(()=>{ try { const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"); if(saved) setSettings({...DEFAULT_STATE,...saved}); } catch {} },[]);
  useEffect(()=>{
    const root=document.documentElement; const body=document.body;
    [1,2,3,4].forEach(level=>body.classList.toggle(`restaurant-a11y-text-${level}`,settings.font===level));
    root.classList.toggle("restaurant-a11y-contrast",settings.contrast); root.classList.toggle("restaurant-a11y-dark",settings.dark);
    root.classList.toggle("restaurant-a11y-grayscale",settings.grayscale); root.classList.toggle("restaurant-a11y-readable",settings.readable);
    root.classList.toggle("restaurant-a11y-motion",settings.reducedMotion); root.classList.toggle("restaurant-a11y-links",settings.links);
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(settings)); } catch {}
  },[settings]);
  useEffect(()=>{ const fn=()=>{setOpen(false);setStatementOpen(true)}; window.addEventListener("beyond-open-accessibility-statement",fn); return()=>window.removeEventListener("beyond-open-accessibility-statement",fn); },[]);
  useEffect(()=>{ const fn=e=>{if(e.key==="Escape"){setOpen(false);setStatementOpen(false)}}; document.addEventListener("keydown",fn); return()=>document.removeEventListener("keydown",fn); },[]);

  const announce=message=>{setStatus("");requestAnimationFrame(()=>setStatus(message));};
  const toggle=(key,label)=>setSettings(current=>{const next=!current[key];announce(`${label} ${next?t.enabled:t.disabled}`);return{...current,[key]:next};});
  const increase=()=>setSettings(current=>{const next=Math.min(4,current.font+1);announce(next===4?t.max:t.increased);return{...current,font:next};});
  const decrease=()=>setSettings(current=>{const next=Math.max(0,current.font-1);announce(next===0?t.normal:t.decreased);return{...current,font:next};});
  const reset=()=>{setSettings(DEFAULT_STATE);try{localStorage.removeItem(STORAGE_KEY)}catch{}announce(t.resetDone)};

  return <>
    <a className="restaurant-skip-link" href="#restaurant-main-content">{t.skip}</a>
    <div className="restaurant-a11y-status" aria-live="polite" aria-atomic="true">{status}</div>
    <button type="button" className="restaurant-a11y-toggle" aria-label={t.accessibility} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17"/><circle className="restaurant-a11y-head" cx="20" cy="11.5" r="2.8"/><path d="M11.5 16.8c2.8 1.3 5.6 2 8.5 2s5.7-.7 8.5-2"/><path d="M20 18.8v8.1"/><path d="M20 26.7l-5.2 6"/><path d="M20 26.7l5.2 6"/></svg></button>
    {open&&<aside className="restaurant-a11y-panel" role="dialog" aria-label={t.accessibility} dir={rtl?"rtl":"ltr"}><div className="restaurant-a11y-panel-head"><strong>{t.accessibility}</strong><button type="button" aria-label={t.close} onClick={()=>setOpen(false)}><CloseIcon/></button></div><div className="restaurant-a11y-actions"><button onClick={increase}>A+ {t.increase}</button><button onClick={decrease}>A− {t.decrease}</button><button aria-pressed={settings.contrast} onClick={()=>toggle("contrast",t.contrast)}>{t.contrast}</button><button aria-pressed={settings.dark} onClick={()=>toggle("dark",t.dark)}>{t.dark}</button><button aria-pressed={settings.grayscale} onClick={()=>toggle("grayscale",t.grayscale)}>{t.grayscale}</button><button aria-pressed={settings.readable} onClick={()=>toggle("readable",t.readable)}>{t.readable}</button><button aria-pressed={settings.reducedMotion} onClick={()=>toggle("reducedMotion",t.motion)}>{t.motion}</button><button aria-pressed={settings.links} onClick={()=>toggle("links",t.links)}>{t.links}</button><button onClick={reset}>{t.reset}</button><button onClick={()=>{setOpen(false);setStatementOpen(true)}}>{t.statement}</button></div><p className="restaurant-a11y-note">{t.note}</p></aside>}
    {statementOpen&&<div className="restaurant-a11y-statement-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setStatementOpen(false)}}><section className="restaurant-a11y-statement" role="dialog" aria-modal="true" aria-labelledby="restaurantAccessibilityStatementTitle" dir={rtl?"rtl":"ltr"}><header><div><span>{t.eyebrow}</span><h2 id="restaurantAccessibilityStatementTitle">{t.statement}</h2></div><button type="button" aria-label={t.close} onClick={()=>setStatementOpen(false)}><CloseIcon/></button></header><div className="restaurant-a11y-statement-body"><p>{t.intro(restaurantName)}</p><h3>{t.adjustments}</h3><ul>{t.features.map(item=><li key={item}>{item}</li>)}</ul><h3>{t.updating}</h3><p>{t.updatingText}</p><p className="restaurant-a11y-statement-note">{t.closing}</p></div></section></div>}
  </>;
}
