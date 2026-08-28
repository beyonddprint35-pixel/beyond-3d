import { useEffect, useMemo, useState } from "react";
import {
  MENU_COLOR_PRESETS,
  MENU_FONT_FAMILIES,
  MENU_FONT_WEIGHTS,
  applyMenuColorPreset,
  normalizeMenuDesign,
} from "../domain/designSchema";
import { MENU_DESIGN_CONSTRAINTS } from "../domain/designConstraints";
import { PREMIUM_MENU_DESIGNS, applyPremiumMenuDesign } from "../domain/menuDesignLibrary";
import MenuRenderer from "../renderer/MenuRenderer";
import { getBaselineDesignForMenu } from "./draftSession";
import MenuDesignLibraryFilters, { filterMenuDesigns } from "./MenuDesignLibraryFilters";
import "./MenuDesignControls.css";
import "./MenuDesignPresentationThumbnails.css";
import "./MenuDesignLibraryExperience.css";
import "./MenuDesignInspector.css";
import "./MenuDesignWorkspace.css";

const FAVORITES_STORAGE_KEY = "beyond-menu-design-favorites-v1";

const labels = {
  en:{library:"Design library",libraryHint:"45 real menu directions with structural differences, not just color skins.",search:"Search designs",restore:"Restore original design",restoreHint:"Return to the design this menu started with",brand:"Brand",colors:"Colors",typography:"Typography",layout:"Layout",uploadLogo:"Upload logo",replaceLogo:"Replace logo",logoSize:"Logo size",logoShape:"Logo shape",removeLogo:"Remove logo",heroBackground:"Menu header background",watermark:"Logo watermark",image:"Background image",none:"No image",watermarkHint:"Use the restaurant logo as the hero watermark.",imageHint:"Upload a separate image for the menu header background.",uploadBackground:"Upload background",replaceBackground:"Replace background",removeBackground:"Remove background",headingFont:"Heading font",bodyFont:"Body font",headingWeight:"Heading weight",itemWeight:"Item weight",text:"Main text",muted:"Secondary text",accent:"Accent",background:"Background",cards:"Cards",category:"Categories",categoryText:"Category text",density:"Density",navigation:"Category navigation",price:"Price position",imagePosition:"Image position",imageRatio:"Image ratio",noMatches:"No designs match these filters.",favorites:"Favorites",preview:"Preview",useDesign:"Use this design",selected:"Selected",closePreview:"Close preview",designPreview:"Design preview"},
  he:{library:"ספריית עיצובים",libraryHint:"45 כיווני תפריט אמיתיים עם מבנים שונים, לא רק החלפת צבעים.",search:"חיפוש עיצובים",restore:"שחזור העיצוב המקורי",restoreHint:"חזרה לעיצוב שממנו התפריט התחיל",brand:"מותג",colors:"צבעים",typography:"טיפוגרפיה",layout:"פריסה",uploadLogo:"העלאת לוגו",replaceLogo:"החלפת לוגו",logoSize:"גודל לוגו",logoShape:"צורת לוגו",removeLogo:"הסר לוגו",heroBackground:"רקע כותרת התפריט",watermark:"לוגו כסימן מים",image:"תמונת רקע",none:"ללא תמונה",watermarkHint:"השתמשו בלוגו המסעדה כסימן מים באזור הכותרת.",imageHint:"העלאת תמונה נפרדת כרקע לכותרת התפריט.",uploadBackground:"העלאת רקע",replaceBackground:"החלפת רקע",removeBackground:"הסר רקע",headingFont:"פונט כותרות",bodyFont:"פונט טקסט",headingWeight:"עובי כותרות",itemWeight:"עובי שמות פריטים",text:"טקסט ראשי",muted:"טקסט משני",accent:"צבע מוביל",background:"רקע",cards:"כרטיסים",category:"קטגוריות",categoryText:"טקסט קטגוריות",density:"צפיפות",navigation:"ניווט קטגוריות",price:"מיקום מחיר",imagePosition:"מיקום תמונה",imageRatio:"יחס תמונה",noMatches:"לא נמצאו עיצובים שמתאימים לסינון.",favorites:"מועדפים",preview:"תצוגה מלאה",useDesign:"השתמש בעיצוב",selected:"נבחר",closePreview:"סגור תצוגה",designPreview:"תצוגת עיצוב"},
  ar:{library:"مكتبة التصاميم",libraryHint:"45 اتجاهاً حقيقياً للقوائم ببنى مختلفة، وليس مجرد تغيير ألوان.",search:"البحث في التصاميم",restore:"استعادة التصميم الأصلي",restoreHint:"العودة إلى التصميم الذي بدأت به القائمة",brand:"العلامة",colors:"الألوان",typography:"الخطوط",layout:"التخطيط",uploadLogo:"رفع الشعار",replaceLogo:"استبدال الشعار",logoSize:"حجم الشعار",logoShape:"شكل الشعار",removeLogo:"إزالة الشعار",heroBackground:"خلفية عنوان القائمة",watermark:"الشعار كعلامة مائية",image:"صورة خلفية",none:"بدون صورة",watermarkHint:"استخدم شعار المطعم كعلامة مائية في منطقة العنوان.",imageHint:"ارفع صورة منفصلة لخلفية عنوان القائمة.",uploadBackground:"رفع الخلفية",replaceBackground:"استبدال الخلفية",removeBackground:"إزالة الخلفية",headingFont:"خط العناوين",bodyFont:"خط النص",headingWeight:"سماكة العناوين",itemWeight:"سماكة أسماء العناصر",text:"النص الرئيسي",muted:"النص الثانوي",accent:"اللون الرئيسي",background:"الخلفية",cards:"البطاقات",category:"الفئات",categoryText:"نص الفئات",density:"الكثافة",navigation:"تنقل الفئات",price:"موضع السعر",imagePosition:"موضع الصورة",imageRatio:"نسبة الصورة",noMatches:"لا توجد تصاميم مطابقة لهذه الفلاتر.",favorites:"المفضلة",preview:"معاينة كاملة",useDesign:"استخدم هذا التصميم",selected:"محدد",closePreview:"إغلاق المعاينة",designPreview:"معاينة التصميم"},
};

