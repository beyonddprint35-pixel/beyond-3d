import { useEffect, useMemo, useRef, useState } from "react";
import MenuRenderer from "../renderer/MenuRenderer";
import "./MenuStudioMobilePreview.css";

const MOBILE_DEVICE = Object.freeze({ screenWidth: 390, screenHeight: 844, outerWidth: 422, outerHeight: 876 });
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isRtl = (language) => language === "he" || language === "ar";

export default function MenuStudioMobilePreview({ menu, design, language = "en", minScale = 0.3, maxScale = 1, onSelectItem, onSelectCategory }) {
  const stageRef = useRef(null);
  const [scale, setScale] = useState(0.72);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      const horizontalRoom = Math.max(180, rect.width - 44);
      const verticalRoom = Math.max(300, rect.height - 44);
      const next = clamp(Math.min(horizontalRoom / MOBILE_DEVICE.outerWidth, verticalRoom / MOBILE_DEVICE.outerHeight, maxScale), minScale, maxScale);
      setScale(Number.isFinite(next) ? next : 0.72);
    };
    measure();
    if (typeof ResizeObserver === "undefined") { window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); }
    const observer = new ResizeObserver(measure); observer.observe(stage); return () => observer.disconnect();
  }, [maxScale, minScale]);

  const holderStyle = useMemo(() => ({ width: `${Math.round(MOBILE_DEVICE.outerWidth * scale)}px`, height: `${Math.round(MOBILE_DEVICE.outerHeight * scale)}px` }), [scale]);
  const deviceStyle = useMemo(() => ({ width: `${MOBILE_DEVICE.outerWidth}px`, height: `${MOBILE_DEVICE.outerHeight}px`, transform: `scale(${scale})`, "--studio-mobile-screen-width": `${MOBILE_DEVICE.screenWidth}px`, "--studio-mobile-screen-height": `${MOBILE_DEVICE.screenHeight}px` }), [scale]);

  const broadcast = (detail) => window.dispatchEvent(new CustomEvent("beyond-content-preview-select", { detail }));
  const handlePreviewEvent = (event) => {
    if (event?.type !== "item_open" || !event.entityId) return;
    onSelectItem?.(event.entityId);
    broadcast(event);
  };
  const handlePreviewClick = (event) => {
    const button = event.target.closest?.(".bme-category-nav button, .ep-tabs button");
    if (!button) return;
    const label = String(button.textContent || "").trim();
    if (!label) return;
    onSelectCategory?.(label);
    broadcast({ type: "category_click", label, language });
  };

  return <div className="menu-studio-mobile-preview-fit" ref={stageRef}><div className="menu-studio-mobile-preview-holder" style={holderStyle}><div className="menu-studio-mobile-preview-device" style={deviceStyle}><div className="menu-studio-mobile-preview-hardware"><span className="menu-studio-mobile-preview-island" aria-hidden="true" /><div className="menu-studio-mobile-preview-screen" dir={isRtl(language) ? "rtl" : "ltr"} lang={language} onClickCapture={handlePreviewClick}><div className="menu-studio-mobile-preview-scroll"><MenuRenderer menu={{ ...menu, default_language: language }} design={design} initialLanguage={language} onAnalyticsEvent={handlePreviewEvent} /></div></div><span className="menu-studio-mobile-preview-home" aria-hidden="true" /></div></div></div></div>;
}
