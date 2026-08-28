import { useMemo, useState } from "react";
import {
  MENU_COLOR_PRESETS,
  MENU_FONT_FAMILIES,
  MENU_FONT_WEIGHTS,
  applyMenuColorPreset,
  normalizeMenuDesign,
} from "../domain/designSchema";
import { PREMIUM_MENU_DESIGNS, applyPremiumMenuDesign } from "../domain/premiumMenuDesignLibrary";
import { getBaselineDesignForMenu } from "./draftSession";
import "./MenuDesignControls.css";

const labels = {
  en:{library:"Design library",libraryHint:"Real menu layouts, not just color skins. Choose a structure, then make it yours.",search:"Search designs",restore:"Restore original design",restoreHint:"Return to the design this menu started with",brand:"Brand",colors:"Colors",typography:"Typography",layout:"Layout",uploadLogo:"Upload logo",replaceLogo:"Replace logo",logoSize:"Logo size",logoShape:"Logo shape",removeLogo:"Remove logo",heroBackground:"Menu header background",watermark:"Logo watermark",image:"Background image",none:"No image",watermarkHint:"Use the restaurant logo as the hero watermark.",imageHint:"Upload a separate image for the menu header background.",uploadBackground:"Upload background",replaceBackground:"Replace background",removeBackground:"Remove background",headingFont:"Heading font",bodyFont:"Body font",headingWeight:"Heading weight",itemWeight:"Item weight",text:"Main text",muted:"Secondary text",accent:"Accent",background:"Background",cards:"Cards",category:"Categories",categoryText:"Category text",density:"Density",navigation:"Category navigation",price:"Price position",imagePosition:"Image position",imageRatio:"Image ratio",noMatches:"No designs match this search."},
  he:{library:"ספריית עיצובים",libraryHint:"פריסות תפריט אמיתיות, לא רק החלפת צבעים. בחרו מבנה ואז התאימו אותו למותג.",search:"חיפוש עיצובים",restore:"שחזור העיצוב המקורי",restoreHint:"חזרה לעיצוב שממנו התפריט התחיל",brand:"מותג",colors:"צבעים",typography:"טיפוגרפיה",layout:"פריסה",uploadLogo:"העלאת לוגו",replaceLogo:"החלפת לוגו",logoSize:"גודל לוגו",logoShape:"צורת לוגו",removeLogo:"הסר לוגו",heroBackground:"רקע כותרת התפריט",watermark:"לוגו כסימן מים",image:"תמונת רקע",none:"ללא תמונה",watermarkHint:"השתמשו בלוגו המסעדה כסימן מים באזור הכותרת.",imageHint:"העלאת תמונה נפרדת כרקע לכותרת התפריט.",uploadBackground:"העלאת רקע",replaceBackground:"החלפת רקע",removeBackground:"הסר רקע",headingFont:"פונט כותרות",bodyFont:"פונט טקסט",headingWeight:"עובי כותרות",itemWeight:"עובי שמות פריטים",text:"טקסט ראשי",muted:"טקסט משני",accent:"צבע מוביל",background:"רקע",cards:"כרטיסים",category:"קטגוריות",categoryText:"טקסט קטגוריות",density:"צפיפות",navigation:"ניווט קטגוריות",price:"מיקום מחיר",imagePosition:"מיקום תמונה",imageRatio:"יחס תמונה",noMatches:"לא נמצאו עיצובים מתאימים."},
  ar:{library:"مكتبة التصاميم",libraryHint:"تخطيطات قوائم حقيقية وليست مجرد ألوان. اختر البنية ثم خصصها للعلامة.",search:"البحث في التصاميم",restore:"استعادة التصميم الأصلي",restoreHint:"العودة إلى التصميم الذي بدأت به القائمة",brand:"العلامة",colors:"الألوان",typography:"الخطوط",layout:"التخطيط",uploadLogo:"رفع الشعار",replaceLogo:"استبدال الشعار",logoSize:"حجم الشعار",logoShape:"شكل الشعار",removeLogo:"إزالة الشعار",heroBackground:"خلفية عنوان القائمة",watermark:"الشعار كعلامة مائية",image:"صورة خلفية",none:"بدون صورة",watermarkHint:"استخدم شعار المطعم كعلامة مائية في منطقة العنوان.",imageHint:"ارفع صورة منفصلة لخلفية عنوان القائمة.",uploadBackground:"رفع الخلفية",replaceBackground:"استبدال الخلفية",removeBackground:"إزالة الخلفية",headingFont:"خط العناوين",bodyFont:"خط النص",headingWeight:"سماكة العناوين",itemWeight:"سماكة أسماء العناصر",text:"النص الرئيسي",muted:"النص الثانوي",accent:"اللون الرئيسي",background:"الخلفية",cards:"البطاقات",category:"الفئات",categoryText:"نص الفئات",density:"الكثافة",navigation:"تنقل الفئات",price:"موضع السعر",imagePosition:"موضع الصورة",imageRatio:"نسبة الصورة",noMatches:"لا توجد تصاميم مطابقة."},
};

