import { useEffect, useMemo, useState } from "react";
import RestaurantAccessibility from "../../../components/RestaurantAccessibility";
import { normalizeMenuDesign } from "../domain/designSchema";
import { BADGE_LABELS, BADGE_SYMBOLS, normalizeItemMetadata } from "../domain/itemMetadata";
import "./menuRenderer.css";
import "./menuRendererResponsive.css";
import "./menuRendererV3Fixes.css";
import "./menuHeroMedia.css";
import "./menuHeritageClassic.css";

const DEFAULT_CURRENCY_SYMBOL = "₪";
const LANGUAGE_LABELS = { en:"English", he:"עברית", ar:"العربية" };
const FOOTER_COPY = {
  en:{items:"items",accessibility:"Accessibility Statement",powered:"Powered by"},
  he:{items:"פריטים",accessibility:"הצהרת נגישות",powered:"מופעל באמצעות"},
  ar:{items:"عناصر",accessibility:"بيان إمكانية الوصول",powered:"بدعم من"},
};
function chooseText(language,values={}){const en=values.en||"",he=values.he||"",ar=values.ar||"";if(language==="he")return he||ar||en;if(language==="ar")return ar||he||en;return en||he||ar;}
function isRtl(language){return language==="he"||language==="ar";}
function resolvedBadgeStyle(design){return design.badges.iconStyle!=="auto"?design.badges.iconStyle:design.template==="visual"?"filled":"minimal";}
function cleanPrice(value){return String(value??"").replace(/₪/g,"").replace(/\b(?:ILS|NIS)\b/gi,"").trim();}
function formatPrice(value,currencySymbol){const clean=cleanPrice(value);return clean?`${currencySymbol}${clean}`:"";}
function optionLabel(option,language){return option?.[`label_${language}`]||option?.label||option?.label_en||option?.label_he||option?.label_ar||"";}
function displayableGroups(groups){const raw=groups.filter(group=>group&&group.visible!==false);const map=new Map(raw.map(group=>[group.id,group]));const cache=new Map();function valid(group){if(!group)return false;if(cache.has(group.id))return cache.get(group.id);const visited=new Set();let current=group;while(current){if(visited.has(current.id)||current.visible===false){cache.set(group.id,false);return false;}visited.add(current.id);if(!current.parent_id){cache.set(group.id,true);return true;}current=map.get(current.parent_id);if(!current){cache.set(group.id,false);return false;}}cache.set(group.id,false);return false;}return raw.filter(valid);}
function designVariables(design){return{"--bme-bg":design.theme.background,"--bme-surface":design.theme.surface,"--bme-card":design.theme.card,"--bme-text":design.theme.text,"--bme-muted":design.theme.muted,"--bme-accent":design.theme.accent,"--bme-accent-secondary":design.theme.accentSecondary,"--bme-line":design.theme.line,"--bme-category-bg":design.theme.categoryBackground,"--bme-category-text":design.theme.categoryText,"--bme-heading-font":`"${design.typography.headingFont}", "Noto Sans Hebrew", "Noto Sans Arabic", Georgia, serif`,"--bme-body-font":`"${design.typography.bodyFont}", "Noto Sans Hebrew", "Noto Sans Arabic", Arial, sans-serif`,"--bme-number-font":`"${design.typography.numberFont}", "Noto Sans Hebrew", "Noto Sans Arabic", Georgia, serif`,"--bme-heading-weight":design.typography.headingWeight,"--bme-body-weight":design.typography.bodyWeight,"--bme-item-weight":design.typography.itemWeight,"--bme-brand-size":`${design.typography.brandSize}px`,"--bme-hero-size":`${design.typography.heroSize}px`,"--bme-section-size":`${design.typography.sectionSize}px`,"--bme-category-size":`${design.typography.categorySize}px`,"--bme-item-size":`${design.typography.itemNameSize}px`,"--bme-description-size":`${design.typography.descriptionSize}px`,"--bme-price-size":`${design.typography.priceSize}px`,"--bme-logo-size":`${design.brand.logoSize}px`,"--bme-radius":`${design.layout.cardRadius}px`,"--bme-section-gap":`${design.layout.sectionGap}px`,"--bme-item-gap":`${design.layout.itemGap}px`,"--bme-card-padding":`${design.layout.cardPadding}px`};}
function Price({item,currencySymbol,language}){const options=Array.isArray(item.price_options)?item.price_options:[];if(options.length)return <div className="bme-price-options">{options.map((option,index)=><span key={`${option.price}-${index}`} className="bme-price-option">{optionLabel(option,language)?<small>{optionLabel(option,language)}</small>:null}<strong>{formatPrice(option.price,currencySymbol)}</strong></span>)}</div>;return item.price?<strong className="bme-price">{formatPrice(item.price,currencySymbol)}</strong>:null;}
function ItemBadges({item,language,design}){const metadata=normalizeItemMetadata(item.metadata);const keys=[...metadata.merchandising,...metadata.dietary,...metadata.allergens];if(metadata.spice!=="none")keys.push(metadata.spice);if(!keys.length)return null;return <div className="bme-item-badges">{keys.map(key=><span key={key} className={`bme-item-badge bme-badge-${key}`}>{design.badges.showSymbols?<span className="bme-item-badge-symbol" aria-hidden="true">{BADGE_SYMBOLS[key]||"•"}</span>:null}<span>{BADGE_LABELS[key]?.[language]||BADGE_LABELS[key]?.en||key}</span></span>)}</div>;}
function ClassicItem({item,language,design,currencySymbol}){return <article className={`bme-classic-item bme-price-${design.layout.pricePosition}`}><div className="bme-item-copy"><h3>{chooseText(language,item.name)}</h3>{chooseText(language,item.description)?<p>{chooseText(language,item.description)}</p>:null}<ItemBadges item={item} language={language} design={design}/></div><Price item={item} currencySymbol={currencySymbol} language={language}/></article>;}
function VisualItem({item,language,design,currencySymbol}){const name=chooseText(language,item.name),description=chooseText(language,item.description),hasImage=Boolean(item.image_url);return <article className={`bme-visual-item bme-image-${design.layout.itemImagePosition} bme-price-${design.layout.pricePosition}`} data-image-ratio={design.layout.itemImageRatio}>{hasImage?<div className="bme-item-media"><img src={item.image_url} alt={name}/></div>:<div className="bme-item-media bme-item-media-placeholder" aria-hidden="true"><span>BEYOND</span></div>}<div className="bme-visual-copy"><div className="bme-item-copy"><h3>{name}</h3>{description?<p>{description}</p>:null}<ItemBadges item={item} language={language} design={design}/></div><Price item={item} currencySymbol={currencySymbol} language={language}/></div></article>;}
function HeroMedia({mode,logoUrl,imageUrl,restaurantName}){if(mode==="none")return null;if(mode==="image"&&imageUrl)return <div className="bme-hero-media bme-hero-media-image"><img src={imageUrl} alt="" aria-hidden="true"/></div>;if(!logoUrl)return null;return <div className="bme-hero-media bme-hero-media-watermark" aria-hidden="true"><div className="bme-watermark-pill"><img src={logoUrl} alt=""/><span>{restaurantName}</span></div></div>;}