const inspectorCopy = {
  en:{customize:"Customize design",custom:"Custom design",liveHint:"Fine-tune the selected direction. Every change updates the menu live.",brandHint:"Logo, shape and menu header media.",colorsHint:"Start with a palette, then tune individual colors.",typeHint:"Choose the font pairing, weights and exact type scale.",layoutHint:"Control density, navigation, pricing, imagery and spacing.",logoAsset:"Restaurant logo",logoHelp:"PNG, JPG, WebP or SVG",palettePresets:"Palette presets",customColors:"Custom colors",fonts:"Font pairing",weights:"Font weights",typeScale:"Type scale",shapeSpacing:"Shape & spacing",imageCards:"Image cards",sectionGap:"Section gap",itemGap:"Item gap",cardPadding:"Card padding",cardRadius:"Card radius",heroSize:"Hero title",sectionSize:"Section title",itemNameSize:"Item name",descriptionSize:"Description",priceSize:"Price"},
  he:{customize:"התאמת העיצוב",custom:"עיצוב מותאם",liveHint:"כוונו את העיצוב שנבחר. כל שינוי מתעדכן מיד בתפריט.",brandHint:"לוגו, צורה ומדיה באזור הכותרת.",colorsHint:"התחילו מפלטה ולאחר מכן כוונו כל צבע בנפרד.",typeHint:"בחרו שילוב פונטים, משקלים וגדלי טקסט מדויקים.",layoutHint:"שליטה בצפיפות, ניווט, מחירים, תמונות ומרווחים.",logoAsset:"לוגו המסעדה",logoHelp:"PNG, JPG, WebP או SVG",palettePresets:"פלטות צבעים",customColors:"צבעים מותאמים",fonts:"שילוב פונטים",weights:"משקלי פונט",typeScale:"גדלי טקסט",shapeSpacing:"צורה ומרווחים",imageCards:"כרטיסי תמונה",sectionGap:"מרווח בין אזורים",itemGap:"מרווח בין פריטים",cardPadding:"ריווח בכרטיס",cardRadius:"עיגול כרטיס",heroSize:"כותרת ראשית",sectionSize:"כותרת אזור",itemNameSize:"שם פריט",descriptionSize:"תיאור",priceSize:"מחיר"},
  ar:{customize:"تخصيص التصميم",custom:"تصميم مخصص",liveHint:"اضبط الاتجاه المختار. كل تغيير يظهر مباشرة في القائمة.",brandHint:"الشعار والشكل ووسائط رأس القائمة.",colorsHint:"ابدأ بلوحة ألوان ثم اضبط كل لون بشكل منفصل.",typeHint:"اختر الخطوط والأوزان وأحجام النص بدقة.",layoutHint:"تحكم بالكثافة والتنقل والأسعار والصور والمسافات.",logoAsset:"شعار المطعم",logoHelp:"PNG أو JPG أو WebP أو SVG",palettePresets:"لوحات الألوان",customColors:"ألوان مخصصة",fonts:"تنسيق الخطوط",weights:"أوزان الخط",typeScale:"أحجام النص",shapeSpacing:"الشكل والمسافات",imageCards:"بطاقات الصور",sectionGap:"مسافة الأقسام",itemGap:"مسافة العناصر",cardPadding:"حشوة البطاقة",cardRadius:"استدارة البطاقة",heroSize:"العنوان الرئيسي",sectionSize:"عنوان القسم",itemNameSize:"اسم العنصر",descriptionSize:"الوصف",priceSize:"السعر"},
};

