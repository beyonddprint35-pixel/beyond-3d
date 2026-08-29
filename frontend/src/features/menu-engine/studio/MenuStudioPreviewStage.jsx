import { useEffect, useMemo, useRef, useState } from "react";
import MenuRenderer from "../renderer/MenuRenderer";
import "./MenuStudioPreviewStage.css";

const DEVICE_PRESETS = Object.freeze({
  mobile:{ width:390, height:844, outerWidth:422, outerHeight:876 },
  tablet:{ width:768, height:1024, outerWidth:804, outerHeight:1060 },
  desktop:{ width:1280, height:800, outerWidth:1320, outerHeight:888 },
});

const COPY = {
  en:{
    title:"Preview",
    subtitle:"See how your menu feels on the devices your guests actually use.",
    mobile:"Mobile",
    tablet:"Tablet",
    desktop:"Desktop",
    mobileHint:"How most guests will view your menu",
    tabletHint:"Ideal for iPad and table displays",
    desktopHint:"A polished wide-screen experience",
    fit:"Fit",
    zoomOut:"Zoom out",
    zoomIn:"Zoom in",
    resetZoom:"Reset zoom",
    devicePreview:"Menu device preview",
  },
  he:{
    title:"תצוגה מקדימה",
    subtitle:"ראו איך התפריט מרגיש במכשירים שבהם האורחים באמת משתמשים.",
    mobile:"נייד",
    tablet:"טאבלט",
    desktop:"מחשב",
    mobileHint:"כך רוב האורחים יצפו בתפריט",
    tabletHint:"מתאים ל-iPad ולמסכי שולחן",
    desktopHint:"חוויה מלוטשת למסך רחב",
    fit:"התאם",
    zoomOut:"הקטן",
    zoomIn:"הגדל",
    resetZoom:"איפוס זום",
    devicePreview:"תצוגת תפריט לפי מכשיר",
  },
  ar:{
    title:"المعاينة",
    subtitle:"شاهد كيف تبدو قائمتك على الأجهزة التي يستخدمها الضيوف فعليًا.",
    mobile:"هاتف",
    tablet:"جهاز لوحي",
    desktop:"كمبيوتر",
    mobileHint:"هكذا سيشاهد معظم الضيوف قائمتك",
    tabletHint:"مثالي لأجهزة iPad وشاشات الطاولات",
    desktopHint:"تجربة مصقولة للشاشات الواسعة",
    fit:"ملاءمة",
    zoomOut:"تصغير",
    zoomIn:"تكبير",
    resetZoom:"إعادة ضبط التكبير",
    devicePreview:"معاينة القائمة حسب الجهاز",
  },
};

const clamp = (value,min,max) => Math.min(max,Math.max(min,value));

function DeviceIcon({ type }) {
  return <span className={`studio-v3-preview-device-icon ${type}`} aria-hidden="true"><i/></span>;
}

function PreviewContent({ menu, design, language }) {
  return <MenuRenderer menu={menu} design={design} initialLanguage={language}/>;
}

function MobileFrame({ menu, design, language, style }) {
  return <div className="studio-v3-preview-device-shell mobile" style={style}>
    <div className="studio-v3-preview-phone-hardware">
      <span className="studio-v3-preview-dynamic-island" aria-hidden="true"/>
      <div className="studio-v3-preview-device-screen">
        <PreviewContent menu={menu} design={design} language={language}/>
      </div>
      <span className="studio-v3-preview-home-indicator" aria-hidden="true"/>
    </div>
  </div>;
}

function TabletFrame({ menu, design, language, style }) {
  return <div className="studio-v3-preview-device-shell tablet" style={style}>
    <div className="studio-v3-preview-tablet-hardware">
      <span className="studio-v3-preview-tablet-camera" aria-hidden="true"/>
      <div className="studio-v3-preview-device-screen">
        <PreviewContent menu={menu} design={design} language={language}/>
      </div>
    </div>
  </div>;
}

function DesktopFrame({ menu, design, language, style }) {
  return <div className="studio-v3-preview-device-shell desktop" style={style}>
    <div className="studio-v3-preview-laptop-lid">
      <span className="studio-v3-preview-laptop-camera" aria-hidden="true"/>
      <div className="studio-v3-preview-browser">
        <div className="studio-v3-preview-browser-bar" aria-hidden="true">
          <span className="studio-v3-preview-browser-dots"><i/><i/><i/></span>
          <span className="studio-v3-preview-browser-address">b3yondworld.com/menu</span>
          <span className="studio-v3-preview-browser-actions"><i/><i/></span>
        </div>
        <div className="studio-v3-preview-device-screen">
          <PreviewContent menu={menu} design={design} language={language}/>
        </div>
      </div>
    </div>
    <div className="studio-v3-preview-laptop-base" aria-hidden="true"><span/></div>
  </div>;
}

