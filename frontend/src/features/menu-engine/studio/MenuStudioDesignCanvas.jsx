import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MenuRenderer from "../renderer/MenuRenderer";
import installMenuTypographyGuard from "../renderer/menuTypographyGuard";
import "./MenuStudioDesignCanvas.css";

const VIEWPORTS = Object.freeze({
  mobile: { width:390, height:780 },
  tablet: { width:768, height:820 },
  desktop: { width:1080, height:720 },
});
const DEVICE_CHROME_HEIGHT = 24;
const PREVIEW_DOCUMENT = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head><body><div id='beyond-menu-preview-root'></div></body></html>";

const COPY = {
  en:{mobile:"Mobile",tablet:"Tablet",desktop:"Desktop",fit:"Fit",zoomOut:"Zoom out",zoomIn:"Zoom in",resetZoom:"Reset to 100%",live:"Live",editHint:"Click any part of the menu to edit it"},
  he:{mobile:"נייד",tablet:"טאבלט",desktop:"מחשב",fit:"התאם",zoomOut:"הקטן",zoomIn:"הגדל",resetZoom:"חזרה ל־100%",live:"חי",editHint:"לחצו על כל חלק בתפריט כדי לערוך אותו"},
  ar:{mobile:"هاتف",tablet:"جهاز لوحي",desktop:"سطح المكتب",fit:"ملاءمة",zoomOut:"تصغير",zoomIn:"تكبير",resetZoom:"العودة إلى 100%",live:"مباشر",editHint:"انقر على أي جزء من القائمة لتعديله"},
};

const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
const TARGET_SELECTOR = ".bme-item-badge,.bme-visual-item,.bme-classic-item,.bme-category-nav,.bme-hero,.bme-brand,.bme-header,.ep-item-row,.ep-tabs-wrap,.ep-hero,.ep-brand,.ep-header";

function targetName(node) {
  if (!node) return "";
  if (node.classList.contains("bme-item-badge")) return "badges";
  if (node.classList.contains("bme-visual-item") || node.classList.contains("bme-classic-item") || node.classList.contains("ep-item-row")) return "items";
  if (node.classList.contains("bme-category-nav") || node.classList.contains("ep-tabs-wrap")) return "categories";
  if (node.classList.contains("bme-hero") || node.classList.contains("ep-hero")) return "hero";
  if (node.classList.contains("bme-brand") || node.classList.contains("ep-brand")) return "brand";
  if (node.classList.contains("bme-header") || node.classList.contains("ep-header")) return "brand";
  return "";
}

function DeviceIcon({ type }) {
  return <span className={`studio-v3-canvas-device-icon ${type}`} aria-hidden="true"/>;
}

function clonePreviewStyles(targetDocument) {
  targetDocument.head.querySelectorAll("[data-beyond-preview-style]").forEach((node) => node.remove());
  document.querySelectorAll('link[rel="stylesheet"],style').forEach((node) => {
    const clone = node.cloneNode(true);
    clone.setAttribute("data-beyond-preview-style", "true");
    targetDocument.head.appendChild(clone);
  });

  const previewBase = targetDocument.createElement("style");
  previewBase.setAttribute("data-beyond-preview-style", "true");
  previewBase.textContent = `
    html,body,#beyond-menu-preview-root{margin:0;min-height:100%;width:100%;background:#fff}
    html{scrollbar-width:none}
    html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}
    body{overflow-x:hidden}
    #beyond-menu-preview-root{isolation:isolate}
    .restaurant-a11y-toggle,.restaurant-a11y-panel,.restaurant-a11y-statement-backdrop{display:none!important}
    .bme-item-media-placeholder{position:relative!important;display:grid!important;place-items:center!important;background:radial-gradient(circle at 28% 24%,color-mix(in srgb,var(--bme-accent) 20%,transparent),transparent 34%),linear-gradient(145deg,color-mix(in srgb,var(--bme-accent-secondary) 62%,var(--bme-card)),color-mix(in srgb,var(--bme-card) 82%,var(--bme-bg)))!important;color:var(--bme-muted)!important}
    .bme-item-media-placeholder span{display:none!important}
    .bme-item-media-placeholder:before{content:"";width:42px;height:32px;border:1px solid color-mix(in srgb,var(--bme-text) 24%,transparent);border-radius:9px;background:linear-gradient(145deg,transparent 54%,color-mix(in srgb,var(--bme-text) 12%,transparent) 55% 64%,transparent 65%),color-mix(in srgb,var(--bme-surface) 72%,transparent);box-shadow:0 8px 22px color-mix(in srgb,var(--bme-text) 10%,transparent)}
    .bme-item-media-placeholder:after{content:"PHOTO";position:absolute;inset-inline:0;bottom:18%;text-align:center;font:800 8px/1 var(--bme-body-font);letter-spacing:.18em;color:color-mix(in srgb,var(--bme-text) 52%,transparent)}
    .beyond-design-target-hover{outline:2px solid #4974e5!important;outline-offset:-2px!important;cursor:pointer!important}
    .beyond-design-target-selected{outline:3px solid #4974e5!important;outline-offset:-3px!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.75)!important}
  `;
  targetDocument.head.appendChild(previewBase);
}