const workspaceCopy = {
  en:{templates:"Templates",templatesHint:"Choose a starting direction",customize:"Customize",customizeHint:"Brand, colors, type & layout",current:"Current design",customizeCurrent:"Customize",changeTemplate:"Change template"},
  he:{templates:"תבניות",templatesHint:"בחרו כיוון עיצובי",customize:"התאמה",customizeHint:"מותג, צבעים, טיפוגרפיה ופריסה",current:"העיצוב הנוכחי",customizeCurrent:"התאמה",changeTemplate:"החלפת תבנית"},
  ar:{templates:"القوالب",templatesHint:"اختر نقطة بداية",customize:"تخصيص",customizeHint:"العلامة والألوان والخطوط والتخطيط",current:"التصميم الحالي",customizeCurrent:"تخصيص",changeTemplate:"تغيير القالب"},
};

const IMAGE_LAYOUT_TEMPLATES=new Set(["visual","gallery","tiles","split"]);
const titleCase=value=>String(value).replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const comparable=value=>JSON.stringify(normalizeMenuDesign(value||{}));
const previewLayout=entry=>entry.design?.layout?.presentation&&entry.design.layout.presentation!=="standard"?entry.design.layout.presentation:entry.design.template;
const paletteMatches=(theme,preset)=>Object.entries(preset?.theme||{}).every(([key,value])=>theme?.[key]===value);

function ColorField({label,value,onChange}){
  return <label className="studio-v3-design-color"><span>{label}</span><span className="studio-v3-design-color-input"><code>{value}</code><input type="color" value={value} onChange={e=>onChange(e.target.value)}/></span></label>;
}

function RangeField({label,value,min,max,onChange,suffix="px"}){
  return <label className="studio-v3-inspector-range"><span className="studio-v3-inspector-range-head"><span>{label}</span><b>{value}{suffix}</b></span><input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>;
}

function FontField({label,value,onChange}){
  return <label className="studio-v3-font-field"><span>{label}</span><span className="studio-v3-font-picker"><b className="studio-v3-font-sample" style={{fontFamily:value}}>Aa</b><select value={value} onChange={e=>onChange(e.target.value)}>{MENU_FONT_FAMILIES.map(option=><option key={option} value={option}>{option}</option>)}</select></span></label>;
}

function DesignThumbnail({entry}){
  const [background,accent,text]=entry.swatches;
  return <span className={`studio-v3-premium-design-preview layout-${previewLayout(entry)}`} style={{"--thumb-bg":background,"--thumb-accent":accent,"--thumb-text":text}}><span className="studio-v3-thumb-hero"/><span className="studio-v3-thumb-nav"><i/><i/><i/></span><span className="studio-v3-thumb-items"><i/><i/><i/><i/></span></span>;
}

function presetMatches(current,preset){
  if(!current||!preset)return false;
  if(preset.template&&current.template!==preset.template)return false;
  if(preset.styleVariant&&current.styleVariant!==preset.styleVariant)return false;
  return ["theme","typography","layout","brand","badges"].every(section=>Object.entries(preset[section]||{}).every(([key,value])=>current?.[section]?.[key]===value));
}

function readFavorites(){
  if(typeof window==="undefined")return [];
  try{const parsed=JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY)||"[]");return Array.isArray(parsed)?parsed.filter(Boolean):[];}catch{return [];}
}

