import { useEffect, useMemo, useRef, useState } from "react";
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
const IMAGE_LAYOUT_TEMPLATES = new Set(["visual","gallery","tiles","split"]);
const FEELING_DESIGNS = [
  { id:"blue-launcher", key:"modern", icon:"◫" },
  { id:"atelier-editorial", key:"elegant", icon:"Aa" },
  { id:"street-bold", key:"bold", icon:"●" },
  { id:"nordic-paper", key:"editorial", icon:"▤" },
  { id:"noir-gallery", key:"dark", icon:"◐" },
  { id:"family-pizzeria", key:"playful", icon:"✦" },
];
const TYPE_PRESETS = Object.freeze({
  elegant:{ headingFont:"Playfair Display", bodyFont:"Inter", headingWeight:700, itemWeight:600 },
  modern:{ headingFont:"DM Sans", bodyFont:"Inter", headingWeight:800, itemWeight:700 },
  bold:{ headingFont:"Montserrat", bodyFont:"DM Sans", headingWeight:800, itemWeight:800 },
  friendly:{ headingFont:"Poppins", bodyFont:"DM Sans", headingWeight:700, itemWeight:700 },
});

const COPY = {
  en:{
    design:"Design",quick:"Quick style",styles:"Designs",advanced:"Advanced",quickHint:"Make it yours without learning design tools",stylesHint:"Browse every design direction",advancedHint:"Precise controls when you need them",template:"Template",modified:"Modified",undo:"Undo",redo:"Redo",
    recommended:"Recommended directions",recommendedHint:"Start with a feeling. You can fine-tune it afterwards.",makeYours:"Make it yours",makeYoursHint:"The controls below cover the changes most restaurants actually need.",browseAll:"Browse all designs",openAdvanced:"Advanced controls",current:"Current design",changeDesign:"Change design",
    colors:"Colors",typography:"Typography",hero:"Hero & header",density:"Spacing",compact:"Compact",balanced:"Balanced",spacious:"Spacious",logo:"Logo",photo:"Photo",clean:"Clean",templateHero:"Template",heroHint:"Use a dedicated hero photo, your logo, or remove the hero for a clean header.",photoHint:"Hero photos are separate from menu item photos.",uploadHero:"Upload hero image",replaceHero:"Replace hero image",removeHero:"Remove hero image",
    modern:"Modern",elegant:"Elegant",bold:"Bold",editorial:"Editorial",dark:"Dark",playful:"Playful",friendly:"Friendly",
    clickPreview:"Click anything in the live preview to edit it",editing:"Editing",brand:"Brand",categories:"Categories",items:"Menu items",badges:"Badges",colorsPanel:"Colors",typePanel:"Type",layout:"Layout",backQuick:"Back to quick style",
    library:"All menu designs",libraryHint:"Explore the complete library when you want a very specific direction.",search:"Search designs",favorites:"Favorites",restore:"Restore original design",restoreHint:"Return to the design this menu started with",preview:"Preview",useDesign:"Use this design",selected:"Selected",closePreview:"Close preview",designPreview:"Design preview",noMatches:"No designs match these filters.",
    logoAsset:"Restaurant logo",logoHelp:"PNG, JPG, WebP or SVG",uploadLogo:"Upload logo",replaceLogo:"Replace logo",removeLogo:"Remove logo",logoSize:"Logo size",logoShape:"Logo shape",watermark:"Logo",image:"Photo",none:"Clean",headingFont:"Heading font",bodyFont:"Body font",headingWeight:"Heading weight",itemWeight:"Item weight",text:"Main text",muted:"Secondary text",accent:"Accent",background:"Background",cards:"Cards",category:"Categories",categoryText:"Category text",navigation:"Category navigation",price:"Price position",imagePosition:"Image position",imageRatio:"Image ratio",badgeSymbols:"Badge symbols",iconText:"Icon + text",textOnly:"Text only",badgeStyle:"Badge style",autoStyle:"Auto",minimalStyle:"Minimal",filledStyle:"Filled",playfulStyle:"Playful",
    palettePresets:"Palette presets",customColors:"Custom colors",fonts:"Font pairing",weights:"Font weights",typeScale:"Type scale",shapeSpacing:"Shape & spacing",imageCards:"Image cards",sectionGap:"Section gap",itemGap:"Item gap",cardPadding:"Card padding",cardRadius:"Card radius",heroSize:"Hero title",sectionSize:"Section title",itemNameSize:"Item name",descriptionSize:"Description",priceSize:"Price",badgeDisplay:"Badge content",badgeAppearance:"Visual style",badgeAutoHint:"Auto follows the selected menu template.",
  },
  he:{
    design:"עיצוב",quick:"עיצוב מהיר",styles:"עיצובים",advanced:"מתקדם",quickHint:"התאימו את התפריט בלי ללמוד כלי עיצוב",stylesHint:"עיינו בכל כיווני העיצוב",advancedHint:"שליטה מדויקת כשצריך",template:"תבנית",modified:"שונה",undo:"בטל",redo:"בצע שוב",
    recommended:"כיוונים מומלצים",recommendedHint:"התחילו מתחושה. אחר כך אפשר לדייק כל פרט.",makeYours:"הפכו אותו לשלכם",makeYoursHint:"אלה השינויים שרוב המסעדות באמת צריכות.",browseAll:"כל העיצובים",openAdvanced:"בקרות מתקדמות",current:"העיצוב הנוכחי",changeDesign:"החלפת עיצוב",
    colors:"צבעים",typography:"טיפוגרפיה",hero:"Hero וכותרת",density:"מרווחים",compact:"צפוף",balanced:"מאוזן",spacious:"מרווח",logo:"לוגו",photo:"תמונה",clean:"נקי",templateHero:"תבנית",heroHint:"בחרו תמונת Hero, לוגו, או הסירו את אזור ה-Hero לכותרת נקייה.",photoHint:"תמונת Hero נפרדת מתמונות המנות.",uploadHero:"העלאת תמונת Hero",replaceHero:"החלפת תמונת Hero",removeHero:"הסרת תמונת Hero",
    modern:"מודרני",elegant:"אלגנטי",bold:"נועז",editorial:"מערכתי",dark:"כהה",playful:"שובב",friendly:"ידידותי",
    clickPreview:"לחצו על כל חלק בתצוגה החיה כדי לערוך אותו",editing:"עריכה",brand:"מותג",categories:"קטגוריות",items:"פריטי תפריט",badges:"תגיות",colorsPanel:"צבעים",typePanel:"טיפוגרפיה",layout:"פריסה",backQuick:"חזרה לעיצוב מהיר",
    library:"כל עיצובי התפריט",libraryHint:"עיינו בספרייה המלאה כשאתם רוצים כיוון מאוד מסוים.",search:"חיפוש עיצובים",favorites:"מועדפים",restore:"שחזור העיצוב המקורי",restoreHint:"חזרה לעיצוב שממנו התפריט התחיל",preview:"תצוגה מלאה",useDesign:"השתמש בעיצוב",selected:"נבחר",closePreview:"סגור תצוגה",designPreview:"תצוגת עיצוב",noMatches:"לא נמצאו עיצובים מתאימים.",
    logoAsset:"לוגו המסעדה",logoHelp:"PNG, JPG, WebP או SVG",uploadLogo:"העלאת לוגו",replaceLogo:"החלפת לוגו",removeLogo:"הסר לוגו",logoSize:"גודל לוגו",logoShape:"צורת לוגו",watermark:"לוגו",image:"תמונה",none:"נקי",headingFont:"פונט כותרות",bodyFont:"פונט טקסט",headingWeight:"עובי כותרות",itemWeight:"עובי שמות פריטים",text:"טקסט ראשי",muted:"טקסט משני",accent:"צבע מוביל",background:"רקע",cards:"כרטיסים",category:"קטגוריות",categoryText:"טקסט קטגוריות",navigation:"ניווט קטגוריות",price:"מיקום מחיר",imagePosition:"מיקום תמונה",imageRatio:"יחס תמונה",badgeSymbols:"סמלים בתגיות",iconText:"סמל + טקסט",textOnly:"טקסט בלבד",badgeStyle:"סגנון תגיות",autoStyle:"אוטומטי",minimalStyle:"מינימלי",filledStyle:"מלא",playfulStyle:"שובב",
    palettePresets:"פלטות צבעים",customColors:"צבעים מותאמים",fonts:"שילוב פונטים",weights:"משקלי פונט",typeScale:"גדלי טקסט",shapeSpacing:"צורה ומרווחים",imageCards:"כרטיסי תמונה",sectionGap:"מרווח בין אזורים",itemGap:"מרווח בין פריטים",cardPadding:"ריווח בכרטיס",cardRadius:"עיגול כרטיס",heroSize:"כותרת ראשית",sectionSize:"כותרת אזור",itemNameSize:"שם פריט",descriptionSize:"תיאור",priceSize:"מחיר",badgeDisplay:"תוכן התגיות",badgeAppearance:"סגנון חזותי",badgeAutoHint:"אוטומטי עוקב אחרי תבנית התפריט.",
  },
  ar:{
    design:"التصميم",quick:"تنسيق سريع",styles:"التصاميم",advanced:"متقدم",quickHint:"خصص قائمتك بدون تعلم أدوات التصميم",stylesHint:"استعرض جميع اتجاهات التصميم",advancedHint:"تحكم دقيق عند الحاجة",template:"قالب",modified:"معدل",undo:"تراجع",redo:"إعادة",
    recommended:"اتجاهات مقترحة",recommendedHint:"ابدأ بالإحساس ثم عدّل التفاصيل لاحقاً.",makeYours:"اجعله خاصاً بك",makeYoursHint:"هذه هي التغييرات التي تحتاجها معظم المطاعم فعلاً.",browseAll:"كل التصاميم",openAdvanced:"أدوات متقدمة",current:"التصميم الحالي",changeDesign:"تغيير التصميم",
    colors:"الألوان",typography:"الخطوط",hero:"الواجهة والعنوان",density:"المسافات",compact:"مضغوط",balanced:"متوازن",spacious:"واسع",logo:"الشعار",photo:"صورة",clean:"نظيف",templateHero:"القالب",heroHint:"استخدم صورة واجهة أو الشعار أو أزل قسم الواجهة لعنوان نظيف.",photoHint:"صورة الواجهة منفصلة عن صور عناصر القائمة.",uploadHero:"رفع صورة الواجهة",replaceHero:"استبدال صورة الواجهة",removeHero:"إزالة صورة الواجهة",
    modern:"حديث",elegant:"أنيق",bold:"جريء",editorial:"تحريري",dark:"داكن",playful:"مرح",friendly:"ودود",
    clickPreview:"انقر على أي جزء من المعاينة لتعديله",editing:"تعديل",brand:"العلامة",categories:"الفئات",items:"عناصر القائمة",badges:"الشارات",colorsPanel:"الألوان",typePanel:"الخطوط",layout:"التخطيط",backQuick:"العودة للتنسيق السريع",
    library:"كل تصاميم القائمة",libraryHint:"استعرض المكتبة الكاملة عندما تريد اتجاهاً محدداً جداً.",search:"البحث في التصاميم",favorites:"المفضلة",restore:"استعادة التصميم الأصلي",restoreHint:"العودة إلى التصميم الذي بدأت به القائمة",preview:"معاينة",useDesign:"استخدم التصميم",selected:"محدد",closePreview:"إغلاق",designPreview:"معاينة التصميم",noMatches:"لا توجد تصاميم مطابقة.",
    logoAsset:"شعار المطعم",logoHelp:"PNG أو JPG أو WebP أو SVG",uploadLogo:"رفع الشعار",replaceLogo:"استبدال الشعار",removeLogo:"إزالة الشعار",logoSize:"حجم الشعار",logoShape:"شكل الشعار",watermark:"شعار",image:"صورة",none:"نظيف",headingFont:"خط العناوين",bodyFont:"خط النص",headingWeight:"سماكة العناوين",itemWeight:"سماكة أسماء العناصر",text:"النص الرئيسي",muted:"النص الثانوي",accent:"اللون الرئيسي",background:"الخلفية",cards:"البطاقات",category:"الفئات",categoryText:"نص الفئات",navigation:"تنقل الفئات",price:"موضع السعر",imagePosition:"موضع الصورة",imageRatio:"نسبة الصورة",badgeSymbols:"رموز الشارات",iconText:"رمز + نص",textOnly:"نص فقط",badgeStyle:"نمط الشارات",autoStyle:"تلقائي",minimalStyle:"بسيط",filledStyle:"ممتلئ",playfulStyle:"مرح",
    palettePresets:"لوحات الألوان",customColors:"ألوان مخصصة",fonts:"تنسيق الخطوط",weights:"أوزان الخط",typeScale:"أحجام النص",shapeSpacing:"الشكل والمسافات",imageCards:"بطاقات الصور",sectionGap:"مسافة الأقسام",itemGap:"مسافة العناصر",cardPadding:"حشوة البطاقة",cardRadius:"استدارة البطاقة",heroSize:"عنوان الواجهة",sectionSize:"عنوان القسم",itemNameSize:"اسم العنصر",descriptionSize:"الوصف",priceSize:"السعر",badgeDisplay:"محتوى الشارات",badgeAppearance:"النمط البصري",badgeAutoHint:"يتبع الوضع التلقائي قالب القائمة.",
  },
};

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
  const t=COPY[language]||COPY.en;
  const [workspaceMode,setWorkspaceMode]=useState("styles");
  const [query,setQuery]=useState("");
  const [filters,setFilters]=useState({browse:"all",type:"all",layout:"all",tone:"all"});
  const [previewEntry,setPreviewEntry]=useState(null);
  const [favorites,setFavorites]=useState(readFavorites);
  const [favoritesOnly,setFavoritesOnly]=useState(false);
  const [history,setHistory]=useState({past:[],future:[]});
  const [focusTarget,setFocusTarget]=useState("hero");
  const previousDesignRef=useRef(design);
  const historyModeRef=useRef("normal");
  const lastHistoryAtRef=useRef(0);
  const baseDesignNameRef=useRef("");

  const patchTheme=(key,value)=>patchDesign(current=>({...current,theme:{...current.theme,[key]:value}}));
  const patchType=(key,value)=>patchDesign(current=>({...current,typography:{...current.typography,[key]:value}}));
  const patchLayout=(key,value)=>patchDesign(current=>({...current,layout:{...current.layout,[key]:value}}));
  const patchBrand=(key,value)=>patchDesign(current=>({...current,brand:{...current.brand,[key]:value}}));
  const patchBadges=(key,value)=>patchDesign(current=>({...current,badges:{...current.badges,[key]:value}}));

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
  const recommendedDesigns=useMemo(()=>FEELING_DESIGNS.map(feel=>({feel,entry:PREMIUM_MENU_DESIGNS.find(item=>item.id===feel.id)})).filter(row=>row.entry),[]);
  const baseDesignName=activeDesign?.name||baseDesignNameRef.current||titleCase(design.template);
  const designIsModified=!activeDesign;

  useEffect(()=>{if(activeDesign?.name)baseDesignNameRef.current=activeDesign.name;},[activeDesign?.name]);
  useEffect(()=>{
    previousDesignRef.current=design;
    historyModeRef.current="normal";
    lastHistoryAtRef.current=0;
    baseDesignNameRef.current=activeDesign?.name||"";
    setHistory({past:[],future:[]});
  },[menu?.slug]);
  useEffect(()=>{
    const previous=previousDesignRef.current;
    if(comparable(previous)===comparable(design))return;
    previousDesignRef.current=design;
    if(historyModeRef.current!=="normal"){historyModeRef.current="normal";return;}
    const now=Date.now();
    setHistory(current=>{
      const startsNewStep=now-lastHistoryAtRef.current>420||!current.past.length;
      lastHistoryAtRef.current=now;
      return {past:startsNewStep?[...current.past,normalizeMenuDesign(previous)].slice(-60):current.past,future:[]};
    });
  },[design]);
  useEffect(()=>{try{window.localStorage.setItem(FAVORITES_STORAGE_KEY,JSON.stringify(favorites));}catch{}},[favorites]);
  useEffect(()=>{
    if(!previewEntry)return undefined;
    const previousOverflow=document.body.style.overflow;
    const onKeyDown=event=>{if(event.key==="Escape")setPreviewEntry(null);};
    document.body.style.overflow="hidden";
    window.addEventListener("keydown",onKeyDown);
    return ()=>{document.body.style.overflow=previousOverflow;window.removeEventListener("keydown",onKeyDown);};
  },[previewEntry]);
  useEffect(()=>{
    const onKeyDown=event=>{
      if(!(event.metaKey||event.ctrlKey)||String(event.key).toLowerCase()!=="z")return;
      const target=event.target;
      const tag=target?.tagName?.toLowerCase();
      if(target?.isContentEditable||["input","textarea","select"].includes(tag))return;
      event.preventDefault();
      if(event.shiftKey)redoDesign();else undoDesign();
    };
    window.addEventListener("keydown",onKeyDown);
    return ()=>window.removeEventListener("keydown",onKeyDown);
  },[history.past.length,history.future.length,design]);
  useEffect(()=>{
    const onFocus=event=>{
      const focus=event.detail?.focus;
      const panelFor={brand:"brand",hero:"hero",categories:"layout",items:"layout",badges:"badges"}[focus];
      if(!panelFor)return;
      setFocusTarget(focus);
      setPanel(panelFor);
      setWorkspaceMode("advanced");
    };
    window.addEventListener("beyond-menu-design-focus",onFocus);
    return ()=>window.removeEventListener("beyond-menu-design-focus",onFocus);
  },[setPanel]);

  function undoDesign(){
    if(!history.past.length)return;
    const previous=history.past[history.past.length-1];
    historyModeRef.current="undo";
    lastHistoryAtRef.current=0;
    setHistory(current=>({past:current.past.slice(0,-1),future:[normalizeMenuDesign(design),...current.future].slice(0,60)}));
    patchDesign(()=>previous);
  }
  function redoDesign(){
    if(!history.future.length)return;
    const next=history.future[0];
    historyModeRef.current="redo";
    lastHistoryAtRef.current=0;
    setHistory(current=>({past:[...current.past,normalizeMenuDesign(design)].slice(-60),future:current.future.slice(1)}));
    patchDesign(()=>next);
  }
  function uploadImage(file,key){
    if(!file||!file.type?.startsWith("image/"))return;
    const reader=new FileReader();
    reader.onload=()=>patchBrand(key,String(reader.result||""));
    reader.readAsDataURL(file);
  }
  function chooseDesign(entry){
    patchDesign(current=>applyPremiumMenuDesign(current,entry.id));
  }
  function toggleFavorite(entryId){setFavorites(current=>current.includes(entryId)?current.filter(id=>id!==entryId):[...current,entryId]);}
  function usePreviewDesign(){if(!previewEntry)return;chooseDesign(previewEntry);setPreviewEntry(null);}
  function applyTypePreset(key){const preset=TYPE_PRESETS[key];if(!preset)return;patchDesign(current=>({...current,typography:{...current.typography,...preset}}));}
  function openFocus(focus){
    const panelFor={brand:"brand",hero:"hero",categories:"layout",items:"layout",badges:"badges",colors:"colors",type:"type"}[focus]||"brand";
    setFocusTarget(focus);
    setPanel(panelFor);
    setWorkspaceMode("advanced");
  }
  function restoreTemplateHero(){
    const mode=activeDesign?.design?.brand?.heroMediaMode||original?.brand?.heroMediaMode||"watermark";
    patchBrand("heroMediaMode",mode);
  }

  const contextLabel={brand:t.brand,hero:t.hero,categories:t.categories,items:t.items,badges:t.badges,colors:t.colorsPanel,type:t.typePanel}[focusTarget]||t.hero;
  const panelMeta={
    brand:{icon:"✦",title:t.brand,hint:t.logoHelp},
    hero:{icon:"▣",title:t.hero,hint:t.heroHint},
    colors:{icon:"◉",title:t.colorsPanel,hint:t.makeYoursHint},
    type:{icon:"Aa",title:t.typePanel,hint:t.makeYoursHint},
    layout:{icon:"⌗",title:t.layout,hint:focusTarget==="categories"?t.categories:t.items},
    badges:{icon:"◆",title:t.badges,hint:t.badgeAutoHint},
  }[panel]||{icon:"▣",title:t.hero,hint:t.heroHint};

  return <div className="studio-v3-design-pro-controls studio-v3-design-v2">
    <div className="studio-v3-design-commandbar">
      <div className="studio-v3-design-breadcrumb" title={baseDesignName}><span>{t.design}</span><i aria-hidden="true">›</i><strong>{baseDesignName}</strong><em className={designIsModified?"modified":"template"}>{designIsModified?t.modified:t.template}</em></div>
      <div className="studio-v3-design-history-actions" role="group" aria-label={`${t.undo} / ${t.redo}`}>
        <button type="button" disabled={!history.past.length} onClick={undoDesign} aria-label={t.undo} title={`${t.undo} · Ctrl/⌘ Z`}><span aria-hidden="true">↶</span><small>{t.undo}</small></button>
        <button type="button" disabled={!history.future.length} onClick={redoDesign} aria-label={t.redo} title={`${t.redo} · Shift + Ctrl/⌘ Z`}><span aria-hidden="true">↷</span><small>{t.redo}</small></button>
      </div>
    </div>

    <div className="studio-v3-design-v2-nav" role="tablist" aria-label={t.design}>
      {[["styles","▦",t.styles,t.stylesHint],["quick","✦",t.quick,t.quickHint],["advanced","⌘",t.advanced,t.advancedHint]].map(([key,icon,title,hint])=><button type="button" key={key} role="tab" aria-selected={workspaceMode===key} className={workspaceMode===key?"active":""} onClick={()=>setWorkspaceMode(key)}><i aria-hidden="true">{icon}</i><span><strong>{title}</strong><small>{hint}</small></span></button>)}
    </div>

    {workspaceMode==="quick"?<div className="studio-v3-design-quick-workspace">
      <section className="studio-v3-design-v2-current">
        <span className="studio-v3-current-design-mini" style={{"--current-bg":design.theme.background,"--current-accent":design.theme.accent,"--current-text":design.theme.text}} aria-hidden="true"/>
        <span><small>{t.current}</small><strong>{baseDesignName}</strong></span>
        <button type="button" onClick={()=>setWorkspaceMode("styles")}>{t.changeDesign}</button>
      </section>

      <section className="studio-v3-design-v2-section">
        <div className="studio-v3-design-v2-section-head"><div><strong>{t.recommended}</strong><small>{t.recommendedHint}</small></div></div>
        <div className="studio-v3-feeling-grid">{recommendedDesigns.map(({feel,entry})=><button type="button" key={entry.id} className={activeDesignId===entry.id?"active":""} onClick={()=>chooseDesign(entry)}><DesignThumbnail entry={entry}/><span><i aria-hidden="true">{feel.icon}</i><strong>{t[feel.key]}</strong><small>{entry.name}</small></span></button>)}</div>
        <button type="button" className="studio-v3-design-v2-secondary-action" onClick={()=>setWorkspaceMode("styles")}>{t.browseAll}<span aria-hidden="true">→</span></button>
      </section>

      <section className="studio-v3-design-v2-section">
        <div className="studio-v3-design-v2-section-head"><div><strong>{t.makeYours}</strong><small>{t.makeYoursHint}</small></div></div>

        <div className="studio-v3-quick-control-card">
          <div className="studio-v3-quick-control-title"><span className="dot colors" aria-hidden="true"/><div><strong>{t.colors}</strong><small>{activePaletteKey?MENU_COLOR_PRESETS[activePaletteKey]?.label:t.modified}</small></div><button type="button" onClick={()=>openFocus("colors")}>•••</button></div>
          <div className="studio-v3-quick-palette-row">{Object.entries(MENU_COLOR_PRESETS).map(([key,preset])=><button type="button" key={key} className={activePaletteKey===key?"active":""} onClick={()=>patchDesign(current=>applyMenuColorPreset(current,key))} title={preset.label}><span>{[preset.theme.background,preset.theme.accent,preset.theme.text].map((color,index)=><i key={`${color}-${index}`} style={{background:color}}/>)}</span><small>{preset.label}</small></button>)}</div>
        </div>

        <div className="studio-v3-quick-control-card">
          <div className="studio-v3-quick-control-title"><span className="dot type" aria-hidden="true">Aa</span><div><strong>{t.typography}</strong><small>{design.typography.headingFont} + {design.typography.bodyFont}</small></div><button type="button" onClick={()=>openFocus("type")}>•••</button></div>
          <div className="studio-v3-quick-type-grid">{Object.keys(TYPE_PRESETS).map(key=><button type="button" key={key} onClick={()=>applyTypePreset(key)}><b style={{fontFamily:TYPE_PRESETS[key].headingFont}}>Aa</b><span>{t[key]}</span></button>)}</div>
        </div>

        <div className="studio-v3-quick-control-card">
          <div className="studio-v3-quick-control-title"><span className="dot hero-media-control" aria-hidden="true">▣</span><div><strong>{t.hero}</strong><small>{t.heroHint}</small></div><button type="button" onClick={()=>openFocus("hero")}>•••</button></div>
          <div className="studio-v3-quick-hero-grid">
            <button type="button" onClick={restoreTemplateHero}><i aria-hidden="true">✦</i><span>{t.templateHero}</span></button>
            <button type="button" className={heroMode==="watermark"?"active":""} onClick={()=>patchBrand("heroMediaMode","watermark")}><i aria-hidden="true">◎</i><span>{t.logo}</span></button>
            <button type="button" className={heroMode==="image"?"active":""} onClick={()=>patchBrand("heroMediaMode","image")}><i aria-hidden="true">▧</i><span>{t.photo}</span></button>
            <button type="button" className={heroMode==="none"?"active":""} onClick={()=>patchBrand("heroMediaMode","none")}><i aria-hidden="true">—</i><span>{t.clean}</span></button>
          </div>
          {heroMode==="image"?<div className="studio-v3-quick-hero-upload">{heroImage?<img src={heroImage} alt=""/>:null}<div><small>{t.photoHint}</small><label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadImage(e.target.files?.[0],"heroImageUrl")}/><span>{heroImage?t.replaceHero:t.uploadHero}</span></label>{heroImage?<button type="button" onClick={()=>patchBrand("heroImageUrl","")}>{t.removeHero}</button>:null}</div></div>:null}
        </div>

        <div className="studio-v3-quick-control-card">
          <div className="studio-v3-quick-control-title"><span className="dot spacing" aria-hidden="true">↕</span><div><strong>{t.density}</strong><small>{t[design.layout.density==="comfortable"?"balanced":design.layout.density]}</small></div><button type="button" onClick={()=>openFocus("items")}>•••</button></div>
          <div className="studio-v3-quick-density-grid">{[["compact",t.compact],["comfortable",t.balanced],["spacious",t.spacious]].map(([value,label])=><button type="button" key={value} className={design.layout.density===value?"active":""} onClick={()=>patchLayout("density",value)}><i className={value} aria-hidden="true"/><span>{label}</span></button>)}</div>
        </div>

        <button type="button" className="studio-v3-design-v2-primary-action" onClick={()=>setWorkspaceMode("advanced")}>{t.openAdvanced}<span aria-hidden="true">→</span></button>
      </section>
    </div>:null}

    {workspaceMode==="styles"?<div className="studio-v3-template-workspace">
      <section className="studio-v3-design-library">
        <div className="studio-v3-design-library-head"><div><strong>{t.library}</strong><p>{t.libraryHint}</p></div><span className="studio-v3-design-count">{PREMIUM_MENU_DESIGNS.length}</span></div>
        <label className="studio-v3-design-search"><span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}/></label>
        <MenuDesignLibraryFilters language={language} filters={filters} setFilters={setFilters} resultCount={filteredDesigns.length} totalCount={PREMIUM_MENU_DESIGNS.length}/>
        <div className="studio-v3-design-library-utilities"><button type="button" className={`studio-v3-design-favorites-toggle ${favoritesOnly?"active":""}`} onClick={()=>setFavoritesOnly(value=>!value)}><span aria-hidden="true">♥</span><span>{t.favorites}</span><b>{favorites.length}</b></button><button type="button" className={`studio-v3-original-design ${isOriginal?"active":""}`} disabled={!original} onClick={()=>original&&patchDesign(()=>original)}><span><strong>{t.restore}</strong><small>{t.restoreHint}</small></span><span aria-hidden="true">↺</span></button></div>
        <div className="studio-v3-premium-library-grid">{filteredDesigns.map(entry=>{const selected=activeDesignId===entry.id;const favorite=favorites.includes(entry.id);return <article className={`studio-v3-premium-design-card layout-${previewLayout(entry)} ${selected?"selected":""}`} key={entry.id}>{selected?<span className="studio-v3-design-selected-badge" aria-label={t.selected}>✓</span>:null}<button type="button" className="studio-v3-premium-design-select" onClick={()=>chooseDesign(entry)} aria-pressed={selected}><DesignThumbnail entry={entry}/><span className="studio-v3-premium-design-copy"><span><strong>{entry.name}</strong><small>{entry.layout}</small></span><em>{entry.description}</em><span className="studio-v3-design-category">{entry.category}</span></span></button><div className="studio-v3-premium-design-actions"><button type="button" className={`studio-v3-design-favorite ${favorite?"active":""}`} onClick={()=>toggleFavorite(entry.id)} aria-label={t.favorites} aria-pressed={favorite}><span aria-hidden="true">{favorite?"♥":"♡"}</span></button><button type="button" className="studio-v3-design-preview-button" onClick={()=>setPreviewEntry(entry)} disabled={!menu}><span aria-hidden="true">⛶</span>{t.preview}</button></div></article>;})}</div>
        {!filteredDesigns.length?<div className="studio-v3-design-library-empty">{t.noMatches}</div>:null}
      </section>
    </div>:null}

    {workspaceMode==="advanced"?<div className="studio-v3-customize-workspace studio-v3-design-v2-advanced">
      <section className="studio-v3-inspector-shell">
        <div className="studio-v3-context-editor-head"><div><span>{t.editing}</span><strong>{contextLabel}</strong><small>{t.clickPreview}</small></div><button type="button" onClick={()=>setWorkspaceMode("quick")}>{t.backQuick}</button></div>
        <div className="studio-v3-context-targets" role="group" aria-label={t.clickPreview}>{[["brand","✦",t.brand],["hero","▣",t.hero],["categories","▦",t.categories],["items","☷",t.items],["badges","◆",t.badges]].map(([key,icon,label])=><button type="button" key={key} className={focusTarget===key?"active":""} onClick={()=>openFocus(key)}><i aria-hidden="true">{icon}</i><span>{label}</span></button>)}</div>
        <div className="studio-v3-design-tabs studio-v3-design-v2-tabs">{[["brand","✦",t.brand],["hero","▣",t.hero],["colors","◉",t.colorsPanel],["type","Aa",t.typePanel],["layout","⌗",t.layout],["badges","◆",t.badges]].map(([key,icon,label])=><button type="button" key={key} className={panel===key?"active":""} onClick={()=>setPanel(key)}><span className="studio-v3-design-tab-icon">{icon}</span><span className="studio-v3-design-tab-label">{label}</span></button>)}</div>
        <div className="studio-v3-inspector-panel-head"><span aria-hidden="true">{panelMeta.icon}</span><div><strong>{panelMeta.title}</strong><small>{panelMeta.hint}</small></div></div>

        {panel==="brand"?<div className="studio-v3-design-section studio-v3-inspector-panel"><section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.logoAsset}</span><small>{t.logoHelp}</small></div><div className="studio-v3-inspector-logo-card"><div className="studio-v3-inspector-logo-preview">{logo?<img src={logo} alt=""/>:<span className="studio-v3-inspector-logo-placeholder">LOGO</span>}</div><div className="studio-v3-inspector-logo-actions"><label className="studio-v3-inspector-upload"><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e=>uploadImage(e.target.files?.[0],"logoUrl")}/><span>{logo?t.replaceLogo:t.uploadLogo}</span></label><button className="studio-v3-inspector-remove" type="button" disabled={!logo} onClick={()=>patchBrand("logoUrl","")}>{t.removeLogo}</button></div></div><RangeField label={t.logoSize} value={design.brand.logoSize} min={24} max={120} onChange={value=>patchBrand("logoSize",value)}/><div className="studio-v3-inspector-block-title"><span>{t.logoShape}</span></div><div className="studio-v3-shape-grid">{["free","rounded","circle","square"].map(value=><button type="button" key={value} className={`studio-v3-shape-choice shape-${value} ${design.brand.logoShape===value?"active":""}`} onClick={()=>patchBrand("logoShape",value)}><i aria-hidden="true">B</i><span>{titleCase(value)}</span></button>)}</div></section></div>:null}

        {panel==="hero"?<div className="studio-v3-design-section studio-v3-inspector-panel"><section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.hero}</span><small>{t.heroHint}</small></div><div className="studio-v3-hero-mode-grid">{[["watermark","◎",t.watermark],["image","▧",t.image],["none","—",t.none]].map(([value,icon,label])=><button type="button" key={value} className={`studio-v3-visual-choice ${heroMode===value?"active":""}`} onClick={()=>patchBrand("heroMediaMode",value)}><i aria-hidden="true">{icon}</i><span>{label}</span></button>)}</div>{heroMode==="image"?<div className="studio-v3-inspector-logo-actions"><p className="studio-v3-inspector-help">{t.photoHint}</p>{heroImage?<img className="studio-v3-inspector-background-preview" src={heroImage} alt=""/>:null}<label className="studio-v3-inspector-upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadImage(e.target.files?.[0],"heroImageUrl")}/><span>{heroImage?t.replaceHero:t.uploadHero}</span></label>{heroImage?<button className="studio-v3-inspector-remove" type="button" onClick={()=>patchBrand("heroImageUrl","")}>{t.removeHero}</button>:null}</div>:null}<RangeField label={t.heroSize} value={design.typography.heroSize} min={MENU_DESIGN_CONSTRAINTS.typography.heroSize.min} max={MENU_DESIGN_CONSTRAINTS.typography.heroSize.max} onChange={value=>patchType("heroSize",value)}/></section></div>:null}

        {panel==="colors"?<div className="studio-v3-design-section studio-v3-inspector-panel"><section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.palettePresets}</span></div><div className="studio-v3-inspector-palette-grid">{Object.entries(MENU_COLOR_PRESETS).map(([key,preset])=><button type="button" key={key} className={`studio-v3-inspector-palette ${activePaletteKey===key?"active":""}`} onClick={()=>patchDesign(current=>applyMenuColorPreset(current,key))}><span className="studio-v3-inspector-palette-swatches">{[preset.theme.background,preset.theme.card,preset.theme.accent,preset.theme.text,preset.theme.categoryBackground].map((color,index)=><i key={`${color}-${index}`} style={{background:color}}/>)}</span><strong>{preset.label}</strong></button>)}</div></section><section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.customColors}</span></div><div className="studio-v3-inspector-color-grid"><ColorField label={t.background} value={design.theme.background} onChange={value=>patchTheme("background",value)}/><ColorField label={t.cards} value={design.theme.card} onChange={value=>patchTheme("card",value)}/><ColorField label={t.text} value={design.theme.text} onChange={value=>patchTheme("text",value)}/><ColorField label={t.muted} value={design.theme.muted} onChange={value=>patchTheme("muted",value)}/><ColorField label={t.accent} value={design.theme.accent} onChange={value=>patchTheme("accent",value)}/><ColorField label={t.category} value={design.theme.categoryBackground} onChange={value=>patchTheme("categoryBackground",value)}/><ColorField label={t.categoryText} value={design.theme.categoryText} onChange={value=>patchTheme("categoryText",value)}/></div></section></div>:null}

        {panel==="type"?<div className="studio-v3-design-section studio-v3-inspector-panel"><section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.fonts}</span></div><div className="studio-v3-font-grid"><FontField label={t.headingFont} value={design.typography.headingFont} onChange={value=>patchType("headingFont",value)}/><FontField label={t.bodyFont} value={design.typography.bodyFont} onChange={value=>patchType("bodyFont",value)}/></div></section><section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.weights}</span></div><div className="studio-v3-design-control-label">{t.headingWeight}</div><div className="studio-v3-weight-grid">{MENU_FONT_WEIGHTS.map(value=><button type="button" key={value} className={`studio-v3-weight-choice ${design.typography.headingWeight===value?"active":""}`} style={{fontWeight:value}} onClick={()=>patchType("headingWeight",value)}>{value}</button>)}</div><div className="studio-v3-design-control-label">{t.itemWeight}</div><div className="studio-v3-weight-grid">{MENU_FONT_WEIGHTS.map(value=><button type="button" key={value} className={`studio-v3-weight-choice ${design.typography.itemWeight===value?"active":""}`} style={{fontWeight:value}} onClick={()=>patchType("itemWeight",value)}>{value}</button>)}</div></section><section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.typeScale}</span></div><div className="studio-v3-type-scale"><RangeField label={t.heroSize} value={design.typography.heroSize} min={MENU_DESIGN_CONSTRAINTS.typography.heroSize.min} max={MENU_DESIGN_CONSTRAINTS.typography.heroSize.max} onChange={value=>patchType("heroSize",value)}/><RangeField label={t.sectionSize} value={design.typography.sectionSize} min={MENU_DESIGN_CONSTRAINTS.typography.sectionSize.min} max={MENU_DESIGN_CONSTRAINTS.typography.sectionSize.max} onChange={value=>patchType("sectionSize",value)}/><RangeField label={t.itemNameSize} value={design.typography.itemNameSize} min={MENU_DESIGN_CONSTRAINTS.typography.itemNameSize.min} max={MENU_DESIGN_CONSTRAINTS.typography.itemNameSize.max} onChange={value=>patchType("itemNameSize",value)}/><RangeField label={t.descriptionSize} value={design.typography.descriptionSize} min={MENU_DESIGN_CONSTRAINTS.typography.descriptionSize.min} max={MENU_DESIGN_CONSTRAINTS.typography.descriptionSize.max} onChange={value=>patchType("descriptionSize",value)}/><RangeField label={t.priceSize} value={design.typography.priceSize} min={MENU_DESIGN_CONSTRAINTS.typography.priceSize.min} max={MENU_DESIGN_CONSTRAINTS.typography.priceSize.max} onChange={value=>patchType("priceSize",value)}/></div></section></div>:null}

        {panel==="layout"?<div className="studio-v3-design-section studio-v3-inspector-panel"><section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.density}</span></div><div className="studio-v3-option-grid">{["compact","comfortable","spacious"].map(value=><button type="button" key={value} className={`studio-v3-layout-choice density-${value} ${design.layout.density===value?"active":""}`} onClick={()=>patchLayout("density",value)}><i aria-hidden="true"/><span>{titleCase(value)}</span></button>)}</div></section><section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.navigation}</span></div><div className="studio-v3-option-grid">{["pills","underline","minimal"].map(value=><button type="button" key={value} className={`studio-v3-layout-choice nav-${value} ${design.layout.navigationStyle===value?"active":""}`} onClick={()=>patchLayout("navigationStyle",value)}><i aria-hidden="true"/><span>{titleCase(value)}</span></button>)}</div></section><section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.price}</span></div><div className="studio-v3-option-grid">{["inline","below","bottom"].map(value=><button type="button" key={value} className={`studio-v3-layout-choice price-${value} ${design.layout.pricePosition===value?"active":""}`} onClick={()=>patchLayout("pricePosition",value)}><i aria-hidden="true"/><span>{titleCase(value)}</span></button>)}</div></section>{IMAGE_LAYOUT_TEMPLATES.has(design.template)?<section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.imageCards}</span></div><div className="studio-v3-design-control-label">{t.imagePosition}</div><div className="studio-v3-option-grid">{["top","left","right"].map(value=><button type="button" key={value} className={`studio-v3-layout-choice image-${value} ${design.layout.itemImagePosition===value?"active":""}`} onClick={()=>patchLayout("itemImagePosition",value)}><i aria-hidden="true"/><span>{titleCase(value)}</span></button>)}</div><div className="studio-v3-design-control-label">{t.imageRatio}</div><div className="studio-v3-option-grid ratios">{["1:1","4:3","3:2","16:9"].map(value=><button type="button" key={value} className={`studio-v3-layout-choice ratio-${value.replace(":","-")} ${design.layout.itemImageRatio===value?"active":""}`} onClick={()=>patchLayout("itemImageRatio",value)}><i aria-hidden="true"/><span>{value}</span></button>)}</div></section>:null}<section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.shapeSpacing}</span></div><div className="studio-v3-radius-row"><RangeField label={t.cardRadius} value={design.layout.cardRadius} min={MENU_DESIGN_CONSTRAINTS.radius.min} max={MENU_DESIGN_CONSTRAINTS.radius.max} onChange={value=>patchLayout("cardRadius",value)}/><span className="studio-v3-radius-preview" style={{borderRadius:design.layout.cardRadius}} aria-hidden="true"/></div><RangeField label={t.sectionGap} value={design.layout.sectionGap} min={MENU_DESIGN_CONSTRAINTS.spacing.sectionGap.min} max={MENU_DESIGN_CONSTRAINTS.spacing.sectionGap.max} onChange={value=>patchLayout("sectionGap",value)}/><RangeField label={t.itemGap} value={design.layout.itemGap} min={MENU_DESIGN_CONSTRAINTS.spacing.itemGap.min} max={MENU_DESIGN_CONSTRAINTS.spacing.itemGap.max} onChange={value=>patchLayout("itemGap",value)}/><RangeField label={t.cardPadding} value={design.layout.cardPadding} min={MENU_DESIGN_CONSTRAINTS.spacing.cardPadding.min} max={MENU_DESIGN_CONSTRAINTS.spacing.cardPadding.max} onChange={value=>patchLayout("cardPadding",value)}/></section></div>:null}

        {panel==="badges"?<div className="studio-v3-design-section studio-v3-inspector-panel studio-v3-badges-inspector"><section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.badgeDisplay}</span><small>{t.badgeSymbols}</small></div><div className="studio-v3-badge-display-grid"><button type="button" className={`studio-v3-badge-choice ${design.badges.showSymbols?"active":""}`} onClick={()=>patchBadges("showSymbols",true)}><span className="studio-v3-badge-choice-preview symbol"><i>◆</i><b>Popular</b></span><strong>{t.iconText}</strong></button><button type="button" className={`studio-v3-badge-choice ${!design.badges.showSymbols?"active":""}`} onClick={()=>patchBadges("showSymbols",false)}><span className="studio-v3-badge-choice-preview text"><b>Popular</b></span><strong>{t.textOnly}</strong></button></div></section><section className="studio-v3-inspector-block"><div className="studio-v3-inspector-block-title"><span>{t.badgeAppearance}</span><small>{t.badgeStyle}</small></div><div className="studio-v3-badge-style-grid">{[["auto",t.autoStyle],["minimal",t.minimalStyle],["filled",t.filledStyle],["playful",t.playfulStyle]].map(([value,label])=><button type="button" key={value} className={`studio-v3-badge-style-choice style-${value} ${design.badges.iconStyle===value?"active":""}`} disabled={!design.badges.showSymbols} onClick={()=>patchBadges("iconStyle",value)}><span className="studio-v3-badge-style-preview"><i>◆</i><b>Chef</b></span><strong>{label}</strong></button>)}</div><p className="studio-v3-inspector-help">{t.badgeAutoHint}</p></section></div>:null}
      </section>
    </div>:null}

    {previewEntry&&previewDesign&&menu?<div className="studio-v3-design-preview-overlay" role="dialog" aria-modal="true" aria-label={`${t.designPreview}: ${previewEntry.name}`} onMouseDown={event=>{if(event.target===event.currentTarget)setPreviewEntry(null);}}><div className="studio-v3-design-preview-shell"><header className="studio-v3-design-preview-toolbar"><button type="button" className="studio-v3-design-preview-close" onClick={()=>setPreviewEntry(null)} aria-label={t.closePreview}>×</button><div className="studio-v3-design-preview-title"><span>{t.designPreview}</span><strong>{previewEntry.name}</strong><small>{previewEntry.layout} · {previewEntry.category}</small></div><button type="button" className="studio-v3-design-preview-use" onClick={usePreviewDesign}>{t.useDesign}</button></header><div className="studio-v3-design-preview-stage"><div className="studio-v3-design-preview-page"><MenuRenderer menu={menu} design={previewDesign} initialLanguage={language}/></div></div></div></div>:null}
  </div>;
}