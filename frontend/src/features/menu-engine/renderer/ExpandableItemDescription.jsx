import { useEffect, useMemo, useState } from "react";
import "./menuExpandableDescriptions.css";

const COPY = {
  en:{more:"More",less:"Less",expand:"Show full description",collapse:"Collapse description"},
  he:{more:"עוד",less:"פחות",expand:"הצג תיאור מלא",collapse:"סגור תיאור"},
  ar:{more:"المزيد",less:"أقل",expand:"عرض الوصف الكامل",collapse:"طي الوصف"},
};

function shouldCollapse(text){
  const value=String(text||"").trim();
  if(!value)return false;
  const words=value.split(/\s+/u).filter(Boolean).length;
  return value.length>86||words>15;
}

export default function ExpandableItemDescription({description,language="en"}){
  const text=String(description||"").trim();
  const collapsible=useMemo(()=>shouldCollapse(text),[text]);
  const [expanded,setExpanded]=useState(false);
  const copy=COPY[language]||COPY.en;

  useEffect(()=>{setExpanded(false);},[text,language]);
  if(!text)return null;
  if(!collapsible)return <p className="bme-item-description">{text}</p>;

  return <button
    type="button"
    className={`bme-item-description-toggle ${expanded?"is-expanded":"is-collapsed"}`}
    aria-expanded={expanded}
    aria-label={expanded?copy.collapse:copy.expand}
    onClick={(event)=>{
      event.stopPropagation();
      setExpanded(current=>!current);
    }}
  >
    <span className="bme-item-description-text">{text}</span>
    <span className="bme-item-description-more" aria-hidden="true">{expanded?copy.less:copy.more}<i/></span>
  </button>;
}
