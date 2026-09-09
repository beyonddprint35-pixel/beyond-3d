import { useEffect, useRef } from "react";
import { Maximize2, Move, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import "./HeroImageFramingControl.css";

const COPY = {
  en: {
    title: "Position hero photo",
    hint: "Drag the preview or tap a position. Use zoom to choose the crop.",
    zoom: "Zoom",
    horizontal: "Horizontal position",
    vertical: "Vertical position",
    reset: "Reset framing",
    drag: "Drag photo to reposition",
    position: "Quick position",
    topLeft: "Top left",
    topCenter: "Top center",
    topRight: "Top right",
    centerLeft: "Center left",
    center: "Center",
    centerRight: "Center right",
    bottomLeft: "Bottom left",
    bottomCenter: "Bottom center",
    bottomRight: "Bottom right",
  },
  he: {
    title: "מיקום תמונת ה-Hero",
    hint: "גררו את התצוגה או בחרו מיקום. השתמשו בזום כדי לבחור את החיתוך.",
    zoom: "זום",
    horizontal: "מיקום אופקי",
    vertical: "מיקום אנכי",
    reset: "איפוס המסגור",
    drag: "גררו את התמונה כדי למקם אותה",
    position: "מיקום מהיר",
    topLeft: "למעלה שמאל",
    topCenter: "למעלה מרכז",
    topRight: "למעלה ימין",
    centerLeft: "מרכז שמאל",
    center: "מרכז",
    centerRight: "מרכז ימין",
    bottomLeft: "למטה שמאל",
    bottomCenter: "למטה מרכז",
    bottomRight: "למטה ימין",
  },
  ar: {
    title: "موضع صورة الواجهة",
    hint: "اسحب المعاينة أو اختر موضعاً، واستخدم التكبير لاختيار القص.",
    zoom: "التكبير",
    horizontal: "الموضع الأفقي",
    vertical: "الموضع العمودي",
    reset: "إعادة ضبط الإطار",
    drag: "اسحب الصورة لتغيير موضعها",
    position: "موضع سريع",
    topLeft: "أعلى اليسار",
    topCenter: "أعلى الوسط",
    topRight: "أعلى اليمين",
    centerLeft: "وسط اليسار",
    center: "الوسط",
    centerRight: "وسط اليمين",
    bottomLeft: "أسفل اليسار",
    bottomCenter: "أسفل الوسط",
    bottomRight: "أسفل اليمين",
  },
};

const POSITION_PRESETS = Object.freeze([
  { key: "topLeft", x: 20, y: 20 },
  { key: "topCenter", x: 50, y: 20 },
  { key: "topRight", x: 80, y: 20 },
  { key: "centerLeft", x: 20, y: 50 },
  { key: "center", x: 50, y: 50 },
  { key: "centerRight", x: 80, y: 50 },
  { key: "bottomLeft", x: 20, y: 80 },
  { key: "bottomCenter", x: 50, y: 80 },
  { key: "bottomRight", x: 80, y: 80 },
]);

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function applyFramingToLivePreview({ focusX, focusY, zoom }) {
  if (typeof document === "undefined") return;
  const objectPosition = `${focusX}% ${focusY}%`;
  const transform = `scale(${zoom})`;

  document.querySelectorAll(".studio-v3-design-device-iframe").forEach((frame) => {
    const frameDocument = frame?.contentDocument;
    if (!frameDocument) return;

    frameDocument
      .querySelectorAll(".bme-hero-media-image img, .ep-hero-background-image")
      .forEach((image) => {
        image.style.setProperty("object-position", objectPosition, "important");
        image.style.setProperty("transform", transform, "important");
        image.style.setProperty("transform-origin", objectPosition, "important");
      });
  });
}

export default function HeroImageFramingControl({ design, language = "en", patchDesign }) {
  const dragRef = useRef(null);
  const t = COPY[language] || COPY.en;
  const brand = design?.brand || {};
  const imageUrl = String(brand.heroImageUrl || "");
  const enabled = brand.heroMediaMode === "image" && Boolean(imageUrl);
  const zoom = clamp(brand.heroImageZoom, 1, 3, 1);
  const focusX = clamp(brand.heroImageFocusX, 0, 100, 50);
  const focusY = clamp(brand.heroImageFocusY, 0, 100, 50);

  // The live Design Studio preview is rendered through a React portal inside a
  // srcDoc iframe. Mirror the persisted framing directly onto the live hero so
  // every framing change is immediately WYSIWYG.
  useEffect(() => {
    if (!enabled) return undefined;
    const framing = { focusX, focusY, zoom };
    applyFramingToLivePreview(framing);
    const animationFrame = window.requestAnimationFrame(() => applyFramingToLivePreview(framing));
    return () => window.cancelAnimationFrame(animationFrame);
  }, [enabled, imageUrl, focusX, focusY, zoom]);

  if (!enabled) return null;

  function patchFraming(values) {
    patchDesign?.((current) => ({
      ...current,
      brand: {
        ...current.brand,
        ...values,
      },
    }));
  }

  function beginDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      focusX,
      focusY,
      width: Math.max(1, box.width),
      height: Math.max(1, box.height),
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    const nextX = clamp(drag.focusX - (dx / drag.width) * 100 / zoom, 0, 100, 50);
    const nextY = clamp(drag.focusY - (dy / drag.height) * 100 / zoom, 0, 100, 50);
    patchFraming({ heroImageFocusX: nextX, heroImageFocusY: nextY });
    applyFramingToLivePreview({ focusX: nextX, focusY: nextY, zoom });
  }

  function endDrag(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function selectPosition(position) {
    patchFraming({ heroImageFocusX: position.x, heroImageFocusY: position.y });
    applyFramingToLivePreview({ focusX: position.x, focusY: position.y, zoom });
  }

  const previewStyle = {
    objectPosition: `${focusX}% ${focusY}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${focusX}% ${focusY}%`,
  };

  return (
    <section className="hero-framing-control" aria-label={t.title}>
      <div className="hero-framing-head">
        <div>
          <strong>{t.title}</strong>
          <small>{t.hint}</small>
        </div>
        <button type="button" onClick={() => patchFraming({ heroImageZoom: 1, heroImageFocusX: 50, heroImageFocusY: 50 })}>
          <RotateCcw size={13} aria-hidden="true" /> {t.reset}
        </button>
      </div>

      <div className="hero-framing-body">
        <div
          className="hero-framing-preview"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          role="img"
          aria-label={t.drag}
        >
          <img src={imageUrl} alt="" draggable="false" style={previewStyle} />
          <span className="hero-framing-drag-hint"><Move size={14} aria-hidden="true" /> {t.drag}</span>
          <span className="hero-framing-crosshair" aria-hidden="true"><Maximize2 size={16} /></span>
        </div>

        <div className="hero-framing-position">
          <span>{t.position}</span>
          <div className="hero-framing-position-grid" role="group" aria-label={t.position}>
            {POSITION_PRESETS.map((position) => {
              const active = Math.abs(focusX - position.x) <= 5 && Math.abs(focusY - position.y) <= 5;
              return (
                <button
                  key={position.key}
                  type="button"
                  className={active ? "active" : ""}
                  aria-label={t[position.key]}
                  aria-pressed={active}
                  title={t[position.key]}
                  onClick={() => selectPosition(position)}
                ><span aria-hidden="true" /></button>
              );
            })}
          </div>
        </div>
      </div>

      <label className="hero-framing-range hero-framing-range-zoom">
        <span><ZoomOut size={13} aria-hidden="true" /> {t.zoom} <b>{zoom.toFixed(2)}×</b> <ZoomIn size={13} aria-hidden="true" /></span>
        <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => patchFraming({ heroImageZoom: Number(event.target.value) })} />
      </label>

      <label className="hero-framing-range hero-framing-range-x">
        <span>{t.horizontal} <b>{Math.round(focusX)}%</b></span>
        <input type="range" min="0" max="100" step="1" value={focusX} onChange={(event) => patchFraming({ heroImageFocusX: Number(event.target.value) })} />
      </label>

      <label className="hero-framing-range hero-framing-range-y">
        <span>{t.vertical} <b>{Math.round(focusY)}%</b></span>
        <input type="range" min="0" max="100" step="1" value={focusY} onChange={(event) => patchFraming({ heroImageFocusY: Number(event.target.value) })} />
      </label>
    </section>
  );
}