function MenuRenderer({menu,design:designInput,initialLanguage}){
  const design=useMemo(()=>normalizeMenuDesign(designInput),[designInput]);
  const languages=menu?.languages?.length?menu.languages:[menu?.default_language||"en"];
  const [language,setLanguage]=useState(initialLanguage&&languages.includes(initialLanguage)?initialLanguage:(menu?.default_language&&languages.includes(menu.default_language)?menu.default_language:languages[0]));
  useEffect(()=>{if(!languages.includes(language))setLanguage(menu?.default_language&&languages.includes(menu.default_language)?menu.default_language:languages[0]);},[languages.join("|"),language,menu?.default_language]);
  if(!menu)return null;
  const rtl=isRtl(language),currencySymbol=menu.currency_symbol||DEFAULT_CURRENCY_SYMBOL;
  const groups=displayableGroups(menu.groups||[]),topGroups=groups.filter(group=>!group.parent_id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const [activeGroupId,setActiveGroupId]=useState(topGroups[0]?.id||"");
  useEffect(()=>{if(!topGroups.some(group=>group.id===activeGroupId))setActiveGroupId(topGroups[0]?.id||"");},[topGroups.map(group=>group.id).join("|"),activeGroupId]);
  const activeGroup=topGroups.find(group=>group.id===activeGroupId)||topGroups[0];
  const descendants=activeGroup?groups.filter(group=>group.parent_id===activeGroup.id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)):[];
  const blocks=activeGroup?[activeGroup,...descendants].map(group=>({group,items:(menu.items||[]).filter(item=>item.group_id===group.id&&item.visible!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))})):[];
  const totalItems=blocks.reduce((sum,block)=>sum+block.items.length,0);
  const style=designVariables(design),badgeStyle=resolvedBadgeStyle(design),heroMode=design.brand.heroMediaMode||"watermark",heroImageUrl=design.brand.heroImageUrl||"",logoUrl=design.brand.logoUrl||menu.logo_url||"";
  const footer=FOOTER_COPY[language]||FOOTER_COPY.en;
  return <div className={`bme-menu bme-template-${design.template} bme-density-${design.layout.density} bme-nav-${design.layout.categoryNavigation} bme-logo-${design.brand.logoShape} bme-badge-style-${badgeStyle} ${design.stylePreset?`bme-style-${design.stylePreset}`:""}`} style={style} dir={rtl?"rtl":"ltr"} lang={language}>
    <header className="bme-header"><div className="bme-brand">{logoUrl?<img src={logoUrl} alt=""/><div><strong>{menu.restaurant_name}</strong>{menu.restaurant_subtitle?<span>{chooseText(language,menu.restaurant_subtitle)}</span>:null}</div></div>:<div><strong>{menu.restaurant_name}</strong>{menu.restaurant_subtitle?<span>{chooseText(language,menu.restaurant_subtitle)}</span>:null}</div>}</div>{languages.length>1?<div className="bme-languages" aria-label="Menu language">{languages.map(code=><button key={code} className={language===code?"active":""} onClick={()=>setLanguage(code)}>{LANGUAGE_LABELS[code]||code.toUpperCase()}</button>)}</div>:null}</header>
    <section className={`bme-hero bme-hero-mode-${heroMode}`}><HeroMedia mode={heroMode} logoUrl={logoUrl} imageUrl={heroImageUrl} restaurantName={menu.restaurant_name}/><div className="bme-hero-copy">{menu.hero_eyebrow?<span>{chooseText(language,menu.hero_eyebrow)}</span>:null}<h1>{chooseText(language,menu.hero_title)||menu.restaurant_name}</h1></div></section>
    {topGroups.length?<nav className="bme-category-nav">{topGroups.map(group=><button key={group.id} className={group.id===activeGroup?.id?"active":""} onClick={()=>setActiveGroupId(group.id)}>{chooseText(language,group.name)}</button>)}</nav>:null}
    <main className="bme-content">{activeGroup?<section className="bme-section"><div className="bme-section-heading"><h2>{chooseText(language,activeGroup.name)}</h2><span>{totalItems} {footer.items}</span></div><div className="bme-group-blocks">{blocks.map((block,index)=><section className={index===0?"bme-primary-group":"bme-subcategory-section"} key={block.group.id}>{index>0?<div className="bme-subcategory-heading"><h3>{chooseText(language,block.group.name)}</h3></div>:null}{design.template==="visual"?<div className="bme-visual-grid">{block.items.map(item=><VisualItem key={item.id} item={item} language={language} design={design} currencySymbol={currencySymbol}/>)}</div>:<div className="bme-classic-list">{block.items.map(item=><ClassicItem key={item.id} item={item} language={language} design={design} currencySymbol={currencySymbol}/>)}</div>}</section>)}</div></section>:<div className="bme-empty">—</div>}</main>
    <footer className="bme-footer"><button type="button" onClick={()=>window.dispatchEvent(new CustomEvent("beyond-open-accessibility-statement"))}>{footer.accessibility}</button><span>{footer.powered} <strong>Beyond</strong></span></footer>
    <RestaurantAccessibility language={language}/>
  </div>;
}

export default MenuRenderer;