export default function MenuDesignControls({design,baselineDesign,menu,language="en",panel,setPanel,patchDesign}){
  const l=labels[language]||labels.en;
  const c=inspectorCopy[language]||inspectorCopy.en;
  const w=workspaceCopy[language]||workspaceCopy.en;
  const [workspaceMode,setWorkspaceMode]=useState("templates");
  const [query,setQuery]=useState("");
  const [filters,setFilters]=useState({browse:"all",type:"all",layout:"all",tone:"all"});
  const [previewEntry,setPreviewEntry]=useState(null);
  const [favorites,setFavorites]=useState(readFavorites);
  const [favoritesOnly,setFavoritesOnly]=useState(false);

  const patchTheme=(key,value)=>patchDesign(current=>({...current,theme:{...current.theme,[key]:value}}));
  const patchType=(key,value)=>patchDesign(current=>({...current,typography:{...current.typography,[key]:value}}));
  const patchLayout=(key,value)=>patchDesign(current=>({...current,layout:{...current.layout,[key]:value}}));
  const patchBrand=(key,value)=>patchDesign(current=>({...current,brand:{...current.brand,[key]:value}}));

  const logo=Object.prototype.hasOwnProperty.call(design.brand||{},"logoUrl")?design.brand.logoUrl:(menu?.logo_url||"");
  const heroMode=design.brand?.heroMediaMode||"watermark";
  const heroImage=design.brand?.heroImageUrl||"";
  const baseline=baselineDesign||getBaselineDesignForMenu(menu);
  const original=baseline?normalizeMenuDesign(baseline):null;
  const isOriginal=Boolean(original&&comparable(design)===comparable(original));
  const activeDesignId=useMemo(()=>PREMIUM_MENU_DESIGNS.find(entry=>presetMatches(design,entry.design))?.id||"",[design]);
  const activeDesign=useMemo(()=>PREMIUM_MENU_DESIGNS.find(entry=>entry.id===activeDesignId)||null,[activeDesignId]);
  const activePaletteKey=useMemo(()=>Object.entries(MENU_COLOR_PRESETS).find(([,preset])=>paletteMatches(design.theme,preset))?.[0]||"",[design.theme]);
  const filteredDesigns=useMemo(()=>{
    const matches=filterMenuDesigns(PREMIUM_MENU_DESIGNS,{query,...filters});
    return favoritesOnly?matches.filter(entry=>favorites.includes(entry.id)):matches;
  },[query,filters,favoritesOnly,favorites]);
  const previewDesign=useMemo(()=>previewEntry?applyPremiumMenuDesign(design,previewEntry.id):null,[design,previewEntry]);
  const currentDesignName=activeDesign?.name||`${titleCase(design.template)} · ${c.custom}`;
  const currentDesignDetail=activeDesign?`${activeDesign.layout} · ${activeDesign.category}`:c.liveHint;
  const panelMeta={
    brand:{icon:"✦",title:l.brand,hint:c.brandHint},
    colors:{icon:"◉",title:l.colors,hint:c.colorsHint},
    type:{icon:"Aa",title:l.typography,hint:c.typeHint},
    layout:{icon:"⌗",title:l.layout,hint:c.layoutHint},
  }[panel]||{icon:"✦",title:l.brand,hint:c.brandHint};

  useEffect(()=>{
    try{window.localStorage.setItem(FAVORITES_STORAGE_KEY,JSON.stringify(favorites));}catch{}
  },[favorites]);

  useEffect(()=>{
    if(!previewEntry)return undefined;
    const previousOverflow=document.body.style.overflow;
    const onKeyDown=event=>{if(event.key==="Escape")setPreviewEntry(null);};
    document.body.style.overflow="hidden";
    window.addEventListener("keydown",onKeyDown);
    return ()=>{document.body.style.overflow=previousOverflow;window.removeEventListener("keydown",onKeyDown);};
  },[previewEntry]);

  function uploadImage(file,key){
    if(!file||!file.type?.startsWith("image/"))return;
    const reader=new FileReader();
    reader.onload=()=>patchBrand(key,String(reader.result||""));
    reader.readAsDataURL(file);
  }

  function chooseDesign(entry,{openCustomize=false}={}){
    patchDesign(current=>applyPremiumMenuDesign(current,entry.id));
    if(openCustomize)setWorkspaceMode("customize");
  }

  function toggleFavorite(entryId){
    setFavorites(current=>current.includes(entryId)?current.filter(id=>id!==entryId):[...current,entryId]);
  }

  function usePreviewDesign(){
    if(!previewEntry)return;
    chooseDesign(previewEntry,{openCustomize:true});
    setPreviewEntry(null);
  }

  return <div className="studio-v3-design-pro-controls">
    <div className="studio-v3-design-workspace-nav" role="tablist" aria-label={l.library}>
      <button type="button" role="tab" aria-selected={workspaceMode==="templates"} className={workspaceMode==="templates"?"active":""} onClick={()=>setWorkspaceMode("templates")}>
        <span className="studio-v3-design-workspace-nav-icon" aria-hidden="true">▦</span>
        <span className="studio-v3-design-workspace-nav-copy"><strong>{w.templates}</strong><small>{w.templatesHint}</small></span>
      </button>
      <button type="button" role="tab" aria-selected={workspaceMode==="customize"} className={workspaceMode==="customize"?"active":""} onClick={()=>setWorkspaceMode("customize")}>
        <span className="studio-v3-design-workspace-nav-icon" aria-hidden="true">✦</span>
        <span className="studio-v3-design-workspace-nav-copy"><strong>{w.customize}</strong><small>{w.customizeHint}</small></span>
      </button>
    </div>

    {workspaceMode==="templates"?<div className="studio-v3-template-workspace">
      <div className="studio-v3-current-design-strip">
        <span className="studio-v3-current-design-mini" style={{"--current-bg":design.theme.background,"--current-accent":design.theme.accent,"--current-text":design.theme.text}} aria-hidden="true"/>
        <span className="studio-v3-current-design-copy"><span>{w.current}</span><strong>{currentDesignName}</strong><small>{currentDesignDetail}</small></span>
        <button type="button" className="studio-v3-current-design-customize" onClick={()=>setWorkspaceMode("customize")}>{w.customizeCurrent}</button>
      </div>

      <section className="studio-v3-design-library">
        <div className="studio-v3-design-library-head"><div><strong>{l.library}</strong><p>{l.libraryHint}</p></div><span className="studio-v3-design-count">{PREMIUM_MENU_DESIGNS.length}</span></div>
        <label className="studio-v3-design-search"><span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={l.search}/></label>
        <MenuDesignLibraryFilters language={language} filters={filters} setFilters={setFilters} resultCount={filteredDesigns.length} totalCount={PREMIUM_MENU_DESIGNS.length}/>
        <button type="button" className={`studio-v3-design-favorites-toggle ${favoritesOnly?"active":""}`} onClick={()=>setFavoritesOnly(value=>!value)}><span aria-hidden="true">♥</span><span>{l.favorites}</span><b>{favorites.length}</b></button>
        <button type="button" className={`studio-v3-original-design ${isOriginal?"active":""}`} disabled={!original} onClick={()=>original&&patchDesign(()=>original)}><span><strong>{l.restore}</strong><small>{l.restoreHint}</small></span><span aria-hidden="true">↺</span></button>
        <div className="studio-v3-premium-library-grid">
          {filteredDesigns.map(entry=>{
            const selected=activeDesignId===entry.id;
            const favorite=favorites.includes(entry.id);
            return <article className={`studio-v3-premium-design-card layout-${previewLayout(entry)} ${selected?"selected":""}`} key={entry.id}>
              {selected?<span className="studio-v3-design-selected-badge" aria-label={l.selected}>✓</span>:null}
              <button type="button" className="studio-v3-premium-design-select" onClick={()=>chooseDesign(entry)} aria-pressed={selected}>
                <DesignThumbnail entry={entry}/>
                <span className="studio-v3-premium-design-copy"><span><strong>{entry.name}</strong><small>{entry.layout}</small></span><em>{entry.description}</em><span className="studio-v3-design-category">{entry.category}</span></span>
              </button>
              <div className="studio-v3-premium-design-actions">
                <button type="button" className={`studio-v3-design-favorite ${favorite?"active":""}`} onClick={()=>toggleFavorite(entry.id)} aria-label={l.favorites} aria-pressed={favorite}><span aria-hidden="true">{favorite?"♥":"♡"}</span></button>
                <button type="button" className="studio-v3-design-preview-button" onClick={()=>setPreviewEntry(entry)} disabled={!menu}><span aria-hidden="true">⛶</span>{l.preview}</button>
              </div>
            </article>;
          })}
        </div>
        {!filteredDesigns.length?<div className="studio-v3-design-library-empty">{l.noMatches}</div>:null}
      </section>
    </div>:null}

    {workspaceMode==="customize"?<div className="studio-v3-customize-workspace">
      <section className="studio-v3-inspector-shell">
        <div className="studio-v3-inspector-summary">
          <div className="studio-v3-inspector-summary-copy"><div className="studio-v3-inspector-kicker">{c.customize}</div><strong>{currentDesignName}</strong><small>{c.liveHint}</small></div>
          <div className="studio-v3-inspector-summary-actions"><span className="studio-v3-inspector-summary-swatches" aria-hidden="true"><i style={{background:design.theme.background}}/><i style={{background:design.theme.accent}}/><i style={{background:design.theme.text}}/></span><button type="button" className="studio-v3-change-template-button" onClick={()=>setWorkspaceMode("templates")}>{w.changeTemplate}</button></div>
        </div>

        <div className="studio-v3-design-tabs">{[["brand","✦",l.brand],["colors","◉",l.colors],["type","Aa",l.typography],["layout","⌗",l.layout]].map(([key,icon,label])=><button type="button" key={key} className={panel===key?"active":""} onClick={()=>setPanel(key)}><span className="studio-v3-design-tab-icon">{icon}</span><span className="studio-v3-design-tab-label">{label}</span></button>)}</div>

        <div className="studio-v3-inspector-panel-head"><span aria-hidden="true">{panelMeta.icon}</span><div><strong>{panelMeta.title}</strong><small>{panelMeta.hint}</small></div></div>

        {panel==="brand"?<div className="studio-v3-design-section studio-v3-inspector-panel">
          <section className="studio-v3-inspector-block">
            <div className="studio-v3-inspector-block-title"><span>{c.logoAsset}</span><small>{c.logoHelp}</small></div>
            <div className="studio-v3-inspector-logo-card">
              <div className="studio-v3-inspector-logo-preview">{logo?<img src={logo} alt=""/>:<span className="studio-v3-inspector-logo-placeholder">LOGO</span>}</div>
              <div className="studio-v3-inspector-logo-actions"><label className="studio-v3-inspector-upload"><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e=>uploadImage(e.target.files?.[0],"logoUrl")}/><span>{logo?l.replaceLogo:l.uploadLogo}</span></label><button className="studio-v3-inspector-remove" type="button" disabled={!logo} onClick={()=>patchBrand("logoUrl","")}>{l.removeLogo}</button></div>
            </div>
            <RangeField label={l.logoSize} value={design.brand.logoSize} min={24} max={120} onChange={value=>patchBrand("logoSize",value)}/>
            <div className="studio-v3-inspector-block-title"><span>{l.logoShape}</span></div>
            <div className="studio-v3-shape-grid">{["free","rounded","circle","square"].map(value=><button type="button" key={value} className={`studio-v3-shape-choice shape-${value} ${design.brand.logoShape===value?"active":""}`} onClick={()=>patchBrand("logoShape",value)}><i aria-hidden="true">B</i><span>{titleCase(value)}</span></button>)}</div>
          </section>

          <section className="studio-v3-inspector-block">
            <div className="studio-v3-inspector-block-title"><span>{l.heroBackground}</span></div>
            <div className="studio-v3-hero-mode-grid">{[["watermark","◎",l.watermark],["image","▧",l.image],["none","—",l.none]].map(([value,icon,label])=><button type="button" key={value} className={`studio-v3-visual-choice ${heroMode===value?"active":""}`} onClick={()=>patchBrand("heroMediaMode",value)}><i aria-hidden="true">{icon}</i><span>{label}</span></button>)}</div>
            {heroMode==="watermark"?<p className="studio-v3-inspector-help">{l.watermarkHint}</p>:null}
            {heroMode==="image"?<div className="studio-v3-inspector-logo-actions"><p className="studio-v3-inspector-help">{l.imageHint}</p>{heroImage?<img className="studio-v3-inspector-background-preview" src={heroImage} alt=""/>:null}<label className="studio-v3-inspector-upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadImage(e.target.files?.[0],"heroImageUrl")}/><span>{heroImage?l.replaceBackground:l.uploadBackground}</span></label>{heroImage?<button className="studio-v3-inspector-remove" type="button" onClick={()=>patchBrand("heroImageUrl","")}>{l.removeBackground}</button>:null}</div>:null}
          </section>
        </div>:null}

        {panel==="colors"?<div className="studio-v3-design-section studio-v3-inspector-panel">
          <section className="studio-v3-inspector-block">
            <div className="studio-v3-inspector-block-title"><span>{c.palettePresets}</span></div>
            <div className="studio-v3-inspector-palette-grid">{Object.entries(MENU_COLOR_PRESETS).map(([key,preset])=><button type="button" key={key} className={`studio-v3-inspector-palette ${activePaletteKey===key?"active":""}`} onClick={()=>patchDesign(current=>applyMenuColorPreset(current,key))}><span className="studio-v3-inspector-palette-swatches">{[preset.theme.background,preset.theme.card,preset.theme.accent,preset.theme.text,preset.theme.categoryBackground].map((color,index)=><i key={`${color}-${index}`} style={{background:color}}/>)}</span><strong>{preset.label}</strong></button>)}</div>
          </section>
          <section className="studio-v3-inspector-block">
            <div className="studio-v3-inspector-block-title"><span>{c.customColors}</span></div>
            <div className="studio-v3-inspector-color-grid"><ColorField label={l.background} value={design.theme.background} onChange={value=>patchTheme("background",value)}/><ColorField label={l.cards} value={design.theme.card} onChange={value=>patchTheme("card",value)}/><ColorField label={l.text} value={design.theme.text} onChange={value=>patchTheme("text",value)}/><ColorField label={l.muted} value={design.theme.muted} onChange={value=>patchTheme("muted",value)}/><ColorField label={l.accent} value={design.theme.accent} onChange={value=>patchTheme("accent",value)}/><ColorField label={l.category} value={design.theme.categoryBackground} onChange={value=>patchTheme("categoryBackground",value)}/><ColorField label={l.categoryText} value={design.theme.categoryText} onChange={value=>patchTheme("categoryText",value)}/></div>
          </section>
        </div>:null}

        {panel==="type"?<div className="studio-v3-design-section studio-v3-inspector-panel">
          <section className="studio-v3-inspector-block">
            <div className="studio-v3-inspector-block-title"><span>{c.fonts}</span></div>
            <div className="studio-v3-font-grid"><FontField label={l.headingFont} value={design.typography.headingFont} onChange={value=>patchType("headingFont",value)}/><FontField label={l.bodyFont} value={design.typography.bodyFont} onChange={value=>patchType("bodyFont",value)}/></div>
          </section>
          <section className="studio-v3-inspector-block">
            <div className="studio-v3-inspector-block-title"><span>{c.weights}</span></div>
            <div className="studio-v3-design-control-label">{l.headingWeight}</div><div className="studio-v3-weight-grid">{MENU_FONT_WEIGHTS.map(value=><button type="button" key={value} className={`studio-v3-weight-choice ${design.typography.headingWeight===value?"active":""}`} style={{fontWeight:value}} onClick={()=>patchType("headingWeight",value)}>{value}</button>)}</div>
            <div className="studio-v3-design-control-label">{l.itemWeight}</div><div className="studio-v3-weight-grid">{MENU_FONT_WEIGHTS.map(value=><button type="button" key={value} className={`studio-v3-weight-choice ${design.typography.itemWeight===value?"active":""}`} style={{fontWeight:value}} onClick={()=>patchType("itemWeight",value)}>{value}</button>)}</div>
          </section>
          <section className="studio-v3-inspector-block">
            <div className="studio-v3-inspector-block-title"><span>{c.typeScale}</span></div>
            <div className="studio-v3-type-scale"><RangeField label={c.heroSize} value={design.typography.heroSize} min={MENU_DESIGN_CONSTRAINTS.typography.heroSize.min} max={MENU_DESIGN_CONSTRAINTS.typography.heroSize.max} onChange={value=>patchType("heroSize",value)}/><RangeField label={c.sectionSize} value={design.typography.sectionSize} min={MENU_DESIGN_CONSTRAINTS.typography.sectionSize.min} max={MENU_DESIGN_CONSTRAINTS.typography.sectionSize.max} onChange={value=>patchType("sectionSize",value)}/><RangeField label={c.itemNameSize} value={design.typography.itemNameSize} min={MENU_DESIGN_CONSTRAINTS.typography.itemNameSize.min} max={MENU_DESIGN_CONSTRAINTS.typography.itemNameSize.max} onChange={value=>patchType("itemNameSize",value)}/><RangeField label={c.descriptionSize} value={design.typography.descriptionSize} min={MENU_DESIGN_CONSTRAINTS.typography.descriptionSize.min} max={MENU_DESIGN_CONSTRAINTS.typography.descriptionSize.max} onChange={value=>patchType("descriptionSize",value)}/><RangeField label={c.priceSize} value={design.typography.priceSize} min={MENU_DESIGN_CONSTRAINTS.typography.priceSize.min} max={MENU_DESIGN_CONSTRAINTS.typography.priceSize.max} onChange={value=>patchType("priceSize",value)}/></div>
          </section>
        </div>:null}

        {panel==="layout"?<div className="studio-v3-design-section studio-v3-inspector-panel">
          <section className="studio-v3-inspector-block">
            <div className="studio-v3-inspector-block-title"><span>{l.density}</span></div>
            <div className="studio-v3-option-grid">{["compact","comfortable","spacious"].map(value=><button type="button" key={value} className={`studio-v3-layout-choice density-${value} ${design.layout.density===value?"active":""}`} onClick={()=>patchLayout("density",value)}><i aria-hidden="true"/><span>{titleCase(value)}</span></button>)}</div>
          </section>
          <section className="studio-v3-inspector-block">
            <div className="studio-v3-inspector-block-title"><span>{l.navigation}</span></div>
            <div className="studio-v3-option-grid">{["pills","underline","minimal"].map(value=><button type="button" key={value} className={`studio-v3-layout-choice nav-${value} ${design.layout.navigationStyle===value?"active":""}`} onClick={()=>patchLayout("navigationStyle",value)}><i aria-hidden="true"/><span>{titleCase(value)}</span></button>)}</div>
          </section>
          <section className="studio-v3-inspector-block">
            <div className="studio-v3-inspector-block-title"><span>{l.price}</span></div>
            <div className="studio-v3-option-grid">{["inline","below","bottom"].map(value=><button type="button" key={value} className={`studio-v3-layout-choice price-${value} ${design.layout.pricePosition===value?"active":""}`} onClick={()=>patchLayout("pricePosition",value)}><i aria-hidden="true"/><span>{titleCase(value)}</span></button>)}</div>
          </section>
          {IMAGE_LAYOUT_TEMPLATES.has(design.template)?<section className="studio-v3-inspector-block">
            <div className="studio-v3-inspector-block-title"><span>{c.imageCards}</span></div>
            <div className="studio-v3-design-control-label">{l.imagePosition}</div><div className="studio-v3-option-grid">{["top","left","right"].map(value=><button type="button" key={value} className={`studio-v3-layout-choice image-${value} ${design.layout.itemImagePosition===value?"active":""}`} onClick={()=>patchLayout("itemImagePosition",value)}><i aria-hidden="true"/><span>{titleCase(value)}</span></button>)}</div>
            <div className="studio-v3-design-control-label">{l.imageRatio}</div><div className="studio-v3-option-grid ratios">{["1:1","4:3","3:2","16:9"].map(value=><button type="button" key={value} className={`studio-v3-layout-choice ratio-${value.replace(":","-")} ${design.layout.itemImageRatio===value?"active":""}`} onClick={()=>patchLayout("itemImageRatio",value)}><i aria-hidden="true"/><span>{value}</span></button>)}</div>
          </section>:null}
          <section className="studio-v3-inspector-block">
            <div className="studio-v3-inspector-block-title"><span>{c.shapeSpacing}</span></div>
            <div className="studio-v3-radius-row"><RangeField label={c.cardRadius} value={design.layout.cardRadius} min={MENU_DESIGN_CONSTRAINTS.radius.min} max={MENU_DESIGN_CONSTRAINTS.radius.max} onChange={value=>patchLayout("cardRadius",value)}/><span className="studio-v3-radius-preview" style={{borderRadius:design.layout.cardRadius}} aria-hidden="true"/></div>
            <RangeField label={c.sectionGap} value={design.layout.sectionGap} min={MENU_DESIGN_CONSTRAINTS.spacing.sectionGap.min} max={MENU_DESIGN_CONSTRAINTS.spacing.sectionGap.max} onChange={value=>patchLayout("sectionGap",value)}/>
            <RangeField label={c.itemGap} value={design.layout.itemGap} min={MENU_DESIGN_CONSTRAINTS.spacing.itemGap.min} max={MENU_DESIGN_CONSTRAINTS.spacing.itemGap.max} onChange={value=>patchLayout("itemGap",value)}/>
            <RangeField label={c.cardPadding} value={design.layout.cardPadding} min={MENU_DESIGN_CONSTRAINTS.spacing.cardPadding.min} max={MENU_DESIGN_CONSTRAINTS.spacing.cardPadding.max} onChange={value=>patchLayout("cardPadding",value)}/>
          </section>
        </div>:null}
      </section>
    </div>:null}

    {previewEntry&&previewDesign&&menu?<div className="studio-v3-design-preview-overlay" role="dialog" aria-modal="true" aria-label={`${l.designPreview}: ${previewEntry.name}`} onMouseDown={event=>{if(event.target===event.currentTarget)setPreviewEntry(null);}}>
      <div className="studio-v3-design-preview-shell">
        <header className="studio-v3-design-preview-toolbar">
          <button type="button" className="studio-v3-design-preview-close" onClick={()=>setPreviewEntry(null)} aria-label={l.closePreview}>×</button>
          <div className="studio-v3-design-preview-title"><span>{l.designPreview}</span><strong>{previewEntry.name}</strong><small>{previewEntry.layout} · {previewEntry.category}</small></div>
          <button type="button" className="studio-v3-design-preview-use" onClick={usePreviewDesign}>{l.useDesign}</button>
        </header>
        <div className="studio-v3-design-preview-stage"><div className="studio-v3-design-preview-page"><MenuRenderer menu={menu} design={previewDesign} initialLanguage={language}/></div></div>
      </div>
    </div>:null}
  </div>;
}
