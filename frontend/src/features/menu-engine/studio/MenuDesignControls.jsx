import {
  MENU_COLOR_PRESETS,
  MENU_DESIGN_PRESETS,
  MENU_FONT_FAMILIES,
  MENU_FONT_WEIGHTS,
  applyMenuColorPreset,
  applyMenuDesignPreset,
} from "../domain/designSchema";

const labels = {
  en: { presets:"Style presets",brand:"Brand",colors:"Colors",typography:"Typography",layout:"Layout",logo:"Logo URL",logoSize:"Logo size",logoShape:"Logo shape",headingFont:"Heading font",bodyFont:"Body font",headingWeight:"Heading weight",itemWeight:"Item weight",text:"Main text",muted:"Secondary text",accent:"Accent",background:"Background",cards:"Cards",category:"Categories",categoryText:"Category text",density:"Density",navigation:"Category navigation",price:"Price position",imagePosition:"Image position",imageRatio:"Image ratio",original:"Current",removeLogo:"Remove logo" },
  he: { presets:"סגנונות מוכנים",brand:"מותג",colors:"צבעים",typography:"טיפוגרפיה",layout:"פריסה",logo:"כתובת לוגו",logoSize:"גודל לוגו",logoShape:"צורת לוגו",headingFont:"פונט כותרות",bodyFont:"פונט טקסט",headingWeight:"עובי כותרות",itemWeight:"עובי שמות פריטים",text:"טקסט ראשי",muted:"טקסט משני",accent:"צבע מוביל",background:"רקע",cards:"כרטיסים",category:"קטגוריות",categoryText:"טקסט קטגוריות",density:"צפיפות",navigation:"ניווט קטגוריות",price:"מיקום מחיר",imagePosition:"מיקום תמונה",imageRatio:"יחס תמונה",original:"נוכחי",removeLogo:"הסר לוגו" },
  ar: { presets:"أنماط جاهزة",brand:"العلامة",colors:"الألوان",typography:"الخطوط",layout:"التخطيط",logo:"رابط الشعار",logoSize:"حجم الشعار",logoShape:"شكل الشعار",headingFont:"خط العناوين",bodyFont:"خط النص",headingWeight:"سماكة العناوين",itemWeight:"سماكة أسماء العناصر",text:"النص الرئيسي",muted:"النص الثانوي",accent:"اللون الرئيسي",background:"الخلفية",cards:"البطاقات",category:"الفئات",categoryText:"نص الفئات",density:"الكثافة",navigation:"تنقل الفئات",price:"موضع السعر",imagePosition:"موضع الصورة",imageRatio:"نسبة الصورة",original:"الحالي",removeLogo:"إزالة الشعار" },
};

const titleCase=value=>String(value).replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());

function Choice({active,children,onClick}){return <button type="button" className={`studio-v3-design-choice ${active?"active":""}`} onClick={onClick}>{children}</button>}
function ColorField({label,value,onChange}){return <label className="studio-v3-design-color"><span>{label}</span><span className="studio-v3-design-color-input"><code>{value}</code><input type="color" value={value} onChange={e=>onChange(e.target.value)}/></span></label>}
function SelectField({label,value,values,onChange}){return <label className="studio-v3-design-select"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{values.map(option=><option key={option} value={option}>{titleCase(option)}</option>)}</select></label>}