const IMAGE_LAYOUT_TEMPLATES=new Set(["visual","gallery","tiles","split"]);
const titleCase=value=>String(value).replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const comparable=value=>JSON.stringify(normalizeMenuDesign(value||{}));
function Choice({active,children,onClick,className=""}){return <button type="button" className={`studio-v3-design-choice ${active?"active":""} ${className}`.trim()} onClick={onClick}>{children}</button>}
function ColorField({label,value,onChange}){return <label className="studio-v3-design-color"><span>{label}</span><span className="studio-v3-design-color-input"><code>{value}</code><input type="color" value={value} onChange={e=>onChange(e.target.value)}/></span></label>}
function SelectField({label,value,values,onChange}){return <label className="studio-v3-design-select"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{values.map(option=><option key={option} value={option}>{titleCase(option)}</option>)}</select></label>}
function DesignThumbnail({entry}){const [background,accent,text]=entry.swatches;return <span className={`studio-v3-premium-design-preview layout-${entry.design.template}`} style={{"--thumb-bg":background,"--thumb-accent":accent,"--thumb-text":text}}><span className="studio-v3-thumb-hero"/><span className="studio-v3-thumb-nav"><i/><i/><i/></span><span className="studio-v3-thumb-items"><i/><i/><i/><i/></span></span>}

