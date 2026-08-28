import { useEffect, useMemo, useRef, useState } from "react";
import MenuRenderer from "../renderer/MenuRenderer";
import "./MenuStudioDesignCanvas.css";

const VIEWPORTS = Object.freeze({
  mobile: { width:390, height:780 },
  tablet: { width:768, height:820 },
  desktop: { width:1080, height:720 },
});

const COPY = {
  en:{mobile:"Mobile",tablet:"Tablet",desktop:"Desktop",fit:"Fit",zoomOut:"Zoom out",zoomIn:"Zoom in",resetZoom:"Reset to 100%",live:"Live"},
  he:{mobile:"נייד",tablet:"טאבלט",desktop:"מחשב",fit:"התאם",zoomOut:"הקטן",zoomIn:"הגדל",resetZoom:"חזרה ל־100%",live:"חי"},
  ar:{mobile:"هاتف",tablet:"جهاز لوحي",desktop:"سطح المكتب",fit:"ملاءمة",zoomOut:"تصغير",zoomIn:"تكبير",resetZoom:"العودة إلى 100%",live:"مباشر"},
};

const clamp = (value,min,max) => Math.min(max,Math.max(min,value));

function DeviceIcon({ type }) {
  return <span className={`studio-v3-canvas-device-icon ${type}`} aria-hidden="true"/>;
}

export default function MenuStudioDesignCanvas({ menu, design, language="en", uiLanguage="en", label="Live preview" }) {
  const copy = COPY[uiLanguage] || COPY.en;
  const stageRef = useRef(null);
  const [deviceKey,setDeviceKey] = useState("mobile");
  const [fitMode,setFitMode] = useState(true);
  const [zoom,setZoom] = useState(.8);
  const [fitScale,setFitScale] = useState(.8);
  const device = VIEWPORTS[deviceKey];

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      const widthScale = Math.max(0,(rect.width - 58) / device.width);
      const heightScale = Math.max(0,(rect.height - 58) / device.height);
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
  },[device.width,device.height]);

  const scale = fitMode ? fitScale : zoom;
  const percent = Math.round(scale * 100);
  const holderStyle = useMemo(() => ({ width:`${Math.round(device.width * scale)}px`, height:`${Math.round(device.height * scale)}px` }),[device.width,device.height,scale]);
  const deviceStyle = useMemo(() => ({ width:`${device.width}px`, height:`${device.height}px`, transform:`scale(${scale})` }),[device.width,device.height,scale]);

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

  return <div className="studio-v3-design-canvas-workspace">
    <div className="studio-v3-design-canvas-toolbar">
      <div className="studio-v3-design-canvas-title">
        <span className="studio-v3-design-canvas-live"><i aria-hidden="true"/>{copy.live}</span>
        <strong>{label}</strong>
      </div>

      <div className="studio-v3-design-canvas-device-switch" role="group" aria-label="Preview viewport">
        {Object.keys(VIEWPORTS).map(key => <button type="button" key={key} className={deviceKey===key?"active":""} onClick={()=>chooseDevice(key)} title={`${VIEWPORTS[key].width}px`}><DeviceIcon type={key}/><span>{copy[key]}</span></button>)}
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
          <div className="studio-v3-design-device-scroll">
            <MenuRenderer menu={menu} design={design} initialLanguage={language}/>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