export default function MenuDesignControls({design,menu,language="en",panel,setPanel,patchDesign}){
  const l=labels[language]||labels.en;
  const patchTheme=(key,value)=>patchDesign(current=>({...current,theme:{...current.theme,[key]:value}}));
  const patchType=(key,value)=>patchDesign(current=>({...current,typography:{...current.typography,[key]:value}}));
  const patchLayout=(key,value)=>patchDesign(current=>({...current,layout:{...current.layout,[key]:value}}));
  const patchBrand=(key,value)=>patchDesign(current=>({...current,brand:{...current.brand,[key]:value}}));
  const logo=menu?.logo_url||menu?.logoUrl||"";

  return <div className="studio-v3-design-pro-controls">
    <div className="studio-v3-design-section"><strong>{l.presets}</strong><div className="studio-v3-design-preset-grid">{Object.keys(MENU_DESIGN_PRESETS).map(key=><Choice key={key} onClick={()=>patchDesign(current=>applyMenuDesignPreset(current,key))}>{titleCase(key)}</Choice>)}</div></div>
    <div className="studio-v3-design-tabs">{[["brand",l.brand],["colors",l.colors],["type",l.typography],["layout",l.layout]].map(([key,label])=><button key={key} className={panel===key?"active":""} onClick={()=>setPanel(key)}>{label}</button>)}</div>

    {panel==="brand"&&<div className="studio-v3-design-section">
      <label className="studio-v3-design-select"><span>{l.logo}</span><input value={logo} placeholder="https://…" onChange={e=>patchDesign(current=>({...current,brand:{...current.brand,logoUrl:e.target.value}}))}/></label>
      <label className="studio-v3-range-field"><span>{l.logoSize} <b>{design.brand.logoSize}px</b></span><input type="range" min="24" max="120" value={design.brand.logoSize} onChange={e=>patchBrand("logoSize",Number(e.target.value))}/></label>
      <SelectField label={l.logoShape} value={design.brand.logoShape} values={["free","rounded","circle","square"]} onChange={value=>patchBrand("logoShape",value)}/>
    </div>}

    {panel==="colors"&&<div className="studio-v3-design-section">
      <div className="studio-v3-palette-grid">{Object.entries(MENU_COLOR_PRESETS).map(([key,preset])=><button type="button" key={key} onClick={()=>patchDesign(current=>applyMenuColorPreset(current,key))}><span className="studio-v3-palette-swatches">{[preset.theme.background,preset.theme.accent,preset.theme.text].map(color=><i key={color} style={{background:color}}/>)}</span><strong>{preset.label}</strong></button>)}</div>
      <ColorField label={l.background} value={design.theme.background} onChange={value=>patchTheme("background",value)}/><ColorField label={l.cards} value={design.theme.card} onChange={value=>patchTheme("card",value)}/><ColorField label={l.text} value={design.theme.text} onChange={value=>patchTheme("text",value)}/><ColorField label={l.muted} value={design.theme.muted} onChange={value=>patchTheme("muted",value)}/><ColorField label={l.accent} value={design.theme.accent} onChange={value=>patchTheme("accent",value)}/><ColorField label={l.category} value={design.theme.categoryBackground} onChange={value=>patchTheme("categoryBackground",value)}/><ColorField label={l.categoryText} value={design.theme.categoryText} onChange={value=>patchTheme("categoryText",value)}/>
    </div>}

    {panel==="type"&&<div className="studio-v3-design-section">
      <SelectField label={l.headingFont} value={design.typography.headingFont} values={MENU_FONT_FAMILIES} onChange={value=>patchType("headingFont",value)}/><SelectField label={l.bodyFont} value={design.typography.bodyFont} values={MENU_FONT_FAMILIES} onChange={value=>patchType("bodyFont",value)}/>
      <div className="studio-v3-design-control-label">{l.headingWeight}</div><div className="studio-v3-design-choice-row">{MENU_FONT_WEIGHTS.map(value=><Choice key={value} active={design.typography.headingWeight===value} onClick={()=>patchType("headingWeight",value)}>{value}</Choice>)}</div>
      <div className="studio-v3-design-control-label">{l.itemWeight}</div><div className="studio-v3-design-choice-row">{MENU_FONT_WEIGHTS.map(value=><Choice key={value} active={design.typography.itemWeight===value} onClick={()=>patchType("itemWeight",value)}>{value}</Choice>)}</div>
      {[['heroSize',30,72],['sectionSize',22,52],['itemNameSize',13,22],['descriptionSize',10,18],['priceSize',13,22]].map(([key,min,max])=><label className="studio-v3-range-field" key={key}><span>{titleCase(key.replace('Size',''))} <b>{design.typography[key]}px</b></span><input type="range" min={min} max={max} value={design.typography[key]} onChange={e=>patchType(key,Number(e.target.value))}/></label>)}
    </div>}

    {panel==="layout"&&<div className="studio-v3-design-section">
      <SelectField label={l.density} value={design.layout.density} values={["compact","comfortable","spacious"]} onChange={value=>patchLayout("density",value)}/><SelectField label={l.navigation} value={design.layout.navigationStyle} values={["pills","underline","minimal"]} onChange={value=>patchLayout("navigationStyle",value)}/><SelectField label={l.price} value={design.layout.pricePosition} values={["inline","below","bottom"]} onChange={value=>patchLayout("pricePosition",value)}/>
      {design.template==="visual"&&<><SelectField label={l.imagePosition} value={design.layout.itemImagePosition} values={["top","left","right"]} onChange={value=>patchLayout("itemImagePosition",value)}/><SelectField label={l.imageRatio} value={design.layout.itemImageRatio} values={["1:1","4:3","3:2","16:9"]} onChange={value=>patchLayout("itemImageRatio",value)}/></>}
      <label className="studio-v3-range-field"><span>Card radius <b>{design.layout.cardRadius}px</b></span><input type="range" min="0" max="28" value={design.layout.cardRadius} onChange={e=>patchLayout("cardRadius",Number(e.target.value))}/></label>
    </div>}
  </div>;
}