export default function MenuDesignControls({design,baselineDesign,menu,language="en",panel,setPanel,patchDesign}){
  const l=labels[language]||labels.en;
  const [query,setQuery]=useState("");
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
  const filteredDesigns=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    if(!needle)return PREMIUM_MENU_DESIGNS;
    return PREMIUM_MENU_DESIGNS.filter(entry=>[entry.name,entry.category,entry.layout,entry.description,...entry.tags].join(" ").toLowerCase().includes(needle));
  },[query]);

  function uploadImage(file,key){if(!file||!file.type?.startsWith("image/"))return;const reader=new FileReader();reader.onload=()=>patchBrand(key,String(reader.result||""));reader.readAsDataURL(file)}

  return <div className="studio-v3-design-pro-controls">
    <section className="studio-v3-design-library">
      <div className="studio-v3-design-library-head"><div><strong>{l.library}</strong><p>{l.libraryHint}</p></div></div>
      <label className="studio-v3-design-search"><span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={l.search}/></label>
      <button type="button" className={`studio-v3-original-design ${isOriginal?"active":""}`} disabled={!original} onClick={()=>original&&patchDesign(()=>original)}><span><strong>{l.restore}</strong><small>{l.restoreHint}</small></span><span aria-hidden="true">↺</span></button>
      <div className="studio-v3-premium-library-grid">{filteredDesigns.map(entry=><button type="button" className={`studio-v3-premium-design-card layout-${entry.design.template}`} key={entry.id} onClick={()=>patchDesign(current=>applyPremiumMenuDesign(current,entry.id))}><DesignThumbnail entry={entry}/><span className="studio-v3-premium-design-copy"><span><strong>{entry.name}</strong><small>{entry.layout}</small></span><em>{entry.description}</em><span className="studio-v3-design-category">{entry.category}</span></span></button>)}</div>
      {!filteredDesigns.length?<div className="studio-v3-design-library-empty">{l.noMatches}</div>:null}
    </section>

    <div className="studio-v3-design-tabs">{[["brand",l.brand],["colors",l.colors],["type",l.typography],["layout",l.layout]].map(([key,label])=><button key={key} className={panel===key?"active":""} onClick={()=>setPanel(key)}>{label}</button>)}</div>

    {panel==="brand"&&<div className="studio-v3-design-section">
      <div className="studio-v3-logo-upload-row">{logo?<img src={logo} alt=""/>:<span className="studio-v3-logo-placeholder">LOGO</span>}<label className="studio-v3-logo-upload-button"><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e=>uploadImage(e.target.files?.[0],"logoUrl")}/><span>{logo?l.replaceLogo:l.uploadLogo}</span></label></div>
      <button className="studio-v3-design-remove-logo" type="button" disabled={!logo} onClick={()=>patchBrand("logoUrl","")}>{l.removeLogo}</button>
      <label className="studio-v3-range-field"><span>{l.logoSize} <b>{design.brand.logoSize}px</b></span><input type="range" min="24" max="120" value={design.brand.logoSize} onChange={e=>patchBrand("logoSize",Number(e.target.value))}/></label>
      <SelectField label={l.logoShape} value={design.brand.logoShape} values={["free","rounded","circle","square"]} onChange={value=>patchBrand("logoShape",value)}/>
      <div className="studio-v3-hero-background-control"><div className="studio-v3-design-control-label">{l.heroBackground}</div><div className="studio-v3-hero-mode-grid"><Choice active={heroMode==="watermark"} onClick={()=>patchBrand("heroMediaMode","watermark")}>{l.watermark}</Choice><Choice active={heroMode==="image"} onClick={()=>patchBrand("heroMediaMode","image")}>{l.image}</Choice><Choice active={heroMode==="none"} onClick={()=>patchBrand("heroMediaMode","none")}>{l.none}</Choice></div>{heroMode==="watermark"?<p className="studio-v3-control-help">{l.watermarkHint}</p>:null}{heroMode==="image"?<div className="studio-v3-background-upload"><p className="studio-v3-control-help">{l.imageHint}</p>{heroImage?<img src={heroImage} alt=""/>:null}<label className="studio-v3-logo-upload-button"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadImage(e.target.files?.[0],"heroImageUrl")}/><span>{heroImage?l.replaceBackground:l.uploadBackground}</span></label>{heroImage?<button className="studio-v3-design-remove-logo" type="button" onClick={()=>patchBrand("heroImageUrl","")}>{l.removeBackground}</button>:null}</div>:null}</div>
    </div>}

    {panel==="colors"&&<div className="studio-v3-design-section"><div className="studio-v3-palette-grid">{Object.entries(MENU_COLOR_PRESETS).map(([key,preset])=><button type="button" key={key} onClick={()=>patchDesign(current=>applyMenuColorPreset(current,key))}><span className="studio-v3-palette-swatches">{[preset.theme.background,preset.theme.accent,preset.theme.text].map(color=><i key={color} style={{background:color}}/>)}</span><strong>{preset.label}</strong></button>)}</div><ColorField label={l.background} value={design.theme.background} onChange={value=>patchTheme("background",value)}/><ColorField label={l.cards} value={design.theme.card} onChange={value=>patchTheme("card",value)}/><ColorField label={l.text} value={design.theme.text} onChange={value=>patchTheme("text",value)}/><ColorField label={l.muted} value={design.theme.muted} onChange={value=>patchTheme("muted",value)}/><ColorField label={l.accent} value={design.theme.accent} onChange={value=>patchTheme("accent",value)}/><ColorField label={l.category} value={design.theme.categoryBackground} onChange={value=>patchTheme("categoryBackground",value)}/><ColorField label={l.categoryText} value={design.theme.categoryText} onChange={value=>patchTheme("categoryText",value)}/></div>}

    {panel==="type"&&<div className="studio-v3-design-section"><SelectField label={l.headingFont} value={design.typography.headingFont} values={MENU_FONT_FAMILIES} onChange={value=>patchType("headingFont",value)}/><SelectField label={l.bodyFont} value={design.typography.bodyFont} values={MENU_FONT_FAMILIES} onChange={value=>patchType("bodyFont",value)}/><div className="studio-v3-design-control-label">{l.headingWeight}</div><div className="studio-v3-design-choice-row">{MENU_FONT_WEIGHTS.map(value=><Choice key={value} active={design.typography.headingWeight===value} onClick={()=>patchType("headingWeight",value)}>{value}</Choice>)}</div><div className="studio-v3-design-control-label">{l.itemWeight}</div><div className="studio-v3-design-choice-row">{MENU_FONT_WEIGHTS.map(value=><Choice key={value} active={design.typography.itemWeight===value} onClick={()=>patchType("itemWeight",value)}>{value}</Choice>)}</div>{[["heroSize",30,72],["sectionSize",22,52],["itemNameSize",13,22],["descriptionSize",10,18],["priceSize",13,22]].map(([key,min,max])=><label className="studio-v3-range-field" key={key}><span>{titleCase(key.replace("Size",""))} <b>{design.typography[key]}px</b></span><input type="range" min={min} max={max} value={design.typography[key]} onChange={e=>patchType(key,Number(e.target.value))}/></label>)}</div>}

    {panel==="layout"&&<div className="studio-v3-design-section"><SelectField label={l.density} value={design.layout.density} values={["compact","comfortable","spacious"]} onChange={value=>patchLayout("density",value)}/><SelectField label={l.navigation} value={design.layout.navigationStyle} values={["pills","underline","minimal"]} onChange={value=>patchLayout("navigationStyle",value)}/><SelectField label={l.price} value={design.layout.pricePosition} values={["inline","below","bottom"]} onChange={value=>patchLayout("pricePosition",value)}/>{IMAGE_LAYOUT_TEMPLATES.has(design.template)&&<><SelectField label={l.imagePosition} value={design.layout.itemImagePosition} values={["top","left","right"]} onChange={value=>patchLayout("itemImagePosition",value)}/><SelectField label={l.imageRatio} value={design.layout.itemImageRatio} values={["1:1","4:3","3:2","16:9"]} onChange={value=>patchLayout("itemImageRatio",value)}/></>}<label className="studio-v3-range-field"><span>Card radius <b>{design.layout.cardRadius}px</b></span><input type="range" min="0" max="28" value={design.layout.cardRadius} onChange={e=>patchLayout("cardRadius",Number(e.target.value))}/></label></div>}
  </div>
}
