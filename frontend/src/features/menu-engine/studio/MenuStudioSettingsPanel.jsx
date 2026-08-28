import { useMemo, useState } from "react";

const COPY={
  en:{eyebrow:"MENU SETTINGS",title:"Restaurant & publishing",subtitle:"Manage the identity, public address and assets customers use to reach your menu.",identity:"Restaurant identity",restaurant:"Restaurant name",publicMenu:"Public menu",publicHint:"This is the address your QR and NFC touchpoints should open.",copy:"Copy link",copied:"Copied",open:"Open menu",qr:"Restaurant QR",qrHint:"Use this QR on printed menus, tables, windows and Beyond stands.",download:"Download QR",languages:"Languages",languagesHint:"Languages currently available on this menu.",defaultLanguage:"Default language",currency:"Currency",publishing:"Publishing",draftSafe:"Edits stay private until you publish.",liveUrl:"Live address",slug:"Menu slug"},
  he:{eyebrow:"הגדרות תפריט",title:"מסעדה ופרסום",subtitle:"ניהול זהות המסעדה, הכתובת הציבורית והנכסים שדרכם לקוחות מגיעים לתפריט.",identity:"זהות המסעדה",restaurant:"שם המסעדה",publicMenu:"התפריט הציבורי",publicHint:"זו הכתובת שאליה צריכים להוביל ה-QR וה-NFC.",copy:"העתקת קישור",copied:"הועתק",open:"פתיחת תפריט",qr:"QR למסעדה",qrHint:"אפשר להשתמש ב-QR בתפריטים מודפסים, שולחנות, חלונות ומעמדי Beyond.",download:"הורדת QR",languages:"שפות",languagesHint:"השפות הזמינות כרגע בתפריט.",defaultLanguage:"שפת ברירת מחדל",currency:"מטבע",publishing:"פרסום",draftSafe:"השינויים נשארים פרטיים עד לפרסום.",liveUrl:"כתובת חיה",slug:"כתובת התפריט"},
  ar:{eyebrow:"إعدادات القائمة",title:"المطعم والنشر",subtitle:"إدارة هوية المطعم والعنوان العام والأصول التي يستخدمها العملاء للوصول إلى القائمة.",identity:"هوية المطعم",restaurant:"اسم المطعم",publicMenu:"القائمة العامة",publicHint:"هذا هو العنوان الذي يجب أن تفتحه نقاط QR وNFC.",copy:"نسخ الرابط",copied:"تم النسخ",open:"فتح القائمة",qr:"QR للمطعم",qrHint:"استخدم رمز QR على القوائم المطبوعة والطاولات والنوافذ وحوامل Beyond.",download:"تنزيل QR",languages:"اللغات",languagesHint:"اللغات المتاحة حاليًا في القائمة.",defaultLanguage:"اللغة الافتراضية",currency:"العملة",publishing:"النشر",draftSafe:"تبقى التعديلات خاصة حتى تقوم بالنشر.",liveUrl:"العنوان المباشر",slug:"رابط القائمة"},
};

export default function MenuStudioSettingsPanel({menu,language="en",patchMenu}){
  const t=COPY[language]||COPY.en;
  const [copied,setCopied]=useState(false);
  const publicUrl=useMemo(()=>`https://b3yondworld.com/menu/${menu.slug}`,[menu.slug]);
  const qrUrl=`https://api.qrserver.com/v1/create-qr-code/?size=900x900&margin=32&format=png&data=${encodeURIComponent(publicUrl)}`;
  const menuLanguages=menu.languages?.length?menu.languages:[menu.default_language||"en"];

  async function copyLink(){try{await navigator.clipboard.writeText(publicUrl);setCopied(true);window.setTimeout(()=>setCopied(false),1600)}catch{}}
  async function downloadQr(){try{const response=await fetch(qrUrl);const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${menu.slug || "restaurant"}-qr.png`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}catch{window.open(qrUrl,"_blank","noopener,noreferrer")}}
  function changeDefaultLanguage(value){if(!patchMenu)return;patchMenu(current=>({...current,default_language:value}))}

  return <section className="studio-settings-hub">
    <header className="studio-settings-hero"><span>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.subtitle}</p></header>

    <div className="studio-settings-grid">
      <article className="studio-settings-card studio-settings-identity">
        <div className="studio-settings-card-head"><strong>{t.identity}</strong><span>{menu.restaurant_name}</span></div>
        <dl><div><dt>{t.restaurant}</dt><dd>{menu.restaurant_name}</dd></div><div><dt>{t.slug}</dt><dd>/{menu.slug}</dd></div><div><dt>{t.currency}</dt><dd>{menu.currency_symbol || "₪"} · {menu.currency || "ILS"}</dd></div></dl>
      </article>

      <article className="studio-settings-card studio-settings-public">
        <div className="studio-settings-card-head"><strong>{t.publicMenu}</strong><span>LIVE</span></div>
        <p>{t.publicHint}</p>
        <div className="studio-settings-url"><span>{publicUrl}</span><button type="button" onClick={copyLink}>{copied?t.copied:t.copy}</button></div>
        <a className="studio-settings-open" href={publicUrl} target="_blank" rel="noreferrer">{t.open} ↗</a>
      </article>

      <article className="studio-settings-card studio-settings-qr">
        <div className="studio-settings-card-head"><strong>{t.qr}</strong><span>QR</span></div>
        <div className="studio-settings-qr-body"><div className="studio-settings-qr-frame"><img src={qrUrl} alt={`${menu.restaurant_name} QR`}/></div><div><p>{t.qrHint}</p><button type="button" className="studio-settings-download" onClick={downloadQr}>{t.download}</button></div></div>
      </article>

      <article className="studio-settings-card studio-settings-languages">
        <div className="studio-settings-card-head"><strong>{t.languages}</strong><span>{menuLanguages.length}</span></div>
        <p>{t.languagesHint}</p>
        <div className="studio-settings-language-chips">{menuLanguages.map(code=><span key={code}>{code.toUpperCase()}</span>)}</div>
        <label><span>{t.defaultLanguage}</span><select value={menu.default_language || menuLanguages[0]} onChange={e=>changeDefaultLanguage(e.target.value)}>{menuLanguages.map(code=><option value={code} key={code}>{code.toUpperCase()}</option>)}</select></label>
      </article>
    </div>

    <article className="studio-settings-publishing"><div><span>{t.publishing}</span><strong>{t.draftSafe}</strong></div><div><small>{t.liveUrl}</small><code>{publicUrl}</code></div></article>
  </section>
}