export default function MenuStudioPreviewStage({ menu, design, language="en", uiLanguage="en" }) {
  const copy = COPY[uiLanguage] || COPY.en;
  const stageRef = useRef(null);
  const [deviceKey,setDeviceKey] = useState("mobile");
  const [fitMode,setFitMode] = useState(true);
  const [zoom,setZoom] = useState(.8);
  const [fitScale,setFitScale] = useState(.8);
  const device = DEVICE_PRESETS[deviceKey];
  const deviceHint = copy[`${deviceKey}Hint`];

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      const horizontalRoom = Math.max(180,rect.width - 64);
      const verticalRoom = Math.max(300,rect.height - 70);
      const widthScale = horizontalRoom / device.outerWidth;
      const heightScale = verticalRoom / device.outerHeight;
      const next = clamp(Math.min(widthScale,heightScale,1),.22,1);
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
  },[device.outerWidth,device.outerHeight]);

  const scale = fitMode ? fitScale : zoom;
  const percent = Math.round(scale * 100);
  const holderStyle = useMemo(() => ({
    width:`${Math.round(device.outerWidth * scale)}px`,
    height:`${Math.round(device.outerHeight * scale)}px`,
  }),[device.outerWidth,device.outerHeight,scale]);
  const deviceStyle = useMemo(() => ({
    width:`${device.outerWidth}px`,
    height:`${device.outerHeight}px`,
    transform:`scale(${scale})`,
    "--preview-screen-width":`${device.width}px`,
    "--preview-screen-height":`${device.height}px`,
  }),[device.outerWidth,device.outerHeight,device.width,device.height,scale]);

  function chooseDevice(key) {
    setDeviceKey(key);
    setFitMode(true);
  }
  function changeZoom(delta) {
    setFitMode(false);
    setZoom(clamp(Number((scale + delta).toFixed(2)),.25,1.25));
  }
  function resetZoom() {
    setFitMode(false);
    setZoom(1);
  }

  return <section className="studio-v3-preview-v2" aria-label={copy.devicePreview}>
    <header className="studio-v3-preview-v2-header">
      <div className="studio-v3-preview-v2-heading">
        <span className="studio-v3-preview-v2-eyebrow">{copy.title}</span>
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </div>

      <div className="studio-v3-preview-v2-controls">
        <div className="studio-v3-preview-device-switch" role="tablist" aria-label={copy.devicePreview}>
          {Object.keys(DEVICE_PRESETS).map(key => <button
            type="button"
            key={key}
            role="tab"
            aria-selected={deviceKey===key}
            className={deviceKey===key?"active":""}
            onClick={()=>chooseDevice(key)}
          ><DeviceIcon type={key}/><span>{copy[key]}</span></button>)}
        </div>

        <div className="studio-v3-preview-zoom" role="group" aria-label={copy.resetZoom}>
          <button type="button" onClick={()=>changeZoom(-.08)} aria-label={copy.zoomOut} title={copy.zoomOut}>−</button>
          <button type="button" className="percentage" onClick={resetZoom} title={copy.resetZoom}>{percent}%</button>
          <button type="button" onClick={()=>changeZoom(.08)} aria-label={copy.zoomIn} title={copy.zoomIn}>+</button>
          <button type="button" className={`fit ${fitMode?"active":""}`} onClick={()=>setFitMode(true)}>{copy.fit}</button>
        </div>
      </div>
    </header>

    <div className="studio-v3-preview-v2-device-meta" aria-live="polite">
      <DeviceIcon type={deviceKey}/>
      <div><strong>{copy[deviceKey]}</strong><span>{deviceHint}</span></div>
    </div>

    <div className={`studio-v3-preview-v2-stage device-${deviceKey}`} ref={stageRef}>
      <div className="studio-v3-preview-v2-holder" style={holderStyle}>
        {deviceKey==="mobile"?<MobileFrame menu={menu} design={design} language={language} style={deviceStyle}/>:null}
        {deviceKey==="tablet"?<TabletFrame menu={menu} design={design} language={language} style={deviceStyle}/>:null}
        {deviceKey==="desktop"?<DesktopFrame menu={menu} design={design} language={language} style={deviceStyle}/>:null}
      </div>
    </div>
  </section>;
}
