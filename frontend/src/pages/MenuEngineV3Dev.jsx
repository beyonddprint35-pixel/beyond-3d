import { useMemo, useState } from "react";
import MenuRenderer from "../features/menu-engine/renderer/MenuRenderer";
import { DEFAULT_MENU_DESIGN } from "../features/menu-engine/domain/designSchema";
import "./MenuEngineV3Dev.css";

const SAMPLE_MENU = {
  restaurant_name: "El Puerto",
  subtitle: {
    en: "Bar · Cafe",
    he: "בר · קפה",
  },
  hero_kicker: {
    en: "Digital Menu",
    he: "תפריט דיגיטלי",
  },
  hero_title: {
    en: "Our Menu",
    he: "התפריט שלנו",
  },
  languages: ["he", "en"],
  default_language: "he",
  groups: [
    { id: "draft", name: { en: "Draft Beer", he: "בירה מהחבית" } },
    { id: "food", name: { en: "Food & Snacks", he: "אוכל ונשנושים" } },
    { id: "bottles", name: { en: "Bottled Beer", he: "בירה בבקבוק" } },
  ],
  items: [
    {
      id: "guinness",
      group_id: "draft",
      name: { en: "Guinness", he: "גינס" },
      description: { en: "Dark Irish stout, 4.2%", he: "סטאוט אירי כהה, 4.2%" },
      price_options: [
        { label: "330ml", price: "₪28" },
        { label: "500ml", price: "₪35" },
      ],
      image_url: "",
    },
    {
      id: "weihenstephan",
      group_id: "draft",
      name: { en: "Weihenstephan", he: "וויינשטפן" },
      description: { en: "German wheat beer", he: "בירת חיטה גרמנית" },
      price_options: [
        { label: "330ml", price: "₪28" },
        { label: "500ml", price: "₪35" },
      ],
      image_url: "",
    },
    {
      id: "carlsberg",
      group_id: "draft",
      name: { en: "Carlsberg", he: "קרלסברג" },
      description: { en: "Crisp lager", he: "לאגר בהיר ורענן" },
      price_options: [
        { label: "330ml", price: "₪25" },
        { label: "500ml", price: "₪32" },
      ],
      image_url: "",
    },
    {
      id: "nachos",
      group_id: "food",
      name: { en: "Nachos", he: "נאצ׳וס" },
      description: { en: "Salsa, cheese and jalapeño", he: "סלסה, גבינה וחלפיניו" },
      price: "₪42",
      image_url: "",
    },
    {
      id: "fries",
      group_id: "food",
      name: { en: "French Fries", he: "צ׳יפס" },
      description: { en: "Golden and crispy", he: "זהוב וקריספי" },
      price: "₪28",
      image_url: "",
    },
    {
      id: "corona",
      group_id: "bottles",
      name: { en: "Corona", he: "קורונה" },
      description: { en: "Bottle", he: "בקבוק" },
      price: "₪30",
      image_url: "",
    },
  ],
};

export default function MenuEngineV3Dev() {
  const [template, setTemplate] = useState("classic");
  const [viewport, setViewport] = useState("390");

  const design = useMemo(
    () => ({
      ...DEFAULT_MENU_DESIGN,
      template,
      theme: { ...DEFAULT_MENU_DESIGN.theme },
      typography: { ...DEFAULT_MENU_DESIGN.typography },
      layout: { ...DEFAULT_MENU_DESIGN.layout },
    }),
    [template]
  );

  const width = viewport === "desktop" ? "min(1120px, 100%)" : `${viewport}px`;

  return (
    <div className="v3-dev-page">
      <header className="v3-dev-toolbar">
        <div>
          <strong>BEYOND MENU ENGINE V3</strong>
          <span>Local development preview · not connected to production</span>
        </div>

        <div className="v3-dev-controls">
          <div className="v3-dev-segment" aria-label="Template">
            <button className={template === "classic" ? "active" : ""} onClick={() => setTemplate("classic")}>Classic</button>
            <button className={template === "visual" ? "active" : ""} onClick={() => setTemplate("visual")}>Visual</button>
          </div>

          <div className="v3-dev-segment" aria-label="Viewport">
            {["320", "375", "390", "430"].map(size => (
              <button key={size} className={viewport === size ? "active" : ""} onClick={() => setViewport(size)}>{size}</button>
            ))}
            <button className={viewport === "desktop" ? "active" : ""} onClick={() => setViewport("desktop")}>Desktop</button>
          </div>
        </div>
      </header>

      <main className="v3-dev-stage">
        <div className="v3-dev-frame" style={{ width }}>
          <MenuRenderer menu={SAMPLE_MENU} design={design} />
        </div>
      </main>
    </div>
  );
}