export default function MenuStudioDesignCanvas({ menu, design, language="en", uiLanguage="en", label="Live preview", compact=false }) {
  const copy = COPY[uiLanguage] || COPY.en;
  const stageRef = useRef(null);
  const iframeRef = useRef(null);
  const [iframeRoot,setIframeRoot] = useState(null);
  const [deviceKey,setDeviceKey] = useState("mobile");
  const [fitMode,setFitMode] = useState(true);
  const [zoom,setZoom] = useState(.8);
  const [fitScale,setFitScale] = useState(.8);
  const device = VIEWPORTS[deviceKey];
  const outerHeight = device.height + DEVICE_CHROME_HEIGHT;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      const widthScale = Math.max(0,(rect.width - 58) / device.width);
      const heightScale = Math.max(0,(rect.height - 58) / outerHeight);
      const next = clamp(Math.min(widthScale,heightScale,1),.34,1);
      setFitScale(Number.isFinite(next) ? next : .8);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize",measure);
      return () => window.removeEventListener("resize",measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  },[device.width,outerHeight]);

  useEffect(() => {
    if (!iframeRoot?.ownerDocument) return undefined;
    return installMenuTypographyGuard(iframeRoot.ownerDocument);
  },[iframeRoot]);

  useEffect(() => {
    const frameDocument = iframeRoot?.ownerDocument;
    if (!frameDocument) return undefined;
    let hovered = null;
    let selected = null;
    const resolve = event => event.target?.closest?.(TARGET_SELECTOR) || null;
    const onPointerOver = event => {
      const node = resolve(event);
      if (hovered === node) return;
      hovered?.classList.remove("beyond-design-target-hover");
      hovered = node;
      hovered?.classList.add("beyond-design-target-hover");
    };
    const onPointerOut = event => {
      if (!hovered) return;
      const next = event.relatedTarget;
      if (next && hovered.contains(next)) return;
      hovered.classList.remove("beyond-design-target-hover");
      hovered = null;
    };
    const onClick = event => {
      const node = resolve(event);
      const focus = targetName(node);
      if (!node || !focus) return;
      selected?.classList.remove("beyond-design-target-selected");
      selected = node;
      selected.classList.add("beyond-design-target-selected");
      window.dispatchEvent(new CustomEvent("beyond-menu-design-focus",{detail:{focus}}));
    };
    frameDocument.addEventListener("pointerover",onPointerOver,true);
    frameDocument.addEventListener("pointerout",onPointerOut,true);
    frameDocument.addEventListener("click",onClick,true);
    return () => {
      hovered?.classList.remove("beyond-design-target-hover");
      selected?.classList.remove("beyond-design-target-selected");
      frameDocument.removeEventListener("pointerover",onPointerOver,true);
      frameDocument.removeEventListener("pointerout",onPointerOut,true);
      frameDocument.removeEventListener("click",onClick,true);
    };
  },[iframeRoot,design?.template,design?.layout?.presentation]);

  useEffect(() => {
    const frame = iframeRef.current;
    const frameWindow = frame?.contentWindow;
    const frameDocument = frame?.contentDocument;
    if (!frameWindow || !frameDocument) return;
    try {
      frameWindow.scrollTo(0,0);
      if (frameDocument.documentElement) frameDocument.documentElement.scrollTop = 0;
      if (frameDocument.body) frameDocument.body.scrollTop = 0;
    } catch {
      // The iframe can briefly be between documents while srcDoc is mounting.
      // Scrolling is cosmetic, so never let that transient state crash Studio.
    }
  },[deviceKey,design?.template,design?.layout?.presentation,language,iframeRoot]);

  const scale = fitMode ? fitScale : zoom;
  const percent = Math.round(scale * 100);
  const holderStyle = useMemo(() => ({ width:`${Math.round(device.width * scale)}px`, height:`${Math.round(outerHeight * scale)}px` }),[device.width,outerHeight,scale]);
  const deviceStyle = useMemo(() => ({ width:`${device.width}px`, height:`${outerHeight}px`, transform:`scale(${scale})` }),[device.width,outerHeight,scale]);

  function preparePreviewFrame() {
    const frameDocument = iframeRef.current?.contentDocument;
    if (!frameDocument?.head) return;
    clonePreviewStyles(frameDocument);
    setIframeRoot(frameDocument.getElementById("beyond-menu-preview-root"));
  }

  function chooseDevice(key) {
    setDeviceKey(key);
    setFitMode(true);
  }
  function changeZoom(delta) {
    setFitMode(false);
    setZoom(clamp(Number((scale + delta).toFixed(2)),.35,1.35));
  }
  function resetZoom() {
    setFitMode(false);
    setZoom(1);
  }

  return <div className={`studio-v3-design-canvas-workspace${compact ? " compact" : ""}`}>
    <div className="studio-v3-design-canvas-toolbar">
      <div className="studio-v3-design-canvas-title">
        <span className="studio-v3-design-canvas-live"><i aria-hidden="true"/>{copy.live}</span>
        <strong>{label}</strong>
        <small>{copy.editHint}</small>
      </div>

      <div className="studio-v3-design-canvas-device-switch" role="group" aria-label="Preview viewport">
        {Object.keys(VIEWPORTS).map(key => <button type="button" key={key} className={deviceKey===key?"active":""} onClick={()=>chooseDevice(key)} aria-label={copy[key]} aria-pressed={deviceKey===key} title={`${VIEWPORTS[key].width}px`}><DeviceIcon type={key}/><span>{copy[key]}</span></button>)}
      </div>

      <div className="studio-v3-design-canvas-zoom" role="group" aria-label="Preview zoom">
        <button type="button" onClick={()=>changeZoom(-.1)} aria-label={copy.zoomOut} title={copy.zoomOut}>−</button>
        <button type="button" className="percentage" onClick={resetZoom} title={copy.resetZoom}>{percent}%</button>
        <button type="button" onClick={()=>changeZoom(.1)} aria-label={copy.zoomIn} title={copy.zoomIn}>+</button>
        <button type="button" className={`fit ${fitMode?"active":""}`} onClick={()=>setFitMode(true)}>{copy.fit}</button>
      </div>
    </div>

    <div className="studio-v3-design-canvas-stage" ref={stageRef}>
      <div className="studio-v3-design-canvas-size-label">{device.width} × {device.height}</div>
      <div className="studio-v3-design-canvas-holder" style={holderStyle}>
        <div className={`studio-v3-design-device-frame ${deviceKey}`} style={deviceStyle}>
          <div className="studio-v3-design-device-chrome" aria-hidden="true"><span/><span/><span/></div>
          <iframe
            ref={iframeRef}
            className="studio-v3-design-device-iframe"
            title={`${copy[deviceKey]} menu preview`}
            srcDoc={PREVIEW_DOCUMENT}
            onLoad={preparePreviewFrame}
          />
          {iframeRoot ? createPortal(
            <MenuRenderer menu={menu} design={design} initialLanguage={language} previewMode showAccessibility={false}/>,
            iframeRoot,
          ) : null}
        </div>
      </div>
    </div>
  </div>;
}
