import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import MenuHomeRefined from "./MenuHomeRefined";

import "./MenuHomeCustomerPreview.css";


const PREVIEW_STORAGE_KEY =
  "beyond-mobile-menu-preview-v2";


const HOMEPAGE_DEMO_MENU = {
  restaurant_name:
    "Luna Bistro",

  requested_languages: [
    "en",
    "he",
  ],

  detected_language:
    "en",

  sections: [
    {
      name_en:
        "Food",

      name_he:
        "אוכל",

      items: [
        {
          name_en:
            "Burrata & Tomatoes",

          name_he:
            "בוראטה ועגבניות",

          description_en:
            "Fresh burrata, seasonal tomatoes, basil oil",

          description_he:
            "בוראטה טרייה, עגבניות עונתיות ושמן בזיליקום",

          price:
            "₪46",
        },
        {
          name_en:
            "Truffle Rigatoni",

          name_he:
            "ריגטוני כמהין",

          description_en:
            "Creamy truffle sauce, parmesan, black pepper",

          description_he:
            "רוטב כמהין קרמי, פרמזן ופלפל שחור",

          price:
            "₪68",
        },
        {
          name_en:
            "Sea Bass",

          name_he:
            "לברק",

          description_en:
            "Charred greens, lemon butter, herbs",

          description_he:
            "ירוקים צרובים, חמאת לימון ועשבי תיבול",

          price:
            "₪84",
        },
      ],
    },
    {
      name_en:
        "Cocktails",

      name_he:
        "קוקטיילים",

      items: [
        {
          name_en:
            "Luna Spritz",

          name_he:
            "לונה שפריץ",

          description_en:
            "Aperitivo, prosecco, grapefruit",

          description_he:
            "אפריטיבו, פרוסקו ואשכולית",

          price:
            "₪48",
        },
        {
          name_en:
            "Garden Gimlet",

          name_he:
            "גרדן גימלט",

          description_en:
            "Gin, lime, basil, cucumber",

          description_he:
            "ג׳ין, ליים, בזיליקום ומלפפון",

          price:
            "₪52",
        },
      ],
    },
    {
      name_en:
        "Desserts",

      name_he:
        "קינוחים",

      items: [
        {
          name_en:
            "Tiramisu",

          name_he:
            "טירמיסו",

          description_en:
            "Espresso, mascarpone, cocoa",

          description_he:
            "אספרסו, מסקרפונה וקקאו",

          price:
            "₪38",
        },
        {
          name_en:
            "Basque Cheesecake",

          name_he:
            "עוגת גבינה באסקית",

          description_en:
            "Vanilla cream, berries",

          description_he:
            "קרם וניל ופירות יער",

          price:
            "₪42",
        },
      ],
    },
  ],
};


const HOMEPAGE_DEMO_BRANDING = {
  design_preset:
    "home",

  display_name:
    "LUNA BISTRO",

  subtitle:
    "restaurant · bar · café",

  hero_title_en:
    "Our Menu",

  hero_title_he:
    "התפריט שלנו",

  background:
    "#f3f0e9",

  header_background:
    "#f3f0e9",

  hero_background:
    "#fffdf8",

  paper:
    "#fffdf8",

  card:
    "#ffffff",

  text:
    "#161815",

  muted:
    "#746f67",

  accent:
    "#62724b",

  accent_secondary:
    "#d8c9a7",

  line:
    "#e1dbcf",

  category_background:
    "#1f281b",

  category_text:
    "#ffffff",

  heading_font:
    "Playfair Display",

  body_font:
    "Inter",

  brand_font_size:
    19,

  hero_font_size:
    46,

  section_font_size:
    38,

  category_font_size:
    11,

  item_name_font_size:
    16,

  description_font_size:
    11,

  price_font_size:
    16,

  secondary_font_size:
    10,

  logo_url:
    null,

  logo_shape:
    "free",
};


export default function MenuHomeCustomerPreview() {
  const [
    phoneTarget,
    setPhoneTarget,
  ] =
    useState(null);


  useEffect(() => {
    const target =
      document.querySelector(
        ".menu-home-figma-phone"
      );

    if (!target) {
      return undefined;
    }

    try {
      sessionStorage.setItem(
        PREVIEW_STORAGE_KEY,
        JSON.stringify({
          menu:
            HOMEPAGE_DEMO_MENU,

          branding:
            HOMEPAGE_DEMO_BRANDING,

          logoUrl:
            null,
        })
      );
    } catch (error) {
      console.error(
        "Unable to prepare homepage menu preview:",
        error
      );
    }

    target.classList.add(
      "menu-home-real-template-host"
    );

    setPhoneTarget(
      target
    );

    return () => {
      target.classList.remove(
        "menu-home-real-template-host"
      );
    };
  }, []);


  return (
    <>
      <MenuHomeRefined />

      {phoneTarget &&
        createPortal(
          <div className="menu-home-real-template-portal">
            <iframe
              className="menu-home-real-template-frame"
              src="/menu-mobile-preview"
              title="Example Beyond customer menu"
              loading="eager"
            />
          </div>,

          phoneTarget
        )}
    </>
  );
}
