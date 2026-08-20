import BeyondLanguageToggle from "../i18n/BeyondLanguageToggle";
import {
  useBeyondLanguage,
} from "../i18n/BeyondLanguage";
import React, { useEffect, useMemo, useState, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Moon, Sun } from "lucide-react";
import RestaurantAccessibility from "./RestaurantAccessibility";
import "./CustomersTemplateMenuIsolation.css";
import "./BeyondMenuStudioTheme.css";
import "./BeyondMenuStudioMobile.css";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PROJECT_URL || "";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_KEY || "";
const supabase = url && key ? createClient(url, key) : null;

const slugify = (value) => String(value || "")
  .normalize("NFKD").toLowerCase().trim()
  .replace(/[^\p{L}\p{N}]+/gu, "-")
  .replace(/^-+|-+$/g, "").slice(0, 80);

const liveUrl = (slug) => `${window.location.origin}/menu/${slug}`;

function useSession() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => alive && setSession(data.session || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s || null));
    return () => { alive = false; subscription?.unsubscribe(); };
  }, []);
  return session;
}

function Setup() {
  return <div className="bm-shell"><div className="bm-card bm-empty"><h2>Menu Platform setup required</h2><p>Run <b>supabase/menu-platform-phase1.sql</b> in Supabase SQL Editor, then refresh.</p></div></div>;
}

function LoginRequired() {
  return <div className="bm-shell"><div className="bm-card bm-empty"><h2>Sign in to Beyond</h2><p>You need your Beyond account to manage menus.</p><button onClick={() => location.href = "/"}>GO TO BEYOND</button></div></div>;
}

export function BeyondPublicMenu({
  slug,
  previewSite = null,
  previewGroups = null,
  previewSections = null,
  previewItems = null
}) {
  const [site, setSite] = useState(null);
  const [groups, setGroups] = useState([]);
  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState("");
  const [lang, setLang] = useState("he");
  const [status, setStatus] = useState("Loading menu…");


  /*
    BEYOND GENERIC MENU HIERARCHY

    menu_groups is now the canonical structure.

    parent_id === null
      -> top-level category

    parent_id !== null
      -> nested menu group

    The Customers Template Menu keeps its existing markup
    and styling. We normalize menu_groups into the structure
    the template already expects.
  */
  const normalizeMenuHierarchy = (
    sourceGroups = [],
    sourceItems = []
  ) => {

    const rawGroups =
      (sourceGroups || [])
        .filter(
          group =>
            group &&
            group.visible !== false
        );


    const groupMap =
      new Map(
        rawGroups.map(
          group => [
            group.id,
            group
          ]
        )
      );


    /*
      A group is displayable only when its entire parent
      chain exists and is visible.

      This also prevents a visible child from appearing
      underneath a hidden category.
    */
    const validityCache =
      new Map();


    const groupIsDisplayable =
      groupId => {

        if (!groupId) {
          return false;
        }

        if (
          validityCache.has(
            groupId
          )
        ) {
          return validityCache.get(
            groupId
          );
        }


        const visited =
          new Set();

        let current =
          groupMap.get(
            groupId
          );


        if (!current) {
          validityCache.set(
            groupId,
            false
          );

          return false;
        }


        while (current) {

          if (
            current.visible === false
          ) {
            validityCache.set(
              groupId,
              false
            );

            return false;
          }


          if (
            visited.has(
              current.id
            )
          ) {
            validityCache.set(
              groupId,
              false
            );

            return false;
          }


          visited.add(
            current.id
          );


          if (!current.parent_id) {

            validityCache.set(
              groupId,
              true
            );

            return true;
          }


          current =
            groupMap.get(
              current.parent_id
            );


          if (!current) {

            validityCache.set(
              groupId,
              false
            );

            return false;
          }

        }


        validityCache.set(
          groupId,
          false
        );

        return false;
      };


    const displayGroups =
      rawGroups.filter(
        group =>
          groupIsDisplayable(
            group.id
          )
      );


    const displayGroupMap =
      new Map(
        displayGroups.map(
          group => [
            group.id,
            group
          ]
        )
      );


    const topLevelGroup =
      groupId => {

        if (!groupId) {
          return null;
        }


        const visited =
          new Set();

        let current =
          displayGroupMap.get(
            groupId
          );


        while (current) {

          if (
            visited.has(
              current.id
            )
          ) {
            return null;
          }


          visited.add(
            current.id
          );


          if (!current.parent_id) {
            return current;
          }


          current =
            displayGroupMap.get(
              current.parent_id
            );

        }


        return null;
      };


    /*
      Keep the existing variable name "sections" locally
      so none of the approved Customers Template Menu
      presentation needs to change.
    */
    const normalizedSections =
      displayGroups
        .filter(
          group =>
            !group.parent_id
        )
        .map(
          group => ({
            ...group,

            /*
              Existing menu logic expects section_key.
              Generic menu_groups calls it group_key.
            */
            section_key:
              group.group_key || null
          })
        )
        .sort(
          (a, b) =>
            Number(
              a.sort_order || 0
            ) -
            Number(
              b.sort_order || 0
            )
        );


    const normalizedItems =
      (sourceItems || [])
        .filter(
          item =>
            item &&
            item.visible !== false &&
            item.group_id &&
            groupIsDisplayable(
              item.group_id
            )
        )
        .map(
          item => {

            const ownGroup =
              displayGroupMap.get(
                item.group_id
              );


            const rootGroup =
              topLevelGroup(
                item.group_id
              );


            if (
              !ownGroup ||
              !rootGroup
            ) {
              return null;
            }


            /*
              If the item belongs directly to a top-level
              group there is no subcategory heading.

              If it belongs to a nested group, the existing
              Customers Template Menu receives the group name
              through its existing category fields.

              This keeps the approved template unchanged.
            */
            const nestedGroup =
              ownGroup.parent_id
                ? ownGroup
                : null;


            const legacyCategory =
              nestedGroup
                ? (
                    nestedGroup.name_en &&
                    nestedGroup.name_he
                      ? `${nestedGroup.name_en} · ${nestedGroup.name_he}`
                      : nestedGroup.name_en ||
                        nestedGroup.name_he ||
                        null
                  )
                : null;


            return {
              ...item,

              /*
                Synthetic compatibility field.
                Existing public-menu filtering can remain
                section_id === active.
              */
              section_id:
                rootGroup.id,

              category_en:
                nestedGroup?.name_en ||
                null,

              category_he:
                nestedGroup?.name_he ||
                null,

              category:
                legacyCategory
            };

          }
        )
        .filter(Boolean);


    return {
      groups:
        displayGroups,

      sections:
        normalizedSections,

      items:
        normalizedItems
    };
  };


  useEffect(() => {

    /*
      PRIVATE MENU STUDIO PREVIEW

      Studio supplies the restaurant data directly.
      This allows the owner to preview a Draft menu.

      Normal customers still use the public query
      below, which continues requiring published=true.
    */
    if (previewSite) {

      let loadedGroups = [];
      let loadedSections = [];
      let loadedItems = [];


      /*
        NEW GENERIC PREVIEW

        Once Menu Studio is migrated it will supply
        previewGroups directly.
      */
      if (
        Array.isArray(
          previewGroups
        ) &&
        previewGroups.length
      ) {

        const normalized =
          normalizeMenuHierarchy(
            previewGroups,
            previewItems || []
          );


        loadedGroups =
          normalized.groups;

        loadedSections =
          normalized.sections;

        loadedItems =
          normalized.items;

      } else {

        /*
          TEMPORARY LEGACY PREVIEW FALLBACK

          Keep this until Menu Studio itself is migrated
          to menu_groups in the next step.
        */
        loadedSections =
          (previewSections || [])
            .filter(
              section =>
                section.visible !== false
            );


        loadedItems =
          (previewItems || [])
            .filter(
              item =>
                item.visible !== false
            );

      }


      setSite(
        previewSite
      );

      setGroups(
        loadedGroups
      );

      setSections(
        loadedSections
      );

      setItems(
        loadedItems
      );

      setLang(
        previewSite.default_language === "en"
          ? "en"
          : "he"
      );

      setActive(current => {
        const stillExists =
          loadedSections.some(
            section =>
              section.id === current
          );

        if (stillExists) {
          return current;
        }

        return (
          loadedSections[0]?.id ||
          ""
        );
      });

      setStatus("");

      return;
    }


    /*
      NORMAL PUBLIC MENU

      Customers can only load published menus.
    */
    if (!supabase) return;

    let alive = true;

    (async () => {
      const { data: siteRow, error: siteError } =
        await supabase
          .from("menu_sites")
          .select("*")
          .eq("slug", slug)
          .eq("published", true)
          .maybeSingle();

      if (!alive) return;

      if (siteError || !siteRow) {
        setStatus(
          "This menu is not available."
        );
        return;
      }

      const [groupResult, itemResult] =
        await Promise.all([

          /*
            GENERIC MENU HIERARCHY

            Load all visible groups belonging to this
            published menu.

            The client normalizer will resolve top-level
            categories and nested groups.
          */
          supabase
            .from("menu_groups")
            .select("*")
            .eq(
              "site_id",
              siteRow.id
            )
            .eq(
              "visible",
              true
            )
            .order("sort_order")
            .order("created_at"),

          supabase
            .from("menu_items")
            .select("*")
            .eq(
              "site_id",
              siteRow.id
            )
            .eq(
              "visible",
              true
            )
            .order("sort_order")
            .order("created_at")
        ]);

      if (!alive) return;

      if (
        groupResult.error ||
        itemResult.error
      ) {
        setStatus(
          "Could not load this menu."
        );
        return;
      }

      const normalized =
        normalizeMenuHierarchy(
          groupResult.data || [],
          itemResult.data || []
        );


      const loadedGroups =
        normalized.groups;


      const loadedSections =
        normalized.sections;


      const loadedItems =
        normalized.items;


      setSite(
        siteRow
      );


      setGroups(
        loadedGroups
      );


      setSections(
        loadedSections
      );


      setItems(
        loadedItems
      );

      setLang(
        siteRow.default_language === "en"
          ? "en"
          : "he"
      );

      setActive(
        loadedSections[0]?.id ||
        ""
      );

      setStatus("");
    })();

    return () => {
      alive = false;
    };

  }, [
    slug,
    previewSite,
    previewGroups,
    previewSections,
    previewItems
  ]);

  const activeSection = sections.find(
    section => section.id === active
  );

  const activeItems = useMemo(
    () =>
      items.filter(
        item => item.section_id === active
      ),
    [items, active]
  );

  if (!supabase) return <Setup />;

  if (!site) {
    return (
      <div className="ep-page">
        <div className="ep-app ep-loading">
          {status}
        </div>
      </div>
    );
  }

  const containsHebrew = value =>
    /[\u0590-\u05FF]/.test(
      String(value || "")
    );

  const splitBilingual = value => {
    const raw = String(value || "").trim();

    if (!raw) {
      return { en: "", he: "" };
    }

    const parts = raw.split(/\s+·\s+/);

    if (parts.length >= 2) {
      const first = parts[0].trim();
      const second =
        parts.slice(1).join(" · ").trim();

      if (
        containsHebrew(first) &&
        !containsHebrew(second)
      ) {
        return {
          en: second,
          he: first
        };
      }

      if (
        containsHebrew(second) &&
        !containsHebrew(first)
      ) {
        return {
          en: first,
          he: second
        };
      }
    }

    return {
      en: raw,
      he: raw
    };
  };

  const sectionName = section => {
    if (!section) return "";

    return lang === "he"
      ? section.name_he || section.name_en || ""
      : section.name_en || section.name_he || "";
  };

  const itemName = item =>
    lang === "he"
      ? item.name_he || item.name_en || ""
      : item.name_en || item.name_he || "";

  const description = item =>
    lang === "he"
      ? (
          item.description_he ||
          item.description ||
          ""
        )
      : (
          item.description_en ||
          item.description ||
          ""
        );

  const categoryName = item => {
    if (lang === "he" && item.category_he) {
      return item.category_he;
    }

    if (lang === "en" && item.category_en) {
      return item.category_en;
    }

    const pair =
      splitBilingual(item.category);

    return lang === "he"
      ? pair.he || pair.en
      : pair.en || pair.he;
  };

  const originName = item => {
    if (lang === "he" && item.origin_he) {
      return item.origin_he;
    }

    if (lang === "en" && item.origin_en) {
      return item.origin_en;
    }

    const pair =
      splitBilingual(item.origin);

    return lang === "he"
      ? pair.he || pair.en
      : pair.en || pair.he;
  };

  const money = value => {
    const text =
      String(value || "").trim();

    if (!text) return "";

    if (/[₪€$£]/.test(text)) {
      return text;
    }

    if (/^\d+(?:\.\d+)?$/.test(text)) {
      return `₪${text}`;
    }

    return text;
  };

  const numericPrice = value => {
    const match =
      String(value || "")
        .replace(/,/g, "")
        .match(/\d+(?:\.\d+)?/);

    return match
      ? Number(match[0])
      : null;
  };

  const getWinePrices = item => {
    const first =
      String(item.wine_bottle || "").trim();

    const second =
      String(item.wine_glass || "").trim();

    if (!first && !second) {
      return {
        glass: "",
        bottle: ""
      };
    }

    if (first && !second) {
      return {
        glass: "",
        bottle: first
      };
    }

    if (!first && second) {
      return {
        glass: "",
        bottle: second
      };
    }

    const a = numericPrice(first);
    const b = numericPrice(second);

    if (a !== null && b !== null) {
      return a <= b
        ? {
            glass: first,
            bottle: second
          }
        : {
            glass: second,
            bottle: first
          };
    }

    return {
      glass: first,
      bottle: second
    };
  };

  const sectionKey =
    String(
      activeSection?.section_key || ""
    )
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const dualSections =
    new Set([
      "mix",
      "drinkstomix",
      "whiskey",
      "whisky",
      "liquor",
      "cognac"
    ]);

  const isDualSection =
    dualSections.has(sectionKey);

  function ShotIcon() {
    return (
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        <path
          d="M10 6h12l-2 20h-8L10 6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M11 11h10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  function GlassIcon() {
    return (
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        <path
          d="M8 8h16l-2 17H10L8 8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M10 15h12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  const normalPrice = item => (
    <div className="ep-item-price">
      {item.price || "—"}
    </div>
  );

  const dualPrice = item => {
    const parts =
      String(item.price || "")
        .split("/")
        .map(value => value.trim())
        .filter(Boolean);

    if (
      !isDualSection ||
      parts.length !== 2
    ) {
      return normalPrice(item);
    }

    return (
      <div className="ep-dual-price">
        <strong>{parts[0]}</strong>
        <strong>{parts[1]}</strong>
      </div>
    );
  };

  const rendered = [];

  let previousCategory = "";
  let dualHeaderShown = false;

  activeItems.forEach(item => {
    const category =
      categoryName(item);

    const categoryIdentity =
      String(
        item.category ||
        item.category_en ||
        item.category_he ||
        ""
      ).trim();

    if (
      category &&
      categoryIdentity !== previousCategory
    ) {
      rendered.push(
        <div
          className="ep-item-category"
          key={`cat-${item.id}`}
        >
          {category}
        </div>
      );

      previousCategory =
        categoryIdentity;
    }

    const priceParts =
      String(item.price || "")
        .split("/")
        .map(value => value.trim())
        .filter(Boolean);

    if (
      isDualSection &&
      priceParts.length === 2 &&
      !dualHeaderShown
    ) {
      rendered.push(
        <div
          className="ep-dual-header"
          key={`dual-${active}`}
        >
          <div>
            <ShotIcon />
            <span>
              {lang === "he"
                ? "שוט"
                : "SHOT"}
            </span>
          </div>

          <div>
            <GlassIcon />
            <span>
              {lang === "he"
                ? "כוס"
                : "GLASS"}
            </span>
          </div>
        </div>
      );

      dualHeaderShown = true;
    }

    if (item.type === "wine") {
      const wine =
        getWinePrices(item);

      rendered.push(
        <article
          className="ep-wine-row"
          key={item.id}
        >
          <div className="ep-wine-prices">
            {wine.glass ? (
              <div>
                <span>
                  {lang === "he"
                    ? "כוס"
                    : "GLASS"}
                </span>
                <strong>
                  {money(wine.glass)}
                </strong>
              </div>
            ) : null}

            {wine.bottle ? (
              <div>
                <span>
                  {lang === "he"
                    ? "בקבוק"
                    : "BOTTLE"}
                </span>
                <strong>
                  {money(wine.bottle)}
                </strong>
              </div>
            ) : null}
          </div>

          <div className="ep-item-info">
            <span className="ep-item-name">
              {itemName(item)}
            </span>

            {originName(item) ? (
              <span className="ep-wine-origin">
                {originName(item)}
              </span>
            ) : null}

            {description(item) ? (
              <span className="ep-item-description">
                {description(item)}
              </span>
            ) : null}
          </div>
        </article>
      );

      return;
    }

    rendered.push(
      <article
        className="ep-item-row"
        key={item.id}
      >
        <div className="ep-item-info">
          <span className="ep-item-name">
            {itemName(item)}
          </span>

          {description(item) ? (
            <span className="ep-item-description">
              {description(item)}
            </span>
          ) : null}
        </div>

        {dualPrice(item)}
      </article>
    );
  });

  const chooseSection = id => {
    setActive(id);

    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior:
          window.matchMedia?.(
            "(prefers-reduced-motion: reduce)"
          ).matches
            ? "auto"
            : "smooth"
      });
    });
  };

  return (
    <div
      className={`ep-page customers-template-menu ${
        lang === "he"
          ? "is-he"
          : "is-en"
      }`}
      data-customer-template-menu="true"
      data-no-beyond-translate="true"
      translate="no"
      lang={lang}
      dir={
        lang === "he"
          ? "rtl"
          : "ltr"
      }
      style={{
        "--ep-accent":
          site.primary_color ||
          "#556b2f"
      }}
    >
      <RestaurantAccessibility
        restaurantName={site.name || "Restaurant"}
      />

      <div
        id="restaurant-main-content"
        className={`ep-app ep-lang-${lang}`}
        tabIndex={-1}
        lang={lang}
        dir={
          lang === "he"
            ? "rtl"
            : "ltr"
        }
      >
        <header className="ep-header">
          <div className="ep-brand">
            {site.logo_url ? (
              <img
                className="ep-logo"
                src={site.logo_url}
                alt=""
              />
            ) : (
              <div className="ep-logo ep-logo-fallback">
                EP
              </div>
            )}

            <div className="ep-brand-copy">
              <div className="ep-brand-title">
                {site.name}
              </div>

              <div className="ep-brand-sub">
                bar · café
              </div>
            </div>
          </div>

          <div className="ep-lang-pill">
            <button
              type="button"
              translate="no"
              data-no-beyond-translate="true"
              lang="en"
              dir="ltr"
              className={
                lang === "en"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setLang("en")
              }
            >
              English
            </button>

            <button
              type="button"
              translate="no"
              data-no-beyond-translate="true"
              lang="he"
              dir="rtl"
              className={
                lang === "he"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setLang("he")
              }
            >
              עברית
            </button>
          </div>
        </header>

        <section className="ep-hero">
          <div className="ep-hero-kicker">
            {lang === "he"
              ? "התפריט הדיגיטלי שלנו"
              : "OUR DIGITAL MENU"}
          </div>

          <h1 className="ep-hero-title">
            {lang === "he"
              ? "משקאות ואוכל"
              : "Drinks & Food"}
          </h1>

          {site.logo_url && (
            <img
              className="ep-hero-background-logo"
              src={site.logo_url}
              alt=""
              aria-hidden="true"
            />
          )}
        </section>

        <nav
          className="ep-tabs-wrap"
          aria-label="Menu categories"
        >
          <div className="ep-tabs">
            {sections.map(section => (
              <button
                type="button"
                key={section.id}
                className={
                  section.id === active
                    ? "active"
                    : ""
                }
                onClick={() =>
                  chooseSection(section.id)
                }
              >
                {sectionName(section)}
              </button>
            ))}
          </div>
        </nav>

        <section className="ep-section-head">
          <h2>
            {sectionName(activeSection)}
          </h2>

          <div className="ep-section-count">
            {activeItems.length}{" "}
            {lang === "he"
              ? "פריטים"
              : "items"}
          </div>
        </section>

        <section className="ep-menu-list">
          {rendered}

          {sectionKey === "mix" ? (
            <div className="ep-mixers-box">
              <div className="ep-mixers-title">
                {lang === "he"
                  ? "המחיר כולל ערבוב"
                  : "Mixers included"}
              </div>

              <div className="ep-mixers-chips">
                {(
                  lang === "he"
                    ? [
                        "מי טוניק",
                        "מי סודה",
                        "לימונדה",
                        "ספרייט",
                        "מיץ תפוחים",
                        "חמוציות",
                        "מנגו",
                        "קולה"
                      ]
                    : [
                        "Tonic",
                        "Soda",
                        "Lemonade",
                        "Sprite",
                        "Apple Juice",
                        "Cranberry",
                        "Mango",
                        "Cola"
                      ]
                ).map(value => (
                  <span key={value}>
                    {value}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <footer className="ep-footer">

          <div className="ep-footer-responsible">
            Enjoy responsibly
          </div>

          <button
            type="button"
            className="ep-accessibility-statement-link"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent(
                  "beyond-open-accessibility-statement"
                )
              )
            }
          >
            הצהרת נגישות / Accessibility Statement
          </button>

          <span>
            Powered by <strong>Beyond</strong>
          </span>

        </footer>
      </div>
    </div>
  );
}

export function BeyondMenuStudio() {
  const {
    isHebrew
  } = useBeyondLanguage();

  const session = useSession();
  const user = session?.user;

  const studioPortalTarget =
    typeof document !== "undefined"
      ? document.querySelector(".bm-owner-dashboard")
      : null;


  // BEYOND_MENU_STUDIO_THEME_V1
  const [studioTheme, setStudioTheme] = useState(() => {
    try {
      return (
        window.localStorage.getItem("beyond-theme") === "light"
          ? "light"
          : "dark"
      );
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-beyond-theme",
      studioTheme
    );

    document.documentElement.style.colorScheme =
      studioTheme;

    try {
      window.localStorage.setItem(
        "beyond-theme",
        studioTheme
      );
    } catch {
      // Theme still works without localStorage.
    }
  }, [studioTheme]);

  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState(
    () => new URLSearchParams(location.search).get("site") || ""
  );

  const [groups, setGroups] = useState([]);
  const [sections, setSections] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeSectionId, setActiveSectionId] = useState("");

  const [msg, setMsg] = useState("");

  const [showCreateSite, setShowCreateSite] = useState(false);
  const [isMenuAdmin, setIsMenuAdmin] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [siteDraft, setSiteDraft] = useState({
    name: "",
    slug: ""
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const [secEn, setSecEn] = useState("");
  const [secHe, setSecHe] = useState("");

  const [newItem, setNewItem] = useState({
    section_id: "",
    type: "",
    name_en: "",
    name_he: "",
    category_en: "",
    category_he: "",
    description: "",
    description_en: "",
    description_he: "",
    price: "",
    origin_en: "",
    origin_he: "",
    wine_glass: "",
    wine_bottle: ""
  });

  const [editingSectionId, setEditingSectionId] = useState("");
  const [openCategoryMenuId, setOpenCategoryMenuId] = useState("");

  const [openSubcategoryMenuId, setOpenSubcategoryMenuId] =
    useState("");

  const [editingSubcategoryId, setEditingSubcategoryId] =
    useState("");

  const [subcategoryDraft, setSubcategoryDraft] =
    useState({
      name_en: "",
      name_he: ""
    });

  const [showAddSubcategory, setShowAddSubcategory] =
    useState(false);

  const [subcatEn, setSubcatEn] = useState("");
  const [subcatHe, setSubcatHe] = useState("");
  const [openHeaderMenu, setOpenHeaderMenu] = useState(false);

  const [publishConfirmOpen, setPublishConfirmOpen] =
    useState(false);

  const [publishSaving, setPublishSaving] =
    useState(false);

  const categoryScrollRef = useRef(null);

  // BEYOND_CATEGORY_SCROLL_STABILITY
  useLayoutEffect(() => {
    const scroller =
      categoryScrollRef.current;

    if (!scroller) return;

    /*
      Safari handles RTL horizontal scroll offsets
      differently from LTR.

      Instead of calculating scrollLeft, always bring
      the currently selected category into view after
      the language direction changes.
    */
    let frame1 = 0;
    let frame2 = 0;

    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        const active =
          scroller.querySelector(
            ".bm-owner-category.active"
          );

        if (!active) return;

        active.scrollIntoView({
          behavior: "auto",
          block: "nearest",
          inline: "center"
        });
      });
    });

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };

  }, [isHebrew]);

  // BEYOND_CLOSE_MOBILE_MENUS_ON_LANGUAGE_CHANGE
  useEffect(() => {
    setOpenCategoryMenuId("");
    setOpenSubcategoryMenuId("");
    setOpenItemMenuId("");
  }, [isHebrew]);


  const [sectionDraft, setSectionDraft] = useState({
    name_en: "",
    name_he: ""
  });

  const [editingItemId, setEditingItemId] = useState("");
  const [openItemMenuId, setOpenItemMenuId] = useState("");
  const [itemDraft, setItemDraft] = useState({
    section_id: "",
    type: "item",
    name_en: "",
    name_he: "",
    category_en: "",
    category_he: "",
    description: "",
    description_en: "",
    description_he: "",
    price: "",
    origin_en: "",
    origin_he: "",
    wine_glass: "",
    wine_bottle: ""
  });


  // BEYOND_EMPTY_NEW_FORM_VALUES_V2_START

  useEffect(() => {
    if (!showAddCategory) return;

    setSecEn("");
    setSecHe("");
  }, [showAddCategory]);


  useEffect(() => {
    if (!showAddItem) return;

    setNewItem(current => ({
      ...current,
      name_en: "",
      name_he: ""
    }));
  }, [showAddItem]);

  // BEYOND_EMPTY_NEW_FORM_VALUES_V2_END


  // BEYOND_STUDIO_LANGUAGE_NAME_HELPERS_V1

  const studioPrimaryName = value => {
    if (!value) return "";

    return isHebrew
      ? (
          value.name_he ||
          value.name_en ||
          ""
        )
      : (
          value.name_en ||
          value.name_he ||
          ""
        );
  };


  const studioSecondaryName = value => {
    if (!value) return "";

    const primary =
      studioPrimaryName(value);

    const secondary =
      isHebrew
        ? value.name_en || ""
        : value.name_he || "";

    return (
      secondary &&
      secondary !== primary
    )
      ? secondary
      : "";
  };

  const selected = sites.find(s => s.id === siteId);

  const loadSites = async (preferred = "") => {
    if (!user) return;

    const { data: adminRow, error: adminError } = await supabase
      .from("menu_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError) {
      setMsg(adminError.message);
      return;
    }

    const adminMode = Boolean(adminRow);

    setIsMenuAdmin(adminMode);

    let query = supabase
      .from("menu_sites")
      .select("*")
      .order("created_at", { ascending: false });

    if (!adminMode) {
      query = query.eq("owner_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      setMsg(error.message);
      return;
    }

    const list = data || [];

    setSites(list);

    const requested =
      preferred ||
      new URLSearchParams(location.search).get("site") ||
      "";

    const allowedRequested = list.some(
      site => site.id === requested
    )
      ? requested
      : "";

    const currentAllowed = list.some(
      site => site.id === siteId
    )
      ? siteId
      : "";

    setSiteId(
      allowedRequested ||
      currentAllowed ||
      list[0]?.id ||
      ""
    );
  };

  

  /*
    MENU STUDIO CANONICAL ITEM UI NORMALIZER

    group_id is the ONLY hierarchy stored in the database.

    Some existing approved Menu Studio JSX still expects
    section_id / subcategory_id while rendering.

    We derive those values in memory from menu_groups.
    Nothing legacy is written back to Supabase.
  */
  const canonicalizeStudioItems = (
    sourceItems = [],
    sourceGroups = []
  ) => {

    const groupMap =
      new Map(
        sourceGroups.map(
          group => [
            group.id,
            group
          ]
        )
      );


    const resolveRootGroup =
      groupId => {

        if (!groupId) {
          return null;
        }


        let current =
          groupMap.get(
            groupId
          );


        const visited =
          new Set();


        while (
          current?.parent_id
        ) {

          if (
            visited.has(
              current.id
            )
          ) {
            return null;
          }


          visited.add(
            current.id
          );


          current =
            groupMap.get(
              current.parent_id
            );

        }


        return (
          current ||
          null
        );
      };


    return (
      sourceItems || []
    ).map(
      item => {

        const ownGroup =
          groupMap.get(
            item.group_id
          );


        /*
          If an item ever references an invalid group,
          leave it untouched rather than inventing a
          relationship.
        */
        if (!ownGroup) {
          return item;
        }


        const rootGroup =
          resolveRootGroup(
            ownGroup.id
          );


        if (!rootGroup) {
          return item;
        }


        /*
          Directly attached to category:
              NO subcategory.

          Attached to child group:
              that group is the subcategory.
        */
        const hasSubcategory =
          ownGroup.id !==
          rootGroup.id;


        const categoryEn =
          hasSubcategory
            ? ownGroup.name_en || null
            : null;


        const categoryHe =
          hasSubcategory
            ? ownGroup.name_he || null
            : null;


        const legacyCategory =
          hasSubcategory
            ? (
                categoryEn &&
                categoryHe &&
                categoryEn !==
                  categoryHe

                  ? `${categoryEn} · ${categoryHe}`

                  : categoryEn ||
                    categoryHe ||
                    null
              )
            : null;


        return {
          ...item,

          /*
            UI-ONLY compatibility properties.
          */
          section_id:
            rootGroup.id,

          subcategory_id:
            hasSubcategory
              ? ownGroup.id
              : null,

          category_en:
            categoryEn,

          category_he:
            categoryHe,

          category:
            legacyCategory
        };

      }
    );
  };


const loadData = async (id) => {

    if (
      !supabase ||
      !id
    ) {

      setGroups([]);
      setSections([]);
      setSubcategories([]);
      setItems([]);

      return;
    }


    /*
      MENU STUDIO CANONICAL READ MODEL

      menu_groups:
        parent_id = null
          -> main category

        parent_id = category id
          -> subcategory

      The UI keeps the existing sections/subcategories
      variable names temporarily so NO styling or JSX
      redesign is required.
    */
    const [
      groupResult,
      itemResult
    ] = await Promise.all([

      supabase
        .from("menu_groups")
        .select("*")
        .eq(
          "site_id",
          id
        )
        .order(
          "sort_order"
        )
        .order(
          "created_at"
        ),


      supabase
        .from("menu_items")
        .select("*")
        .eq(
          "site_id",
          id
        )
        .order(
          "sort_order"
        )
        .order(
          "created_at"
        )

    ]);


    if (
      groupResult.error ||
      itemResult.error
    ) {

      setMsg(
        groupResult.error?.message ||
        itemResult.error?.message ||
        "Could not load menu."
      );

      return;
    }


    const nextGroups =
      groupResult.data || [];


    /*
      TOP-LEVEL MENU GROUPS

      Adapt group_key -> section_key temporarily because
      some existing Menu Studio logic still expects the
      older property name.
    */
    const nextSections =
      nextGroups
        .filter(
          group =>
            !group.parent_id
        )
        .map(
          group => ({
            ...group,

            section_key:
              group.group_key ||
              null
          })
        )
        .sort(
          (a, b) =>

            Number(
              a.sort_order || 0
            ) -

            Number(
              b.sort_order || 0
            )
        );


    const topLevelIds =
      new Set(
        nextSections.map(
          group =>
            group.id
        )
      );


    /*
      FIRST-LEVEL CHILDREN

      Adapt parent_id -> section_id temporarily because
      the approved Subcategory UI currently expects
      subcategory.section_id.
    */
    const nextSubcategories =
      nextGroups
        .filter(
          group =>

            group.parent_id &&

            topLevelIds.has(
              group.parent_id
            )
        )
        .map(
          group => ({
            ...group,

            section_id:
              group.parent_id
          })
        )
        .sort(
          (a, b) =>

            Number(
              a.sort_order || 0
            ) -

            Number(
              b.sort_order || 0
            )
        );


    const nextItems =
      itemResult.data || [];


    setGroups(
      nextGroups
    );


    setSections(
      nextSections
    );


    setSubcategories(
      nextSubcategories
    );


    setItems(
      canonicalizeStudioItems(
        nextItems,
        nextGroups
      )
    );


    /*
      Keep the selected category if it still exists.

      Otherwise use the first top-level menu group.
    */
    setActiveSectionId(
      current => {

        if (
          nextSections.some(
            group =>
              group.id ===
              current
          )
        ) {
          return current;
        }


        return (
          nextSections[0]?.id ||
          ""
        );

      }
    );

  }
;

  useEffect(() => {
    if (user) loadSites();
  }, [user?.id]);

  useEffect(() => {
    if (siteId) {
      loadData(siteId);
      setEditingSectionId("");
      setEditingItemId("");
      setShowAddItem(false);
      setShowAddCategory(false);
    }
  }, [siteId]);

  useEffect(() => {
    if (!selected) return;

    setSiteDraft({
      name: selected.name || "",
      slug: selected.slug || ""
    });
  }, [selected?.id, selected?.name, selected?.slug]);

  if (!supabase) return <Setup />;

  if (session === undefined) {
    return (
      <div className="bm-shell">
        <div className="bm-card">Checking account…</div>
      </div>
    );
  }

  if (!session) return <LoginRequired />;

  const createSite = async e => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanSlug = slugify(slug || name);

    if (!cleanName || !cleanSlug) {
      setMsg("Restaurant name and URL are required.");
      return;
    }

    const { data, error } = await supabase
      .from("menu_sites")
      .insert({
        owner_id: user.id,
        name: cleanName,
        slug: cleanSlug
      })
      .select()
      .single();

    if (error) {
      setMsg(error.message);
      return;
    }

    setName("");
    setSlug("");
    setShowCreateSite(false);

    await loadSites(data.id);
    setMsg("Menu created.");
  };

  const updateSite = async patch => {
    if (!selected) return;

    const { error } = await supabase
      .from("menu_sites")
      .update(patch)
      .eq("id", selected.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await loadSites(selected.id);
  };


  // BEYOND_SAFE_PUBLISH_CONFIRM
  const confirmPublishChange = () => {
    if (!selected) return;

    setPublishConfirmOpen(true);
  };


  const applyPublishChange = async () => {
    if (
      !selected ||
      publishSaving
    ) {
      return;
    }

    const willPublish =
      !selected.published;

    setPublishSaving(true);

    try {
      await updateSite({
        published: willPublish
      });

      setPublishConfirmOpen(false);
    } finally {
      setPublishSaving(false);
    }
  };


  const addCategory = async e => {
    e.preventDefault();

    if (!selected) return;


    const cleanEn =
      secEn.trim();

    const cleanHe =
      secHe.trim();


    if (
      !cleanEn &&
      !cleanHe
    ) {

      setMsg(
        "Category name is required."
      );

      return;
    }


    const nextSortOrder =
      sections.length
        ? (
            Math.max(
              ...sections.map(
                section =>
                  Number(
                    section.sort_order || 0
                  )
              )
            ) + 1
          )
        : 0;


    const {
      data,
      error
    } = await supabase

      .from("menu_groups")

      .insert({
        site_id:
          selected.id,

        parent_id:
          null,

        name_en:
          cleanEn || cleanHe,

        name_he:
          cleanHe || cleanEn,

        group_key:
          null,

        visible:
          true,

        sort_order:
          nextSortOrder
      })

      .select()

      .single();


    if (error) {

      setMsg(
        error.message
      );

      return;
    }


    setSecEn("");
    setSecHe("");

    setShowAddCategory(
      false
    );


    await loadData(
      selected.id
    );


    setActiveSectionId(
      data.id
    );


    setMsg(
      "Category added."
    );
  };

  const startCategoryEdit = section => {
    setEditingSectionId(section.id);

    setSectionDraft({
      name_en: section.name_en || "",
      name_he: section.name_he || ""
    });
  };

  const saveCategory = async () => {

    const cleanEn =
      sectionDraft.name_en.trim();

    const cleanHe =
      sectionDraft.name_he.trim();


    if (
      !cleanEn &&
      !cleanHe
    ) {

      setMsg(
        "Category name is required."
      );

      return;
    }


    const { error } =
      await supabase

        .from("menu_groups")

        .update({
          name_en:
            cleanEn || cleanHe,

          name_he:
            cleanHe || cleanEn
        })

        .eq(
          "id",
          editingSectionId
        );


    if (error) {

      setMsg(
        error.message
      );

      return;
    }


    setEditingSectionId(
      ""
    );


    await loadData(
      selected.id
    );


    setMsg(
      "Category updated."
    );
  };

  const toggleCategory = async section => {

    const { error } =
      await supabase

        .from("menu_groups")

        .update({
          visible:
            section.visible === false
        })

        .eq(
          "id",
          section.id
        );


    if (error) {

      setMsg(
        error.message
      );

      return;
    }


    await loadData(
      selected.id
    );
  };

  const deleteCategory = async section => {

    const descendantIds =
      new Set([
        section.id
      ]);


    let foundMore =
      true;


    while (foundMore) {

      foundMore =
        false;


      groups.forEach(
        group => {

          if (
            group.parent_id &&
            descendantIds.has(
              group.parent_id
            ) &&
            !descendantIds.has(
              group.id
            )
          ) {

            descendantIds.add(
              group.id
            );

            foundMore =
              true;

          }

        }
      );

    }


    const groupIds =
      Array.from(
        descendantIds
      );


    const categoryItems =
      items.filter(
        item =>
          groupIds.includes(
            item.group_id
          )
      );


    const message =
      categoryItems.length
        ? (
            `Delete "${studioPrimaryName(section)}" and its ${categoryItems.length} item(s)?`
          )
        : (
            `Delete "${studioPrimaryName(section)}"?`
          );


    if (
      !window.confirm(
        message
      )
    ) {
      return;
    }


    /*
      Delete items first.

      menu_items.group_id is NOT NULL, so no item may
      become orphaned during hierarchy deletion.
    */
    if (
      categoryItems.length
    ) {

      const itemResult =
        await supabase

          .from("menu_items")

          .delete()

          .in(
            "group_id",
            groupIds
          );


      if (
        itemResult.error
      ) {

        setMsg(
          itemResult.error.message
        );

        return;
      }

    }


    /*
      Child menu_groups are deleted automatically through
      menu_groups.parent_id ON DELETE CASCADE.
    */
    const { error } =
      await supabase

        .from("menu_groups")

        .delete()

        .eq(
          "id",
          section.id
        );


    if (error) {

      setMsg(
        error.message
      );

      return;
    }


    await loadData(
      selected.id
    );


    setMsg(
      "Category deleted."
    );
  };

  const subcategoryLegacyValue = (
    nameEn,
    nameHe
  ) => {
    const en = String(nameEn || "").trim();
    const he = String(nameHe || "").trim();

    if (en && he && en !== he) {
      return `${en} · ${he}`;
    }

    return en || he || null;
  };


  const startSubcategoryEdit =
    subcategory => {

      if (!subcategory) return;

      setSubcategoryDraft({
        name_en:
          subcategory.name_en || "",

        name_he:
          subcategory.name_he || ""
      });

      setEditingSubcategoryId(
        subcategory.id
      );

      setOpenSubcategoryMenuId("");
      setShowAddSubcategory(false);
    };


  const saveSubcategory = async e => {
    e.preventDefault();


    if (
      !selected ||
      !editingSubcategoryId
    ) {
      return;
    }


    const cleanEn =
      subcategoryDraft.name_en.trim();

    const cleanHe =
      subcategoryDraft.name_he.trim();


    if (
      !cleanEn &&
      !cleanHe
    ) {

      setMsg(
        isHebrew
          ? "נדרש שם לתת־הקטגוריה."
          : "Subcategory name is required."
      );

      return;
    }


    const finalEn =
      cleanEn ||
      cleanHe;

    const finalHe =
      cleanHe ||
      cleanEn;


    const { error } =
      await supabase

        .from("menu_groups")

        .update({
          name_en:
            finalEn,

          name_he:
            finalHe
        })

        .eq(
          "id",
          editingSubcategoryId
        );


    if (error) {

      setMsg(
        error.message
      );

      return;
    }


    setOpenSubcategoryMenuId(
      ""
    );

    setEditingSubcategoryId(
      ""
    );


    await loadData(
      selected.id
    );


    setMsg(
      isHebrew
        ? "תת־הקטגוריה עודכנה."
        : "Subcategory updated."
    );
  };


  const toggleSubcategoryVisibility =
    async subcategory => {

      if (
        !selected ||
        !subcategory
      ) {
        return;
      }


      const { error } =
        await supabase

          .from("menu_groups")

          .update({
            visible:
              subcategory.visible === false
          })

          .eq(
            "id",
            subcategory.id
          );


      if (error) {

        setMsg(
          error.message
        );

        return;
      }


      setOpenSubcategoryMenuId(
        ""
      );


      await loadData(
        selected.id
      );


      setMsg(
        subcategory.visible === false
          ? (
              isHebrew
                ? "תת־הקטגוריה מוצגת."
                : "Subcategory shown."
            )
          : (
              isHebrew
                ? "תת־הקטגוריה הוסתרה."
                : "Subcategory hidden."
            )
      );
    };


  const moveSubcategory =
    async (
      subcategory,
      direction
    ) => {

      if (
        !selected ||
        !subcategory
      ) {
        return;
      }


      const currentIndex =
        activeSubcategories.findIndex(
          value =>
            value.id ===
            subcategory.id
        );


      if (
        currentIndex === -1
      ) {
        return;
      }


      const targetIndex =
        direction === "up"
          ? currentIndex - 1
          : currentIndex + 1;


      if (
        targetIndex < 0 ||
        targetIndex >=
          activeSubcategories.length
      ) {
        return;
      }


      const next =
        [
          ...activeSubcategories
        ];


      const [moving] =
        next.splice(
          currentIndex,
          1
        );


      next.splice(
        targetIndex,
        0,
        moving
      );


      for (
        let index = 0;
        index < next.length;
        index += 1
      ) {

        const result =
          await supabase

            .from("menu_groups")

            .update({
              sort_order:
                (index + 1) * 10
            })

            .eq(
              "id",
              next[index].id
            );


        if (
          result.error
        ) {

          setMsg(
            result.error.message
          );

          return;
        }

      }


      setOpenSubcategoryMenuId(
        ""
      );


      await loadData(
        selected.id
      );
    };


  const deleteSubcategory =
    async subcategory => {

      if (
        !selected ||
        !subcategory
      ) {
        return;
      }


      const parentGroupId =
        subcategory.parent_id ||
        subcategory.section_id;


      if (
        !parentGroupId
      ) {

        setMsg(
          "Parent group was not found."
        );

        return;
      }


      const confirmed =
        window.confirm(
          isHebrew
            ? `למחוק את תת־הקטגוריה "${studioSubcategoryPrimaryName(subcategory)}"? הפריטים שבתוכה לא יימחקו.`
            : `Delete "${studioSubcategoryPrimaryName(subcategory)}"? The items inside it will not be deleted.`
        );


      if (
        !confirmed
      ) {
        return;
      }


      /*
        Collect this group + all possible nested children.
      */
      const descendantIds =
        new Set([
          subcategory.id
        ]);


      let foundMore =
        true;


      while (
        foundMore
      ) {

        foundMore =
          false;


        groups.forEach(
          group => {

            if (
              group.parent_id &&
              descendantIds.has(
                group.parent_id
              ) &&
              !descendantIds.has(
                group.id
              )
            ) {

              descendantIds.add(
                group.id
              );

              foundMore =
                true;

            }

          }
        );

      }


      const ids =
        Array.from(
          descendantIds
        );


      /*
        Preserve every item by moving it to the parent
        generic group.
      */
      const itemResult =
        await supabase

          .from("menu_items")

          .update({
            group_id:
              parentGroupId
          })

          .in(
            "group_id",
            ids
          );


      if (
        itemResult.error
      ) {

        setMsg(
          itemResult.error.message
        );

        return;
      }


      const { error } =
        await supabase

          .from("menu_groups")

          .delete()

          .eq(
            "id",
            subcategory.id
          );


      if (error) {

        setMsg(
          error.message
        );

        return;
      }


      setOpenSubcategoryMenuId(
        ""
      );

      setEditingSubcategoryId(
        ""
      );


      await loadData(
        selected.id
      );


      setMsg(
        isHebrew
          ? "תת־הקטגוריה נמחקה."
          : "Subcategory deleted."
      );
    };


  const addSubcategory = async e => {
    e.preventDefault();


    if (
      !selected ||
      !activeSectionId
    ) {
      return;
    }


    const cleanEn =
      subcatEn.trim();

    const cleanHe =
      subcatHe.trim();


    if (
      !cleanEn &&
      !cleanHe
    ) {

      setMsg(
        isHebrew
          ? "נדרש שם לתת־הקטגוריה."
          : "Subcategory name is required."
      );

      return;
    }


    const finalEn =
      cleanEn ||
      cleanHe;

    const finalHe =
      cleanHe ||
      cleanEn;


    const nextSortOrder =
      activeSubcategories.length
        ? (
            Math.max(
              ...activeSubcategories.map(
                subcategory =>
                  Number(
                    subcategory.sort_order ||
                    0
                  )
              )
            ) + 10
          )
        : 10;


    const { error } =
      await supabase

        .from("menu_groups")

        .insert({
          site_id:
            selected.id,

          parent_id:
            activeSectionId,

          name_en:
            finalEn,

          name_he:
            finalHe,

          group_key:
            null,

          visible:
            true,

          sort_order:
            nextSortOrder
        });


    if (error) {

      setMsg(
        error.message
      );

      return;
    }


    setSubcatEn("");
    setSubcatHe("");

    setShowAddSubcategory(
      false
    );


    await loadData(
      selected.id
    );


    setMsg(
      isHebrew
        ? "תת־הקטגוריה נוספה."
        : "Subcategory added."
    );
  };


  const openAddItem = () => {
    setNewItem({
      section_id: "",
      type: "",
      name_en: "",
      name_he: "",
      category_en: "",
      category_he: "",
      description: "",
      description_en: "",
      description_he: "",
      price: "",
      origin_en: "",
      origin_he: "",
      wine_glass: "",
      wine_bottle: ""
    });

    setShowAddItem(true);
  };

  const addItem = async e => {
    e.preventDefault();


    if (
      !selected ||
      !newItem.section_id ||
      !newItem.type ||
      !newItem.name_en.trim()
    ) {
      return;
    }


    const cleanSubcategoryEn =
      newItem.category_en.trim();

    const cleanSubcategoryHe =
      newItem.category_he.trim();


    const selectedSubcategory =
      (
        cleanSubcategoryEn ||
        cleanSubcategoryHe
      )
        ? activeSubcategories.find(
            subcategory => {

              const subEn =
                String(
                  subcategory.name_en ||
                  ""
                )
                  .trim()
                  .toLowerCase();


              const subHe =
                String(
                  subcategory.name_he ||
                  ""
                )
                  .trim()
                  .toLowerCase();


              const wantedEn =
                cleanSubcategoryEn
                  .toLowerCase();


              const wantedHe =
                cleanSubcategoryHe
                  .toLowerCase();


              return (
                (
                  !wantedEn ||
                  subEn === wantedEn
                )
                &&
                (
                  !wantedHe ||
                  subHe === wantedHe
                )
              );

            }
          )
        : null;


    if (
      (
        cleanSubcategoryEn ||
        cleanSubcategoryHe
      )
      &&
      !selectedSubcategory
    ) {

      setMsg(
        isHebrew
          ? "יש לבחור תת־קטגוריה קיימת."
          : "Please choose an existing subcategory."
      );

      return;
    }


    /*
      No Subcategory:
        group_id = top-level category.

      With Subcategory:
        group_id = child menu_group.
    */
    const targetGroupId =
      selectedSubcategory?.id ||
      newItem.section_id;


    const groupItems =
      items.filter(
        item =>
          item.group_id ===
          targetGroupId
      );


    const { error } =
      await supabase

        .from("menu_items")

        .insert({
          site_id:
            selected.id,

          group_id:
            targetGroupId,

          type:
            newItem.type === "wine"
              ? "wine"
              : "item",

          name_en:
            newItem.name_en.trim(),

          name_he:
            newItem.name_he.trim() ||
            newItem.name_en.trim(),

          description_en:
            newItem.description_en.trim() ||
            null,

          description_he:
            newItem.description_he.trim() ||
            null,

          description:
            newItem.description_en.trim() ||
            newItem.description_he.trim() ||
            newItem.description.trim() ||
            null,

          price:
            newItem.type === "wine"
              ? null
              : newItem.price.trim() ||
                null,

          origin_en:
            newItem.type === "wine"
              ? (
                  newItem.origin_en.trim() ||
                  null
                )
              : null,

          origin_he:
            newItem.type === "wine"
              ? (
                  newItem.origin_he.trim() ||
                  null
                )
              : null,

          origin:
            newItem.type === "wine"
              ? (
                  (
                    newItem.origin_en.trim() &&
                    newItem.origin_he.trim()
                  )
                    ? `${newItem.origin_en.trim()} · ${newItem.origin_he.trim()}`
                    : newItem.origin_en.trim() ||
                      newItem.origin_he.trim() ||
                      null
                )
              : null,

          wine_glass:
            newItem.type === "wine"
              ? (
                  newItem.wine_glass.trim() ||
                  null
                )
              : null,

          wine_bottle:
            newItem.type === "wine"
              ? (
                  newItem.wine_bottle.trim() ||
                  null
                )
              : null,

          visible:
            true,

          sort_order:
            groupItems.length
        });


    if (error) {

      setMsg(
        error.message
      );

      return;
    }


    setActiveSectionId(
      newItem.section_id
    );

    setShowAddItem(
      false
    );


    await loadData(
      selected.id
    );


    setMsg(
      "Item added."
    );
  };

  const startItemEdit = menuItem => {

    setEditingItemId(
      menuItem.id
    );


    const itemGroup =
      groups.find(
        group =>
          group.id ===
          menuItem.group_id
      );


    let rootGroup =
      itemGroup;


    const visited =
      new Set();


    while (
      rootGroup?.parent_id
    ) {

      if (
        visited.has(
          rootGroup.id
        )
      ) {
        break;
      }


      visited.add(
        rootGroup.id
      );


      rootGroup =
        groups.find(
          group =>
            group.id ===
            rootGroup.parent_id
        );

    }


    const nestedItemGroup =
      itemGroup?.parent_id
        ? itemGroup
        : null;


    setItemDraft({
      section_id:
        rootGroup?.id ||
        "",

      type:
        menuItem.type === "wine"
          ? "wine"
          : "item",

      name_en:
        menuItem.name_en ||
        "",

      name_he:
        menuItem.name_he ||
        "",

      category_en:
        nestedItemGroup?.name_en ||
        "",

      category_he:
        nestedItemGroup?.name_he ||
        "",

      description:
        menuItem.description ||
        "",

      description_en:
        menuItem.description_en ||
        menuItem.description ||
        "",

      description_he:
        menuItem.description_he ||
        "",

      price:
        menuItem.price ||
        "",

      origin_en:
        menuItem.origin_en ||
        "",

      origin_he:
        menuItem.origin_he ||
        "",

      wine_glass:
        menuItem.wine_glass ||
        "",

      wine_bottle:
        menuItem.wine_bottle ||
        ""
    });
  };

  const saveItem = async () => {

    if (
      !editingItemId ||
      !itemDraft.section_id ||
      !itemDraft.name_en.trim()
    ) {
      return;
    }


    const cleanSubcategoryEn =
      itemDraft.category_en.trim();

    const cleanSubcategoryHe =
      itemDraft.category_he.trim();


    const draftSubcategories =
      subcategories.filter(
        subcategory =>
          subcategory.parent_id ===
          itemDraft.section_id
      );


    const selectedSubcategory =
      (
        cleanSubcategoryEn ||
        cleanSubcategoryHe
      )
        ? draftSubcategories.find(
            subcategory => {

              const subEn =
                String(
                  subcategory.name_en ||
                  ""
                )
                  .trim()
                  .toLowerCase();


              const subHe =
                String(
                  subcategory.name_he ||
                  ""
                )
                  .trim()
                  .toLowerCase();


              const wantedEn =
                cleanSubcategoryEn
                  .toLowerCase();


              const wantedHe =
                cleanSubcategoryHe
                  .toLowerCase();


              return (
                (
                  !wantedEn ||
                  subEn === wantedEn
                )
                &&
                (
                  !wantedHe ||
                  subHe === wantedHe
                )
              );

            }
          )
        : null;


    if (
      (
        cleanSubcategoryEn ||
        cleanSubcategoryHe
      )
      &&
      !selectedSubcategory
    ) {

      setMsg(
        isHebrew
          ? "יש לבחור תת־קטגוריה קיימת."
          : "Please choose an existing subcategory."
      );

      return;
    }


    const targetGroupId =
      selectedSubcategory?.id ||
      itemDraft.section_id;


    const { error } =
      await supabase

        .from("menu_items")

        .update({
          group_id:
            targetGroupId,

          type:
            itemDraft.type === "wine"
              ? "wine"
              : "item",

          name_en:
            itemDraft.name_en.trim(),

          name_he:
            itemDraft.name_he.trim() ||
            itemDraft.name_en.trim(),

          description_en:
            itemDraft.description_en.trim() ||
            null,

          description_he:
            itemDraft.description_he.trim() ||
            null,

          description:
            itemDraft.description_en.trim() ||
            itemDraft.description_he.trim() ||
            itemDraft.description.trim() ||
            null,

          price:
            itemDraft.type === "wine"
              ? null
              : itemDraft.price.trim() ||
                null,

          origin_en:
            itemDraft.type === "wine"
              ? (
                  itemDraft.origin_en.trim() ||
                  null
                )
              : null,

          origin_he:
            itemDraft.type === "wine"
              ? (
                  itemDraft.origin_he.trim() ||
                  null
                )
              : null,

          origin:
            itemDraft.type === "wine"
              ? (
                  (
                    itemDraft.origin_en.trim() &&
                    itemDraft.origin_he.trim()
                  )
                    ? `${itemDraft.origin_en.trim()} · ${itemDraft.origin_he.trim()}`
                    : itemDraft.origin_en.trim() ||
                      itemDraft.origin_he.trim() ||
                      null
                )
              : null,

          wine_glass:
            itemDraft.type === "wine"
              ? (
                  itemDraft.wine_glass.trim() ||
                  null
                )
              : null,

          wine_bottle:
            itemDraft.type === "wine"
              ? (
                  itemDraft.wine_bottle.trim() ||
                  null
                )
              : null
        })

        .eq(
          "id",
          editingItemId
        );


    if (error) {

      setMsg(
        error.message
      );

      return;
    }


    setEditingItemId(
      ""
    );


    setActiveSectionId(
      itemDraft.section_id
    );


    await loadData(
      selected.id
    );


    setMsg(
      "Item updated."
    );
  };

  const toggleItem = async menuItem => {
    const { error } = await supabase
      .from("menu_items")
      .update({
        visible: menuItem.visible === false
      })
      .eq("id", menuItem.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await loadData(selected.id);
  };

  const deleteItem = async menuItem => {
    if (!window.confirm(`Delete "${studioPrimaryName(menuItem)}"?`)) return;

    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", menuItem.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await loadData(selected.id);
    setMsg("Item deleted.");
  };

  const moveCategory =
    async (
      sectionId,
      direction
    ) => {

      const index =
        sections.findIndex(
          section =>
            section.id ===
            sectionId
        );


      const targetIndex =
        index +
        direction;


      if (
        index < 0 ||
        targetIndex < 0 ||
        targetIndex >=
          sections.length
      ) {
        return;
      }


      const reordered =
        [
          ...sections
        ];


      [
        reordered[index],
        reordered[targetIndex]
      ] = [
        reordered[targetIndex],
        reordered[index]
      ];


      const normalized =
        reordered.map(
          (
            section,
            sort_order
          ) => ({
            ...section,
            sort_order
          })
        );


      setSections(
        normalized
      );


      const results =
        await Promise.all(

          normalized.map(
            section =>
              supabase

                .from("menu_groups")

                .update({
                  sort_order:
                    section.sort_order
                })

                .eq(
                  "id",
                  section.id
                )
          )

        );


      const failed =
        results.find(
          result =>
            result.error
        );


      if (
        failed?.error
      ) {

        setMsg(
          failed.error.message
        );


        await loadData(
          selected.id
        );


        return;
      }


      setMsg(
        "Category order updated."
      );
    };

  const moveItem =
    async (
      itemId,
      direction
    ) => {

      const movingItem =
        items.find(
          item =>
            item.id ===
            itemId
        );


      if (
        !movingItem?.group_id
      ) {
        return;
      }


      const groupItems =
        items

          .filter(
            item =>
              item.group_id ===
              movingItem.group_id
          )

          .sort(
            (a, b) =>
              Number(
                a.sort_order || 0
              ) -
              Number(
                b.sort_order || 0
              )
          );


      const index =
        groupItems.findIndex(
          item =>
            item.id ===
            itemId
        );


      const targetIndex =
        index +
        direction;


      if (
        index < 0 ||
        targetIndex < 0 ||
        targetIndex >=
          groupItems.length
      ) {
        return;
      }


      const reordered =
        [
          ...groupItems
        ];


      [
        reordered[index],
        reordered[targetIndex]
      ] = [
        reordered[targetIndex],
        reordered[index]
      ];


      const normalized =
        reordered.map(
          (
            item,
            sort_order
          ) => ({
            ...item,
            sort_order
          })
        );


      const results =
        await Promise.all(

          normalized.map(
            item =>
              supabase

                .from("menu_items")

                .update({
                  sort_order:
                    item.sort_order
                })

                .eq(
                  "id",
                  item.id
                )
          )

        );


      const failed =
        results.find(
          result =>
            result.error
        );


      if (
        failed?.error
      ) {

        setMsg(
          failed.error.message
        );


        await loadData(
          selected.id
        );


        return;
      }


      await loadData(
        selected.id
      );
    };

  const uploadRestaurantLogo = async file => {
    if (
      !selected ||
      !user ||
      !file ||
      logoUploading
    ) return;

    const allowedTypes = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml"
    ]);

    if (!allowedTypes.has(file.type)) {
      setMsg(
        "Logo must be PNG, JPG, WEBP or SVG."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMsg(
        "Logo must be smaller than 5 MB."
      );
      return;
    }

    const extension =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/svg+xml"
          ? "svg"
          : file.type.split("/")[1];

    const objectPath =
      `${user.id}/${selected.id}/logo-${Date.now()}.${extension}`;

    setLogoUploading(true);
    setMsg("Uploading logo…");

    const { error: uploadError } =
      await supabase.storage
        .from("menu-logos")
        .upload(
          objectPath,
          file,
          {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
          }
        );

    if (uploadError) {
      setLogoUploading(false);
      setMsg(uploadError.message);
      return;
    }

    const { data: publicData } =
      supabase.storage
        .from("menu-logos")
        .getPublicUrl(objectPath);

    const publicUrl =
      publicData?.publicUrl || "";

    if (!publicUrl) {
      setLogoUploading(false);
      setMsg(
        "Logo uploaded, but its public URL could not be created."
      );
      return;
    }

    const { error: updateError } =
      await supabase
        .from("menu_sites")
        .update({
          logo_url: publicUrl
        })
        .eq("id", selected.id);

    if (updateError) {
      setLogoUploading(false);
      setMsg(updateError.message);
      return;
    }

    await loadSites(selected.id);

    setLogoUploading(false);
    setMsg("Restaurant logo updated.");
  };

  const removeRestaurantLogo = async () => {
    if (!selected) return;

    const { error } =
      await supabase
        .from("menu_sites")
        .update({
          logo_url: null
        })
        .eq("id", selected.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await loadSites(selected.id);
    setMsg("Restaurant logo removed.");
  };

  const saveRestaurantSettings = async () => {
    if (!selected) return;

    const cleanName = siteDraft.name.trim();
    const cleanSlug = slugify(siteDraft.slug || cleanName);

    if (!cleanName) {
      setMsg("Restaurant name is required.");
      return;
    }

    if (!cleanSlug) {
      setMsg("Menu URL is required.");
      return;
    }

    const { error } = await supabase
      .from("menu_sites")
      .update({
        name: cleanName,
        slug: cleanSlug
      })
      .eq("id", selected.id);

    if (error) {
      if (
        String(error.message || "")
          .toLowerCase()
          .includes("duplicate")
      ) {
        setMsg("That menu URL is already being used. Choose another one.");
      } else {
        setMsg(error.message);
      }

      return;
    }

    setSiteDraft({
      name: cleanName,
      slug: cleanSlug
    });

    await loadSites(selected.id);

    setMsg("Restaurant settings updated.");
  };

  const activeSection = sections.find(
    section => section.id === activeSectionId
  );

  const activeSubcategories =
    subcategories
      .filter(
        subcategory =>
          subcategory.section_id ===
          activeSectionId
      )
      .sort(
        (a, b) =>
          Number(a.sort_order || 0) -
          Number(b.sort_order || 0)
      );


  const studioSubcategoryPrimaryName =
    subcategory => {

      if (!subcategory) return "";

      return isHebrew
        ? (
            subcategory.name_he ||
            subcategory.name_en ||
            ""
          )
        : (
            subcategory.name_en ||
            subcategory.name_he ||
            ""
          );
    };


  const studioSubcategorySecondaryName =
    subcategory => {

      if (!subcategory) return "";

      const primary =
        studioSubcategoryPrimaryName(
          subcategory
        );

      const secondary =
        isHebrew
          ? subcategory.name_en
          : subcategory.name_he;

      return (
        secondary &&
        secondary !== primary
      )
        ? secondary
        : "";
    };


  const renderStudioSubcategoryHeading = (
    subcategory,
    itemCount = 0
  ) => {

    if (!subcategory) return null;

    const primary =
      studioSubcategoryPrimaryName(
        subcategory
      );

    const secondary =
      studioSubcategorySecondaryName(
        subcategory
      );

    const index =
      activeSubcategories.findIndex(
        value =>
          value.id ===
          subcategory.id
      );

    return (
      <>

        <div
          className={`bm-owner-subcategory-heading ${
            subcategory.visible === false
              ? "hidden"
              : ""
          }`}
        >

          <div className="bm-owner-subcategory-copy">

            <strong>
              {primary}
            </strong>

            {secondary ? (
              <span
                dir={
                  isHebrew
                    ? "ltr"
                    : "rtl"
                }
              >
                {secondary}
              </span>
            ) : null}

          </div>


          <div className="bm-owner-subcategory-heading-actions">

            <em>
              {itemCount}{" "}
              {isHebrew
                ? "פריטים"
                : itemCount === 1
                  ? "item"
                  : "items"}
            </em>


            <button
              type="button"
              className="bm-owner-item-more"
              aria-label={
                isHebrew
                  ? "אפשרויות תת־קטגוריה"
                  : "Subcategory options"
              }
              aria-expanded={
                openSubcategoryMenuId ===
                subcategory.id
              }
              onClick={() =>
                setOpenSubcategoryMenuId(
                  current =>
                    current ===
                    subcategory.id
                      ? ""
                      : subcategory.id
                )
              }
            >
              •••
            </button>

          </div>

        </div>


        {openSubcategoryMenuId ===
          subcategory.id &&
        studioPortalTarget ? (
          createPortal(
            <>

              <button
                type="button"
                className="bm-owner-item-sheet-backdrop"
                aria-label={
                  isHebrew
                    ? "סגור"
                    : "Close"
                }
                onClick={() =>
                  setOpenSubcategoryMenuId("")
                }
              />


              <div
                className="bm-owner-item-sheet"
                role="dialog"
                aria-modal="true"
              >

                <div className="bm-owner-item-sheet-handle" />


                <div className="bm-owner-item-sheet-head">

                  <div>
                    <strong>
                      {primary}
                    </strong>

                    {secondary ? (
                      <span>
                        {secondary}
                      </span>
                    ) : null}
                  </div>

                  <b>
                    {itemCount}{" "}
                    {isHebrew
                      ? "פריטים"
                      : itemCount === 1
                        ? "item"
                        : "items"}
                  </b>

                </div>


                <div className="bm-owner-item-sheet-actions">

                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      setOpenSubcategoryMenuId("");

                      startSubcategoryEdit(
                        subcategory
                      );
                    }}
                  >
                    <span>
                      ✎
                    </span>

                    {isHebrew
                      ? "עריכת תת־הקטגוריה"
                      : "Edit subcategory"}
                  </button>


                  <button
                    type="button"
                    onClick={() => {
                      setOpenSubcategoryMenuId("");

                      toggleSubcategoryVisibility(
                        subcategory
                      );
                    }}
                  >
                    <span>
                      {subcategory.visible === false
                        ? "◉"
                        : "○"}
                    </span>

                    {subcategory.visible === false
                      ? (
                          isHebrew
                            ? "הצג בתפריט"
                            : "Show in menu"
                        )
                      : (
                          isHebrew
                            ? "הסתר מהתפריט"
                            : "Hide from menu"
                        )}
                  </button>


                  <div className="bm-owner-item-sheet-move">

                    <button
                      type="button"
                      disabled={
                        index <= 0
                      }
                      onClick={() => {
                        setOpenSubcategoryMenuId("");

                        moveSubcategory(
                          subcategory,
                          "up"
                        );
                      }}
                    >
                      ↑

                      <span>
                        {isHebrew
                          ? "הזז למעלה"
                          : "Move up"}
                      </span>
                    </button>


                    <button
                      type="button"
                      disabled={
                        index === -1 ||
                        index ===
                          activeSubcategories.length - 1
                      }
                      onClick={() => {
                        setOpenSubcategoryMenuId("");

                        moveSubcategory(
                          subcategory,
                          "down"
                        );
                      }}
                    >
                      ↓

                      <span>
                        {isHebrew
                          ? "הזז למטה"
                          : "Move down"}
                      </span>
                    </button>

                  </div>


                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setOpenSubcategoryMenuId("");

                      deleteSubcategory(
                        subcategory
                      );
                    }}
                  >
                    <span>
                      ⌫
                    </span>

                    {isHebrew
                      ? "מחיקת תת־הקטגוריה"
                      : "Delete subcategory"}
                  </button>

                </div>

              </div>

            </>,
            studioPortalTarget
          )
        ) : null}

      </>
    );
  };


  const activeItems = (() => {

      const groupMap =
        new Map(
          groups.map(
            group => [
              group.id,
              group
            ]
          )
        );


      const rootGroupId =
        groupId => {

          let current =
            groupMap.get(
              groupId
            );


          const visited =
            new Set();


          while (
            current?.parent_id
          ) {

            if (
              visited.has(
                current.id
              )
            ) {
              return "";
            }


            visited.add(
              current.id
            );


            current =
              groupMap.get(
                current.parent_id
              );

          }


          return (
            current?.id ||
            ""
          );
        };


      const visibleItems =
        items.filter(
          item =>
            rootGroupId(
              item.group_id
            ) ===
            activeSectionId
        );


      return visibleItems.sort(
        (a, b) => {

          /*
            An item whose group_id IS the active top-level
            category has NO Subcategory.

            These items MUST come before every nested group.
          */
          const aDirect =
            a.group_id ===
            activeSectionId;


          const bDirect =
            b.group_id ===
            activeSectionId;


          if (
            aDirect &&
            !bDirect
          ) {
            return -1;
          }


          if (
            !aDirect &&
            bDirect
          ) {
            return 1;
          }


          /*
            Both are direct-category items.
          */
          if (
            aDirect &&
            bDirect
          ) {

            return (
              Number(
                a.sort_order || 0
              ) -
              Number(
                b.sort_order || 0
              )
            );

          }


          /*
            Both are nested.

            Sort first by their actual menu_group order.
          */
          const aGroup =
            groupMap.get(
              a.group_id
            );


          const bGroup =
            groupMap.get(
              b.group_id
            );


          const aGroupOrder =
            Number(
              aGroup?.sort_order ||
              0
            );


          const bGroupOrder =
            Number(
              bGroup?.sort_order ||
              0
            );


          if (
            aGroupOrder !==
            bGroupOrder
          ) {

            return (
              aGroupOrder -
              bGroupOrder
            );

          }


          /*
            Stable ordering between different groups that
            happen to share the same sort_order.
          */
          if (
            a.group_id !==
            b.group_id
          ) {

            return String(
              a.group_id
            ).localeCompare(
              String(
                b.group_id
              )
            );

          }


          /*
            Same Subcategory:
            use the item's own order.
          */
          return (
            Number(
              a.sort_order || 0
            ) -
            Number(
              b.sort_order || 0
            )
          );

        }
      );

    })();


  const itemSectionKey = sectionId =>
    String(
      sections.find(
        section => section.id === sectionId
      )?.section_key || ""
    )
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const isDualPriceSection = sectionId =>
    new Set([
      "mix",
      "drinkstomix",
      "whiskey",
      "whisky",
      "liquor",
      "cognac"
    ]).has(itemSectionKey(sectionId));

  const studioPrice = menuItem => {
    if (menuItem.type !== "wine") {
      return menuItem.price || "—";
    }

    const glass = String(
      menuItem.wine_glass || ""
    ).trim();

    const bottle = String(
      menuItem.wine_bottle || ""
    ).trim();

    const money = value => {
      if (!value) return "";
      return /[₪€$£]/.test(value)
        ? value
        : `₪${value}`;
    };

    if (glass && bottle) {
      return `${money(glass)} / ${money(bottle)}`;
    }

    return money(glass || bottle) || "—";
  };

  // BEYOND_PRICE_CURRENCY_HELPERS_V1

  const getPriceCurrency = value => {
    const text = String(
      value || ""
    ).trim();

    return text.includes("$")
      ? "$"
      : "₪";
  };

  const getPriceAmount = value =>
    String(value || "")
      .replace(/[₪$]/g, "")
      .replace(/\s*\/\s*/g, " / ")
      .trim();

  const buildPriceValue = (
    amount,
    currency = "₪"
  ) => {
    const clean = String(
      amount || ""
    ).trim();

    if (!clean) {
      return "";
    }

    /*
      Supports both:
      57
      and dual prices such as:
      18 / 35

      Result:
      ₪57
      ₪18 / ₪35
    */
    return clean
      .split("/")
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => `${currency}${part}`)
      .join(" / ");
  };


  const renderItemFields = (
    draft,
    setDraft
  ) => {
    const isWine = draft.type === "wine";

    return (
      <>
        <label className="bm-field-category">
          {isHebrew
            ? "קטגוריית תפריט"
            : "Menu category"}

          <select
            value={draft.section_id}
            required
            onChange={e =>
              setDraft(current => ({
                ...current,
                section_id: e.target.value
              }))
            }
          >
            <option value="" disabled>
              {isHebrew ? "בחר" : "Choose"}
            </option>

            {sections.map(section => (
              <option
                key={section.id}
                value={section.id}
              >
                {studioPrimaryName(section)}
              </option>
            ))}
          </select>
        </label>

        <label className="bm-field-type">
          {isHebrew
            ? "סוג פריט"
            : "Item type"}

          <select
            value={draft.type}
            required
            onChange={e =>
              setDraft(current => ({
                ...current,
                type: e.target.value
              }))
            }
          >
            <option value="" disabled>
              {isHebrew ? "בחר" : "Choose"}
            </option>

            <option value="item">
              {isHebrew
                ? "פריט רגיל"
                : "Regular item"}
            </option>

            <option value="wine">
              {isHebrew
                ? "יין"
                : "Wine"}
            </option>
          </select>
        </label>

        <label className="bm-field-name-en">
          {isHebrew
            ? "שם באנגלית"
            : "English name"}

          <input
            value={draft.name_en}
            onChange={e =>
              setDraft(current => ({
                ...current,
                name_en: e.target.value
              }))
            }
            placeholder="New Item"
          />
        </label>

        <label className="bm-field-name-he">
          {isHebrew
            ? "שם בעברית"
            : "Hebrew name"}

          <input
            dir="rtl"
            value={draft.name_he}
            onChange={e =>
              setDraft(current => ({
                ...current,
                name_he: e.target.value
              }))
            }
            placeholder="פריט חדש"
          />
        </label>

        <label className="bm-field-category-en">
          {isHebrew
            ? "תת־קטגוריה באנגלית"
            : "Subcategory EN"}

          <input
            value={draft.category_en}
            onChange={e =>
              setDraft(current => ({
                ...current,
                category_en: e.target.value
              }))
            }
            placeholder="Pizza"
          />
        </label>

        <label className="bm-field-category-he">
          {isHebrew
            ? "תת־קטגוריה בעברית"
            : "Subcategory HE"}

          <input
            dir="rtl"
            value={draft.category_he}
            onChange={e =>
              setDraft(current => ({
                ...current,
                category_he: e.target.value
              }))
            }
            placeholder="פיצה"
          />
        </label>

        {isWine ? (
          <>
            <label className="bm-field-origin-en">
              {isHebrew
                ? "ארץ מקור באנגלית"
                : "Origin EN"}

              <input
                value={draft.origin_en}
                onChange={e =>
                  setDraft(current => ({
                    ...current,
                    origin_en: e.target.value
                  }))
                }
                placeholder="France"
              />
            </label>

            <label className="bm-field-origin-he">
              {isHebrew
                ? "ארץ מקור בעברית"
                : "Origin HE"}

              <input
                dir="rtl"
                value={draft.origin_he}
                onChange={e =>
                  setDraft(current => ({
                    ...current,
                    origin_he: e.target.value
                  }))
                }
                placeholder="צרפת"
              />
            </label>

            <label className="bm-field-price bm-field-glass-price">
              {isHebrew
                ? "מחיר לכוס"
                : "Glass price"}

              <div className="bm-price-field">

                <select
                  className="bm-price-currency"
                  aria-label={isHebrew ? "מטבע למחיר כוס" : "Glass price currency"}
                  value={
                    getPriceCurrency(
                      draft.wine_glass
                    )
                  }
                  onChange={e =>
                    setDraft(current => ({
                      ...current,
                      wine_glass:
                        buildPriceValue(
                          getPriceAmount(
                            current.wine_glass
                          ),
                          e.target.value
                        )
                    }))
                  }
                >
                  <option value="₪">
                    ₪
                  </option>

                  <option value="$">
                    $
                  </option>
                </select>

                <input
                  inputMode="decimal"
                  value={
                    getPriceAmount(
                      draft.wine_glass
                    )
                  }
                  onChange={e =>
                    setDraft(current => ({
                      ...current,
                      wine_glass:
                        buildPriceValue(
                          e.target.value,
                          getPriceCurrency(
                            current.wine_glass
                          )
                        )
                    }))
                  }
                  placeholder="35"
                />

              </div>
            </label>

            <label className="bm-field-price bm-field-bottle-price">
              {isHebrew
                ? "מחיר לבקבוק"
                : "Bottle price"}

              <div className="bm-price-field">

                <select
                  className="bm-price-currency"
                  aria-label={isHebrew ? "מטבע למחיר בקבוק" : "Bottle price currency"}
                  value={
                    getPriceCurrency(
                      draft.wine_bottle
                    )
                  }
                  onChange={e =>
                    setDraft(current => ({
                      ...current,
                      wine_bottle:
                        buildPriceValue(
                          getPriceAmount(
                            current.wine_bottle
                          ),
                          e.target.value
                        )
                    }))
                  }
                >
                  <option value="₪">
                    ₪
                  </option>

                  <option value="$">
                    $
                  </option>
                </select>

                <input
                  inputMode="decimal"
                  value={
                    getPriceAmount(
                      draft.wine_bottle
                    )
                  }
                  onChange={e =>
                    setDraft(current => ({
                      ...current,
                      wine_bottle:
                        buildPriceValue(
                          e.target.value,
                          getPriceCurrency(
                            current.wine_bottle
                          )
                        )
                    }))
                  }
                  placeholder="150"
                />

              </div>
            </label>
          </>
        ) : (
          <label className="bm-field-price bm-field-regular-price">
            {isHebrew
              ? "מחיר"
              : "Price"}

            <div className="bm-price-field">

              <select
                className="bm-price-currency"
                aria-label={isHebrew ? "מטבע" : "Price currency"}
                value={
                  getPriceCurrency(
                    draft.price
                  )
                }
                onChange={e =>
                  setDraft(current => ({
                    ...current,
                    price:
                      buildPriceValue(
                        getPriceAmount(
                          current.price
                        ),
                        e.target.value
                      )
                  }))
                }
              >
                <option value="₪">
                  ₪
                </option>

                <option value="$">
                  $
                </option>
              </select>

              <input
                inputMode={
                  isDualPriceSection(
                    draft.section_id
                  )
                    ? "text"
                    : "decimal"
                }
                value={
                  getPriceAmount(
                    draft.price
                  )
                }
                onChange={e =>
                  setDraft(current => ({
                    ...current,
                    price:
                      buildPriceValue(
                        e.target.value,
                        getPriceCurrency(
                          current.price
                        )
                      )
                  }))
                }
                placeholder={
                  isDualPriceSection(
                    draft.section_id
                  )
                    ? "18 / 35"
                    : "32"
                }
              />

            </div>
          </label>
        )}

        <label className="bm-v10-wide bm-field-description-en">
          {isHebrew
            ? "תיאור באנגלית"
            : "Description EN"}

          <textarea
            rows="3"
            value={draft.description_en}
            onChange={e =>
              setDraft(current => ({
                ...current,
                description_en:
                  e.target.value
              }))
            }
          />
        </label>

        <label className="bm-v10-wide bm-field-description-he">
          {isHebrew
            ? "תיאור בעברית"
            : "Description HE"}

          <textarea
            dir="rtl"
            rows="3"
            value={draft.description_he}
            onChange={e =>
              setDraft(current => ({
                ...current,
                description_he:
                  e.target.value
              }))
            }
          />
        </label>

        {!isWine &&
        isDualPriceSection(
          draft.section_id
        ) ? (
          <div className="bm-v10-note">
            {isHebrew
              ? "הזן את שני המחירים מופרדים ב־/ — לדוגמה ₪18 / ₪35. בתפריט יוצגו מחירי שוט וכוס."
              : "Enter both prices separated by / — for example ₪18 / ₪35. The public menu will display shot and glass pricing."}
          </div>
        ) : null}
      </>
    );
  };

  return (
    <div
      className={`bm-shell bm-owner-dashboard bm-theme-${studioTheme}${
        showSettings
          ? " bm-settings-open"
          : ""
      }${
        showPreview
          ? " bm-preview-open"
          : ""
      }`}
    >

      <header className="bm-head bm-owner-header">

        <div className="bm-owner-header-copy">

          <span>
            BEYOND FOR BUSINESS
          </span>

          <h1>
            {isHebrew
              ? "עריכת תפריט"
              : "Menu Studio"}
          </h1>

          <p>
            {isHebrew
              ? "נהל את התפריט הדיגיטלי שלך."
              : "Manage your digital menu."}
          </p>

        </div>


        <div className="bm-owner-header-actions">

          <BeyondLanguageToggle
            className="bm-language-toggle"
          />


          <button
            type="button"
            className="bm-theme-toggle"
            aria-label={
              studioTheme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            onClick={() =>
              setStudioTheme(current =>
                current === "dark"
                  ? "light"
                  : "dark"
              )
            }
          >
            {studioTheme === "dark" ? (
              <Sun
                size={17}
                strokeWidth={1.8}
              />
            ) : (
              <Moon
                size={17}
                strokeWidth={1.8}
              />
            )}

            <span>
              {studioTheme === "dark"
                ? "LIGHT"
                : "DARK"}
            </span>
          </button>


          {isMenuAdmin ? (
            <>
              <button
                className="bm-desktop-header-action"
                onClick={() =>
                  setShowCreateSite(v => !v)
                }
              >
                + NEW MENU
              </button>

              <button
                className="bm-desktop-header-action"
                onClick={() =>
                  location.href = "/admin/menus"
                }
              >
                ADMIN
              </button>
            </>
          ) : null}


          <button
            className="bm-desktop-header-action"
            onClick={() =>
              location.href = "/"
            }
          >
            BEYOND
          </button>


          <button
            type="button"
            className="bm-mobile-header-more"
            aria-label={
              isHebrew
                ? "אפשרויות"
                : "More options"
            }
            aria-expanded={openHeaderMenu}
            onClick={() =>
              setOpenHeaderMenu(
                current => !current
              )
            }
          >
            •••
          </button>

        </div>

      </header>


      {openHeaderMenu ? (
        <>

          <button
            type="button"
            className="bm-mobile-header-menu-backdrop"
            aria-label={
              isHebrew
                ? "סגור"
                : "Close"
            }
            onClick={() =>
              setOpenHeaderMenu(false)
            }
          />


          <div
            className="bm-mobile-header-menu"
            role="dialog"
            aria-modal="true"
          >

            <div className="bm-mobile-header-menu-handle" />


            <div className="bm-mobile-header-menu-title">

              <strong>
                {isHebrew
                  ? "עריכת תפריט"
                  : "Menu Studio"}
              </strong>

              <span>
                {selected?.name || "BEYOND"}
              </span>

            </div>


            <div className="bm-mobile-header-menu-actions">

              {isMenuAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpenHeaderMenu(false);
                    setShowCreateSite(true);
                  }}
                >
                  <span>＋</span>

                  <div>
                    <strong>
                      {isHebrew
                        ? "תפריט חדש"
                        : "New menu"}
                    </strong>

                    <small>
                      {isHebrew
                        ? "צור תפריט למסעדה חדשה"
                        : "Create another restaurant menu"}
                    </small>
                  </div>
                </button>
              ) : null}


              {isMenuAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpenHeaderMenu(false);
                    location.href =
                      "/admin/menus";
                  }}
                >
                  <span>⌘</span>

                  <div>
                    <strong>
                      {isHebrew
                        ? "ניהול"
                        : "Admin"}
                    </strong>

                    <small>
                      {isHebrew
                        ? "ניהול התפריטים והעסקים"
                        : "Manage menus and businesses"}
                    </small>
                  </div>
                </button>
              ) : null}


              <button
                type="button"
                onClick={() => {
                  setOpenHeaderMenu(false);
                  location.href = "/";
                }}
              >
                <span>←</span>

                <div>
                  <strong>
                    {isHebrew
                      ? "חזרה ל-BEYOND"
                      : "Back to BEYOND"}
                  </strong>

                  <small>
                    {isHebrew
                      ? "חזור לאתר הראשי"
                      : "Return to the main website"}
                  </small>
                </div>
              </button>

            </div>

          </div>

        </>
      ) : null}

      {msg ? (
        <button
          className="bm-msg bm-owner-message"
          onClick={() => setMsg("")}
        >
          {msg}
        </button>
      ) : null}

      {showCreateSite && isMenuAdmin ? (
        <section className="bm-card bm-owner-create">
          <div className="bm-owner-section-title">
            <div>
              <span className="bm-label">
                NEW MENU
              </span>
              <h2>Create restaurant menu</h2>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowCreateSite(false)
              }
            >
              CLOSE
            </button>
          </div>

          <form
            className="bm-form bm-owner-form"
            onSubmit={createSite}
          >
            <label>
              Restaurant name

              <input
                value={name}
                onChange={e => {
                  setName(e.target.value);

                  if (!slug) {
                    setSlug(
                      slugify(e.target.value)
                    );
                  }
                }}
                placeholder="El Puerto"
              />
            </label>

            <label>
              Menu URL

              <div className="bm-slug">
                <span>/menu/</span>

                <input
                  value={slug}
                  onChange={e =>
                    setSlug(
                      slugify(e.target.value)
                    )
                  }
                />
              </div>
            </label>

            <button>
              CREATE MENU
            </button>
          </form>
        </section>
      ) : null}

      {!selected ? (
        <section className="bm-card bm-owner-empty">
          <h2>Create your first menu</h2>
          <p>
            Create a restaurant menu to start
            adding categories and items.
          </p>

          {isMenuAdmin ? (
            <button
              onClick={() =>
                setShowCreateSite(true)
              }
            >
              CREATE MENU
            </button>
          ) : (
            <div className="bm-owner-not-assigned">
              <strong>No restaurant assigned</strong>
              <span>
                Ask your Beyond administrator to assign your restaurant to this account.
              </span>
            </div>
          )}
        </section>
      ) : (
        <>

          <section className="bm-owner-sitebar">

            <div className="bm-owner-site-main">
              <div className="bm-owner-site-title">
                <span
                  className={`bm-owner-status ${
                    selected.published
                      ? "live"
                      : "draft"
                  }`}
                >
                  {selected.published
                    ? "● LIVE"
                    : "● DRAFT"}
                </span>

                <h2>{selected.name}</h2>
              </div>

              <a
                className="bm-owner-menu-url-button"
                href={liveUrl(selected.slug)}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                aria-label={`Open /menu/${selected.slug}`}
              >
                <strong>
                  /menu/{selected.slug}
                </strong>
              </a>
            </div>

            <div className="bm-owner-site-actions">

              <button
                className={
                  showSettings
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setShowSettings(v => !v)
                }
              >
                <span
                  className="bm-mobile-nav-icon"
                  aria-hidden="true"
                >
                  ⚙
                </span>

                <span className="bm-mobile-nav-label">
                  {isHebrew
                    ? "הגדרות"
                    : "Settings"}
                </span>

                <span className="bm-desktop-action-label">
                  SETTINGS
                </span>
              </button>


              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowPreview(true);
                }}
              >
                <span
                  className="bm-mobile-nav-icon"
                  aria-hidden="true"
                >
                  ◉
                </span>

                <span className="bm-mobile-nav-label">
                  {isHebrew
                    ? "תצוגה"
                    : "Preview"}
                </span>

                <span className="bm-desktop-action-label">
                  VIEW MENU
                </span>
              </button>


              <button
                className={`primary bm-owner-desktop-publish ${
                  selected.published
                    ? "published"
                    : ""
                }`}
                onClick={confirmPublishChange}
              >
                <span
                  className="bm-mobile-nav-icon"
                  aria-hidden="true"
                >
                  {selected.published
                    ? "✓"
                    : "↑"}
                </span>

                <span className="bm-mobile-nav-label">
                  {selected.published
                    ? (
                        isHebrew
                          ? "פורסם"
                          : "Live"
                      )
                    : (
                        isHebrew
                          ? "פרסום"
                          : "Publish"
                      )}
                </span>

                <span className="bm-desktop-action-label">
                  {selected.published
                    ? "UNPUBLISH"
                    : "PUBLISH"}
                </span>
              </button>

            </div>

          </section>

          {sites.length > 1 ? (
            <div className="bm-owner-site-switcher">
              {sites.map(site => (
                <button
                  key={site.id}
                  className={
                    site.id === selected.id
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setSiteId(site.id)
                  }
                >
                  {site.name}
                </button>
              ))}
            </div>
          ) : null}

          {showPreview ? (
            <section
              className="bm-owner-mobile-preview"
            >

              <header className="bm-owner-preview-header">

                <div>
                  <span>
                    {isHebrew
                      ? "תצוגה מקדימה"
                      : "PREVIEW"}
                  </span>

                  <h2>
                    {selected.name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowPreview(false)
                  }
                >
                  {isHebrew
                    ? "סגור"
                    : "CLOSE"}
                </button>

              </header>


              <div className="bm-owner-preview-browser">

                <div className="bm-owner-preview-address">

                  <span className="bm-owner-preview-live-dot" />

                  <span>
                    /menu/{selected.slug}
                  </span>

                </div>


                <div
                  className="bm-owner-preview-frame"
                  aria-label={
                    isHebrew
                      ? `תצוגה מקדימה של ${selected.name}`
                      : `${selected.name} menu preview`
                  }
                >
                  <BeyondPublicMenu
                    slug={selected.slug}
                    previewSite={selected}
                    previewGroups={groups}
                    previewSections={sections}
                    previewItems={items}
                  />
                </div>

              </div>

            </section>
          ) : null}


          {showSettings ? (
            <section className="bm-card bm-owner-settings">

              <div className="bm-owner-section-title">
                <div>
                  <span className="bm-label">
                    {isHebrew
                      ? "הגדרות מסעדה"
                      : "RESTAURANT SETTINGS"}
                  </span>

                  <h2>
                    {isHebrew
                      ? "הגדרות התפריט"
                      : "Menu settings"}
                  </h2>

                  <p className="bm-owner-settings-intro">
                    {isHebrew
                      ? "נהל את פרטי המסעדה, כתובת התפריט והמיתוג."
                      : "Manage your restaurant details, public menu URL and branding."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowSettings(false)
                  }
                >
                  {isHebrew
                    ? "סגור"
                    : "CLOSE"}
                </button>
              </div>

              <div className="bm-owner-settings-grid bm-owner-settings-grid-v5">

                <div className="bm-owner-settings-group-title">
                  <strong>
                    {isHebrew
                      ? "פרטי המסעדה"
                      : "Restaurant details"}
                  </strong>

                  <span>
                    {isHebrew
                      ? "שם המסעדה וכתובת התפריט"
                      : "Restaurant name and menu address"}
                  </span>
                </div>

                <label>
                  {isHebrew
                    ? "שם המסעדה"
                    : "Restaurant name"}

                  <input
                    value={siteDraft.name}
                    onChange={e =>
                      setSiteDraft(current => ({
                        ...current,
                        name: e.target.value
                      }))
                    }
                    placeholder="El Puerto"
                  />
                </label>

                <label>
                  {isHebrew
                    ? "כתובת התפריט"
                    : "Menu URL"}

                  <div className="bm-owner-url-field">
                    <span>/menu/</span>

                    <input
                      dir="ltr"
                      value={siteDraft.slug}
                      onChange={e =>
                        setSiteDraft(current => ({
                          ...current,
                          slug: slugify(e.target.value)
                        }))
                      }
                      placeholder="el-puerto"
                    />
                  </div>
                </label>

                <div className="bm-owner-settings-group-title">
                  <strong>
                    {isHebrew
                      ? "מיתוג"
                      : "Branding"}
                  </strong>

                  <span>
                    {isHebrew
                      ? "לוגו וצבע המותג"
                      : "Logo and brand color"}
                  </span>
                </div>

                <div className="bm-owner-logo-setting bm-owner-logo-upload">
                  <span className="bm-owner-setting-label">
                    {isHebrew
                      ? "לוגו המסעדה"
                      : "Restaurant logo"}
                  </span>

                  <div className="bm-owner-logo-upload-inner">

                    <div className="bm-owner-logo-preview">
                      {selected.logo_url ? (
                        <img
                          src={selected.logo_url}
                          alt=""
                        />
                      ) : (
                        <strong>
                          {selected.name
                            ?.trim()
                            ?.slice(0, 2)
                            ?.toUpperCase() ||
                            "BM"}
                        </strong>
                      )}
                    </div>

                    <div className="bm-owner-logo-upload-actions">

                      <input
                        id={`bm-menu-logo-${selected.id}`}
                        className="bm-owner-logo-file"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        disabled={logoUploading}
                        onChange={e => {
                          const file =
                            e.target.files?.[0];

                          if (file) {
                            uploadRestaurantLogo(
                              file
                            );
                          }

                          e.target.value = "";
                        }}
                      />

                      <label
                        className="bm-owner-logo-upload-button"
                        htmlFor={`bm-menu-logo-${selected.id}`}
                      >
                        {logoUploading
                          ? (
                              isHebrew
                                ? "מעלה…"
                                : "UPLOADING…"
                            )
                          : selected.logo_url
                            ? (
                                isHebrew
                                  ? "החלף לוגו"
                                  : "CHANGE LOGO"
                              )
                            : (
                                isHebrew
                                  ? "העלה לוגו"
                                  : "UPLOAD LOGO"
                              )}
                      </label>

                      {selected.logo_url ? (
                        <button
                          type="button"
                          className="bm-owner-logo-remove"
                          disabled={logoUploading}
                          onClick={
                            removeRestaurantLogo
                          }
                        >
                          {isHebrew
                            ? "הסר"
                            : "REMOVE"}
                        </button>
                      ) : null}

                      <small>
                        {isHebrew
                          ? "PNG, JPG, WEBP או SVG · עד 5MB"
                          : "PNG, JPG, WEBP or SVG · max 5 MB"}
                      </small>

                    </div>

                  </div>
                </div>

                <label className="bm-owner-color-setting">
                  {isHebrew
                    ? "צבע המותג"
                    : "Brand color"}

                  <input
                    type="color"
                    value={
                      selected.primary_color ||
                      "#556b2f"
                    }
                    onChange={e =>
                      updateSite({
                        primary_color:
                          e.target.value
                      })
                    }
                  />
                </label>

                <div className="bm-owner-settings-group-title">
                  <strong>
                    {isHebrew
                      ? "התנהגות התפריט"
                      : "Menu behavior"}
                  </strong>

                  <span>
                    {isHebrew
                      ? "בחר כיצד התפריט יוצג ללקוחות"
                      : "Choose how customers first see the menu"}
                  </span>
                </div>

                <label className="bm-owner-language-setting">
                  {isHebrew
                    ? "שפת ברירת מחדל"
                    : "Default language"}

                  <select
                    value={
                      selected.default_language ||
                      "he"
                    }
                    onChange={e =>
                      updateSite({
                        default_language:
                          e.target.value
                      })
                    }
                  >
                    <option value="he">
                      {isHebrew
                        ? "עברית"
                        : "Hebrew — עברית"}
                    </option>

                    <option value="en">
                      {isHebrew
                        ? "אנגלית"
                        : "English"}
                    </option>
                  </select>
                </label>

              </div>

              <div className="bm-owner-settings-footer">

                <div>
                  <span>
                    {isHebrew
                      ? "כתובת התפריט"
                      : "PUBLIC MENU"}
                  </span>

                  <strong dir="ltr">
                    /menu/{slugify(siteDraft.slug || siteDraft.name) || "your-menu"}
                  </strong>
                </div>

                <button
                  type="button"
                  className="bm-owner-save-settings"
                  onClick={saveRestaurantSettings}
                >
                  {isHebrew
                    ? "שמור הגדרות"
                    : "SAVE SETTINGS"}
                </button>

              </div>


              <div className="bm-owner-mobile-publish-setting">

                <div className="bm-owner-mobile-publish-copy">

                  <span>
                    {isHebrew
                      ? "סטטוס התפריט"
                      : "Menu status"}
                  </span>

                  <strong>
                    {selected.published
                      ? (
                          isHebrew
                            ? "התפריט מפורסם"
                            : "Menu is live"
                        )
                      : (
                          isHebrew
                            ? "התפריט אינו מפורסם"
                            : "Menu is not published"
                        )}
                  </strong>

                  <p>
                    {selected.published
                      ? (
                          isHebrew
                            ? "לקוחות יכולים לצפות בתפריט כרגע."
                            : "Customers can currently view this menu."
                        )
                      : (
                          isHebrew
                            ? "רק אתה יכול לראות את השינויים כרגע."
                            : "Only you can see the changes right now."
                        )}
                  </p>

                </div>


                <button
                  type="button"
                  className={`bm-owner-mobile-publish-button ${
                    selected.published
                      ? "is-live"
                      : "is-draft"
                  }`}
                  onClick={confirmPublishChange}
                >
                  {selected.published
                    ? (
                        isHebrew
                          ? "ביטול פרסום"
                          : "Unpublish menu"
                      )
                    : (
                        isHebrew
                          ? "פרסום התפריט"
                          : "Publish menu"
                      )}
                </button>

              </div>

            </section>
          ) : null}

          {/* BEYOND_PUBLISH_CONFIRM_DIALOG_START */}

          {publishConfirmOpen && selected ? (
            <div
              className={`bm-publish-confirm-layer bm-theme-${studioTheme}`}
              role="presentation"
              onClick={() => {
                if (!publishSaving) {
                  setPublishConfirmOpen(false);
                }
              }}
            >

              <section
                className="bm-publish-confirm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="bm-publish-confirm-title"
                aria-describedby="bm-publish-confirm-description"
                onClick={e =>
                  e.stopPropagation()
                }
              >

                <div
                  className={`bm-publish-confirm-status ${
                    selected.published
                      ? "is-unpublish"
                      : "is-publish"
                  }`}
                >
                  <span
                    className="bm-publish-confirm-symbol"
                    aria-hidden="true"
                  >
                    {selected.published
                      ? "!"
                      : "↑"}
                  </span>

                  <span>
                    {selected.published
                      ? (
                          isHebrew
                            ? "ביטול פרסום"
                            : "UNPUBLISH"
                        )
                      : (
                          isHebrew
                            ? "פרסום התפריט"
                            : "PUBLISH MENU"
                        )}
                  </span>
                </div>


                <h2 id="bm-publish-confirm-title">
                  {selected.published
                    ? (
                        isHebrew
                          ? "לבטל את פרסום התפריט?"
                          : "Unpublish this menu?"
                      )
                    : (
                        isHebrew
                          ? "לפרסם את התפריט?"
                          : "Publish this menu?"
                      )}
                </h2>


                <p id="bm-publish-confirm-description">
                  {selected.published
                    ? (
                        isHebrew
                          ? "לקוחות לא יוכלו לגשת לתפריט עד שתפרסם אותו שוב."
                          : "Customers will no longer be able to access this menu until you publish it again."
                      )
                    : (
                        isHebrew
                          ? "לקוחות יוכלו לגשת לתפריט מיד לאחר הפרסום."
                          : "Customers will be able to access this menu immediately."
                      )}
                </p>


                <div className="bm-publish-confirm-menu-name">
                  <span>
                    {isHebrew
                      ? "תפריט"
                      : "MENU"}
                  </span>

                  <strong>
                    {selected.name}
                  </strong>
                </div>


                <div className="bm-publish-confirm-actions">

                  <button
                    type="button"
                    className="bm-publish-confirm-cancel"
                    disabled={publishSaving}
                    onClick={() =>
                      setPublishConfirmOpen(false)
                    }
                  >
                    {isHebrew
                      ? "ביטול"
                      : "Cancel"}
                  </button>


                  <button
                    type="button"
                    className={`bm-publish-confirm-submit ${
                      selected.published
                        ? "is-unpublish"
                        : "is-publish"
                    }`}
                    disabled={publishSaving}
                    onClick={applyPublishChange}
                  >
                    {publishSaving
                      ? (
                          isHebrew
                            ? "שומר…"
                            : "Saving…"
                        )
                      : selected.published
                        ? (
                            isHebrew
                              ? "בטל פרסום"
                              : "Unpublish"
                          )
                        : (
                            isHebrew
                              ? "פרסם"
                              : "Publish"
                          )}
                  </button>

                </div>

              </section>

            </div>
          ) : null}

          {/* BEYOND_PUBLISH_CONFIRM_DIALOG_END */}


          <div className="bm-owner-workspace">

            <aside className="bm-owner-categories">

              <div className="bm-owner-panel-head">
                <div>
                  <span className="bm-label">
                    MENU
                  </span>
                  <h2>Categories</h2>
                </div>

                <button
                  className="bm-owner-add"
                  onClick={() =>
                    setShowAddCategory(v => !v)
                  }
                >
                  {isHebrew
                    ? "+ הוסף קטגוריה"
                    : "+ ADD CATEGORY"}
                </button>
              </div>

              {showAddCategory ? (
                <form
                  className="bm-owner-category-form"
                  onSubmit={addCategory}
                >
                  <label>
                    English

                    <input
                      value={secEn}
                      onChange={e =>
                        setSecEn(e.target.value)
                      }
                      placeholder="New Category"
                      autoFocus
                    />
                  </label>

                  <label>
                    Hebrew

                    <input
                      dir="rtl"
                      value={secHe}
                      onChange={e =>
                        setSecHe(e.target.value)
                      }
                      placeholder="קטגוריה חדשה"
                    />
                  </label>

                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setShowAddCategory(false)
                      }
                    >
                      CANCEL
                    </button>

                    <button>
                      SAVE CATEGORY
                    </button>
                  </div>
                </form>
              ) : null}

              <div
                ref={categoryScrollRef}
                className="bm-owner-category-list"
              >

                {sections.map(section => {
                  const count = items.filter(
                    item =>
                      item.section_id ===
                      section.id
                  ).length;

                  if (
                    editingSectionId ===
                    section.id
                  ) {
                    return (
                      <div
                        className="bm-owner-category-edit"
                        key={section.id}
                      >

                        <input
                          value={
                            sectionDraft.name_en
                          }
                          onChange={e =>
                            setSectionDraft(v => ({
                              ...v,
                              name_en:
                                e.target.value
                            }))
                          }
                        />

                        <input
                          dir="rtl"
                          value={
                            sectionDraft.name_he
                          }
                          onChange={e =>
                            setSectionDraft(v => ({
                              ...v,
                              name_he:
                                e.target.value
                            }))
                          }
                        />

                        <div>
                          <button
                            onClick={() =>
                              setEditingSectionId("")
                            }
                          >
                            CANCEL
                          </button>

                          <button
                            onClick={saveCategory}
                          >
                            SAVE
                          </button>
                        </div>

                      </div>
                    );
                  }

                  const sectionIndex =
                    sections.findIndex(
                      current =>
                        current.id === section.id
                    );

                  const isFirstSection =
                    sectionIndex === 0;

                  const isLastSection =
                    sectionIndex ===
                    sections.length - 1;

                  const primarySectionName =
                    isHebrew
                      ? (
                          section.name_he ||
                          section.name_en ||
                          ""
                        )
                      : (
                          section.name_en ||
                          section.name_he ||
                          ""
                        );

                  const secondarySectionName =
                    isHebrew
                      ? section.name_en || ""
                      : section.name_he || "";

                  return (
                    <div
                      key={section.id}
                      className={`bm-owner-category ${
                        activeSectionId ===
                        section.id
                          ? "active"
                          : ""
                      } ${
                        section.visible === false
                          ? "hidden"
                          : ""
                      }`}
                    >

                      <button
                        className="bm-owner-category-main"
                        onClick={() =>
                          setActiveSectionId(
                            section.id
                          )
                        }
                      >
                        <span>

                          <strong>
                            {primarySectionName}
                          </strong>

                          {secondarySectionName &&
                          secondarySectionName !==
                          primarySectionName ? (
                            <small
                              dir={
                                isHebrew
                                  ? "ltr"
                                  : "rtl"
                              }
                            >
                              {secondarySectionName}
                            </small>
                          ) : null}

                        </span>

                        <em>
                          {count}
                        </em>

                      </button>


                      {section.visible === false ? (
                        <span className="bm-owner-category-hidden-pill">
                          {isHebrew
                            ? "מוסתרת"
                            : "Hidden"}
                        </span>
                      ) : null}


                      {/* Premium mobile category menu */}
                      <button
                        type="button"
                        className="bm-owner-category-more"
                        aria-label={
                          isHebrew
                            ? "אפשרויות קטגוריה"
                            : "Category options"
                        }
                        aria-expanded={
                          openCategoryMenuId ===
                          section.id
                        }
                        onClick={() =>
                          setOpenCategoryMenuId(
                            current =>
                              current === section.id
                                ? ""
                                : section.id
                          )
                        }
                      >
                        •••
                      </button>


                      {openCategoryMenuId ===
                      section.id &&
                      studioPortalTarget ? (
                        createPortal(
                          <>

                          <button
                            type="button"
                            className="bm-owner-category-sheet-backdrop"
                            aria-label={
                              isHebrew
                                ? "סגור"
                                : "Close"
                            }
                            onClick={() =>
                              setOpenCategoryMenuId("")
                            }
                          />

                          <div
                            className="bm-owner-category-sheet"
                            role="dialog"
                            aria-modal="true"
                          >

                            <div className="bm-owner-category-sheet-handle" />

                            <div className="bm-owner-category-sheet-head">

                              <div>
                                <strong>
                                  {primarySectionName}
                                </strong>

                                {secondarySectionName &&
                                secondarySectionName !==
                                primarySectionName ? (
                                  <span>
                                    {secondarySectionName}
                                  </span>
                                ) : null}
                              </div>

                              <b>
                                {count}{" "}
                                {isHebrew
                                  ? "פריטים"
                                  : count === 1
                                    ? "item"
                                    : "items"}
                              </b>

                            </div>


                            <div className="bm-owner-category-sheet-actions">

                              <button
                                type="button"
                                className="primary"
                                onClick={() => {
                                  setOpenCategoryMenuId("");
                                  startCategoryEdit(
                                    section
                                  );
                                }}
                              >
                                <span>✎</span>

                                {isHebrew
                                  ? "עריכת הקטגוריה"
                                  : "Edit category"}
                              </button>


                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCategoryMenuId("");
                                  toggleCategory(
                                    section
                                  );
                                }}
                              >
                                <span>
                                  {section.visible === false
                                    ? "◉"
                                    : "○"}
                                </span>

                                {section.visible === false
                                  ? (
                                      isHebrew
                                        ? "הצג בתפריט"
                                        : "Show in menu"
                                    )
                                  : (
                                      isHebrew
                                        ? "הסתר מהתפריט"
                                        : "Hide from menu"
                                    )}
                              </button>


                              <div className="bm-owner-category-sheet-move">

                                <button
                                  type="button"
                                  disabled={
                                    isFirstSection
                                  }
                                  onClick={() => {
                                    setOpenCategoryMenuId("");
                                    moveCategory(
                                      section.id,
                                      -1
                                    );
                                  }}
                                >
                                  ←

                                  <span>
                                    {isHebrew
                                      ? "מוקדם יותר"
                                      : "Earlier"}
                                  </span>
                                </button>


                                <button
                                  type="button"
                                  disabled={
                                    isLastSection
                                  }
                                  onClick={() => {
                                    setOpenCategoryMenuId("");
                                    moveCategory(
                                      section.id,
                                      1
                                    );
                                  }}
                                >
                                  →

                                  <span>
                                    {isHebrew
                                      ? "מאוחר יותר"
                                      : "Later"}
                                  </span>
                                </button>

                              </div>


                              <button
                                type="button"
                                className="danger"
                                onClick={() => {
                                  setOpenCategoryMenuId("");
                                  deleteCategory(
                                    section
                                  );
                                }}
                              >
                                <span>⌫</span>

                                {isHebrew
                                  ? "מחיקת הקטגוריה"
                                  : "Delete category"}
                              </button>

                            </div>

                          </div>

                          </>,
                          studioPortalTarget
                        )
                      ) : null}


                      {/* Existing desktop controls */}
                      <div className="bm-owner-category-actions">

                        <button
                          className="bm-move-button"
                          disabled={
                            isFirstSection
                          }
                          onClick={() =>
                            moveCategory(
                              section.id,
                              -1
                            )
                          }
                        >
                          ↑
                        </button>

                        <button
                          className="bm-move-button"
                          disabled={
                            isLastSection
                          }
                          onClick={() =>
                            moveCategory(
                              section.id,
                              1
                            )
                          }
                        >
                          ↓
                        </button>

                        <button
                          onClick={() =>
                            startCategoryEdit(
                              section
                            )
                          }
                        >
                          EDIT
                        </button>

                        <button
                          onClick={() =>
                            toggleCategory(
                              section
                            )
                          }
                        >
                          {section.visible === false
                            ? "SHOW"
                            : "HIDE"}
                        </button>

                        <button
                          className="danger"
                          onClick={() =>
                            deleteCategory(
                              section
                            )
                          }
                        >
                          DELETE
                        </button>

                      </div>

                    </div>
                  );
                })}

              </div>

            </aside>

            <main className="bm-owner-items">

              <div className="bm-owner-panel-head bm-owner-items-head">
                <div>
                  <span className="bm-label">
                    ITEMS
                  </span>

                  <h2>
                    {activeSection
                      ? (
                          isHebrew
                            ? activeSection.name_he ||
                              activeSection.name_en ||
                              ""
                            : activeSection.name_en ||
                              activeSection.name_he ||
                              ""
                        )
                      : (
                          isHebrew
                            ? "בחר קטגוריה"
                            : "Select a category"
                        )}
                  </h2>

                  {activeSection ? (
                    (() => {
                      const secondaryName =
                        isHebrew
                          ? activeSection.name_en
                          : activeSection.name_he;

                      const primaryName =
                        isHebrew
                          ? activeSection.name_he ||
                            activeSection.name_en
                          : activeSection.name_en ||
                            activeSection.name_he;

                      if (
                        !secondaryName ||
                        secondaryName === primaryName
                      ) {
                        return null;
                      }

                      return (
                        <p dir={isHebrew ? "ltr" : "rtl"}>
                          {secondaryName}
                        </p>
                      );
                    })()
                  ) : null}
                </div>

                <button
                  className="bm-owner-add"
                  disabled={!activeSectionId}
                  onClick={openAddItem}
                >
                  + ADD ITEM
                </button>
              </div>

              {showAddItem ? (
                <form
                  className="bm-owner-item-form bm-v10-item-form"
                  onSubmit={addItem}
                >

                  {renderItemFields(
                    newItem,
                    setNewItem
                  )}

                  <div className="bm-owner-form-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setShowAddItem(false)
                      }
                    >
                      CANCEL
                    </button>

                    <button>
                      ADD ITEM
                    </button>
                  </div>

                </form>
              ) : null}

              {!activeSection ? (
                <div className="bm-owner-empty-items">
                  <h3>No category selected</h3>
                  <p>
                    Add a category to start
                    building your menu.
                  </p>
                </div>
              ) : activeItems.length === 0 ? (
                <div className="bm-owner-empty-items">
                  <h3>No items yet</h3>
                  <p>
                    Add the first item to{" "}
                    {isHebrew
                      ? activeSection.name_he ||
                        activeSection.name_en
                      : activeSection.name_en ||
                        activeSection.name_he}.
                  </p>

                  <button onClick={openAddItem}>
                    + ADD ITEM
                  </button>
                </div>
              ) : (
                <div className="bm-owner-item-list">

                  {activeItems.map(menuItem => {

                    if (
                      editingItemId ===
                      menuItem.id
                    ) {
                      return (
                        <div
                          className="bm-owner-item-edit bm-v10-item-form"
                          key={menuItem.id}
                        
                          data-editor-title={
                            isHebrew
                              ? "עריכת פריט"
                              : "Edit menu item"
                          }
                        >

                          {renderItemFields(
                            itemDraft,
                            setItemDraft
                          )}

                          <div className="bm-owner-form-actions">

                            <button
                              type="button"
                              onClick={() =>
                                setEditingItemId("")
                              }
                            >
                              CANCEL
                            </button>

                            <button
                              type="button"
                              onClick={saveItem}
                            >
                              SAVE CHANGES
                            </button>

                          </div>

                        </div>
                      );
                    }

                    const primaryDescription =
                      isHebrew
                        ? (
                            menuItem.description_he ||
                            menuItem.description ||
                            menuItem.description_en ||
                            ""
                          )
                        : (
                            menuItem.description_en ||
                            menuItem.description ||
                            menuItem.description_he ||
                            ""
                          );

                    const secondaryItemName =
                      studioSecondaryName(menuItem);

                    const itemIndex =
                      activeItems.findIndex(
                        item =>
                          item.id === menuItem.id
                      );

                    const isFirstItem =
                      itemIndex === 0;

                    const isLastItem =
                      itemIndex ===
                      activeItems.length - 1;

                    const currentSubcategory =
                      subcategories.find(
                        subcategory =>
                          subcategory.id ===
                          menuItem.subcategory_id
                      ) || null;

                    const previousItem =
                      itemIndex > 0
                        ? activeItems[
                            itemIndex - 1
                          ]
                        : null;

                    const previousSubcategoryId =
                      previousItem
                        ?.subcategory_id ||
                      "";

                    const showSubcategoryHeading =
                      Boolean(
                        currentSubcategory &&
                        currentSubcategory.id !==
                          previousSubcategoryId
                      );

                    const subcategoryPrimaryName =
                      studioSubcategoryPrimaryName(
                        currentSubcategory
                      );

                    const subcategorySecondaryName =
                      studioSubcategorySecondaryName(
                        currentSubcategory
                      );

                    const subcategoryItemCount =
                      currentSubcategory
                        ? activeItems.filter(
                            item =>
                              item.subcategory_id ===
                              currentSubcategory.id
                          ).length
                        : 0;


                    return (
                      <>

                        {showSubcategoryHeading
                          ? renderStudioSubcategoryHeading(
                              currentSubcategory,
                              subcategoryItemCount
                            )
                          : null}

                        <article
                        className={`bm-owner-item ${
                          menuItem.visible === false
                            ? "hidden"
                            : ""
                        }`}
                        key={menuItem.id}
                      >

                        <button
                          className="bm-owner-item-main"
                          onClick={() =>
                            startItemEdit(menuItem)
                          }
                        >

                          <div className="bm-owner-item-copy">

                            <div className="bm-owner-item-title-row">

                              <strong>
                                {studioPrimaryName(
                                  menuItem
                                )}
                              </strong>

                              {menuItem.visible === false ? (
                                <em className="bm-owner-item-hidden-pill">
                                  {isHebrew
                                    ? "מוסתר"
                                    : "Hidden"}
                                </em>
                              ) : null}

                            </div>

                            {secondaryItemName ? (
                              <span
                                className="bm-owner-item-secondary-name"
                                dir={
                                  isHebrew
                                    ? "ltr"
                                    : "rtl"
                                }
                              >
                                {secondaryItemName}
                              </span>
                            ) : null}

                            {primaryDescription ? (
                              <p>
                                {primaryDescription}
                              </p>
                            ) : null}

                          </div>

                          <b className="bm-owner-item-price">
                            {studioPrice(menuItem)}
                          </b>

                        </button>


                        {/* Mobile premium action menu */}
                        <button
                          type="button"
                          className="bm-owner-item-more"
                          aria-label={
                            isHebrew
                              ? "אפשרויות פריט"
                              : "Item options"
                          }
                          aria-expanded={
                            openItemMenuId ===
                            menuItem.id
                          }
                          onClick={() =>
                            setOpenItemMenuId(
                              current =>
                                current ===
                                menuItem.id
                                  ? ""
                                  : menuItem.id
                            )
                          }
                        >
                          •••
                        </button>


                        {openItemMenuId ===
                        menuItem.id &&
                        studioPortalTarget ? (
                          createPortal(
                            <>

                            <button
                              type="button"
                              className="bm-owner-item-sheet-backdrop"
                              aria-label={
                                isHebrew
                                  ? "סגור"
                                  : "Close"
                              }
                              onClick={() =>
                                setOpenItemMenuId("")
                              }
                            />

                            <div
                              className="bm-owner-item-sheet"
                              role="dialog"
                              aria-modal="true"
                            >

                              <div className="bm-owner-item-sheet-handle" />

                              <div className="bm-owner-item-sheet-head">

                                <div>
                                  <strong>
                                    {studioPrimaryName(
                                      menuItem
                                    )}
                                  </strong>

                                  {secondaryItemName ? (
                                    <span>
                                      {secondaryItemName}
                                    </span>
                                  ) : null}
                                </div>

                                <b>
                                  {studioPrice(
                                    menuItem
                                  )}
                                </b>

                              </div>


                              <div className="bm-owner-item-sheet-actions">

                                <button
                                  type="button"
                                  className="primary"
                                  onClick={() => {
                                    setOpenItemMenuId("");
                                    startItemEdit(
                                      menuItem
                                    );
                                  }}
                                >
                                  <span>
                                    ✎
                                  </span>

                                  {isHebrew
                                    ? "עריכת הפריט"
                                    : "Edit item"}
                                </button>


                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenItemMenuId("");
                                    toggleItem(
                                      menuItem
                                    );
                                  }}
                                >
                                  <span>
                                    {menuItem.visible === false
                                      ? "◉"
                                      : "○"}
                                  </span>

                                  {menuItem.visible === false
                                    ? (
                                        isHebrew
                                          ? "הצג בתפריט"
                                          : "Show in menu"
                                      )
                                    : (
                                        isHebrew
                                          ? "הסתר מהתפריט"
                                          : "Hide from menu"
                                      )}
                                </button>


                                <div className="bm-owner-item-sheet-move">

                                  <button
                                    type="button"
                                    disabled={
                                      isFirstItem
                                    }
                                    onClick={() => {
                                      setOpenItemMenuId("");
                                      moveItem(
                                        menuItem.id,
                                        -1
                                      );
                                    }}
                                  >
                                    ↑
                                    <span>
                                      {isHebrew
                                        ? "הזז למעלה"
                                        : "Move up"}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      isLastItem
                                    }
                                    onClick={() => {
                                      setOpenItemMenuId("");
                                      moveItem(
                                        menuItem.id,
                                        1
                                      );
                                    }}
                                  >
                                    ↓
                                    <span>
                                      {isHebrew
                                        ? "הזז למטה"
                                        : "Move down"}
                                    </span>
                                  </button>

                                </div>


                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() => {
                                    setOpenItemMenuId("");
                                    deleteItem(
                                      menuItem
                                    );
                                  }}
                                >
                                  <span>
                                    ⌫
                                  </span>

                                  {isHebrew
                                    ? "מחיקת הפריט"
                                    : "Delete item"}
                                </button>

                              </div>

                            </div>

                            </>,
                            studioPortalTarget
                          )
                        ) : null}


                        {/* Existing desktop controls */}
                        <div className="bm-owner-item-actions">

                          <button
                            className="bm-move-button"
                            disabled={isFirstItem}
                            onClick={() =>
                              moveItem(
                                menuItem.id,
                                -1
                              )
                            }
                            title="Move item up"
                          >
                            ↑
                          </button>

                          <button
                            className="bm-move-button"
                            disabled={isLastItem}
                            onClick={() =>
                              moveItem(
                                menuItem.id,
                                1
                              )
                            }
                            title="Move item down"
                          >
                            ↓
                          </button>

                          <button
                            onClick={() =>
                              startItemEdit(
                                menuItem
                              )
                            }
                          >
                            EDIT
                          </button>

                          <button
                            onClick={() =>
                              toggleItem(menuItem)
                            }
                          >
                            {menuItem.visible === false
                              ? "SHOW"
                              : "HIDE"}
                          </button>

                          <button
                            className="danger"
                            onClick={() =>
                              deleteItem(menuItem)
                            }
                          >
                            DELETE
                          </button>

                        </div>

                      </article>

                      </>
                    );
                  })}

                </div>
              )}



              {/* BEYOND_SUBCATEGORY_MANAGER_START */}

              {activeSection ? (
                <div className="bm-owner-subcategory-manager">


                  {/* Empty subcategories still need to be manageable */}

                  {activeSubcategories
                    .filter(
                      subcategory =>
                        !activeItems.some(
                          item =>
                            item.subcategory_id ===
                            subcategory.id
                        )
                    )
                    .map(
                      subcategory =>
                        (
                          <div key={subcategory.id}>
                            {renderStudioSubcategoryHeading(
                              subcategory,
                              0
                            )}
                          </div>
                        )
                    )}


                  {editingSubcategoryId ? (
                    <form
                      className="bm-owner-item-edit bm-v10-item-form"
                      onSubmit={saveSubcategory}
                    
          data-editor-title={
            isHebrew
              ? "עריכת תת־קטגוריה"
              : "Edit subcategory"
          }
        >

                      <div className="bm-owner-subcategory-editor-head">

                        <strong>
                          {isHebrew
                            ? "עריכת תת־קטגוריה"
                            : "Edit subcategory"}
                        </strong>

                        <span>
                          {isHebrew
                            ? "שינוי השם יעדכן גם את הפריטים שבתוכה."
                            : "Renaming it will update the items inside."}
                        </span>

                      </div>


                      <label>
                        {isHebrew
                          ? "שם בעברית"
                          : "Hebrew name"}

                        <input
                          dir="rtl"
                          value={
                            subcategoryDraft.name_he
                          }
                          onChange={e =>
                            setSubcategoryDraft(
                              current => ({
                                ...current,
                                name_he:
                                  e.target.value
                              })
                            )
                          }
                        />
                      </label>


                      <label>
                        {isHebrew
                          ? "שם באנגלית"
                          : "English name"}

                        <input
                          dir="ltr"
                          value={
                            subcategoryDraft.name_en
                          }
                          onChange={e =>
                            setSubcategoryDraft(
                              current => ({
                                ...current,
                                name_en:
                                  e.target.value
                              })
                            )
                          }
                        />
                      </label>


                      <div className="bm-owner-subcategory-editor-actions">

                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubcategoryId("");
                            setSubcategoryDraft({
                              name_en: "",
                              name_he: ""
                            });
                          }}
                        >
                          {isHebrew
                            ? "ביטול"
                            : "Cancel"}
                        </button>

                        <button
                          type="submit"
                          className="primary"
                        >
                          {isHebrew
                            ? "שמור שינויים"
                            : "Save changes"}
                        </button>

                      </div>

                    </form>
                  ) : null}


                  {showAddSubcategory ? (
                    <form
                      className="bm-owner-subcategory-editor"
                      onSubmit={addSubcategory}
                    >

                      <div className="bm-owner-subcategory-editor-head">

                        <strong>
                          {isHebrew
                            ? "תת־קטגוריה חדשה"
                            : "New subcategory"}
                        </strong>

                        <span>
                          {isHebrew
                            ? "צור קבוצה חדשה בתוך הקטגוריה."
                            : "Create a new group inside this category."}
                        </span>

                      </div>


                      <label>
                        {isHebrew
                          ? "שם בעברית"
                          : "Hebrew name"}

                        <input
                          dir="rtl"
                          value={subcatHe}
                          onChange={e =>
                            setSubcatHe(
                              e.target.value
                            )
                          }
                          placeholder="לחלוקה"
                        />
                      </label>


                      <label>
                        {isHebrew
                          ? "שם באנגלית"
                          : "English name"}

                        <input
                          dir="ltr"
                          value={subcatEn}
                          onChange={e =>
                            setSubcatEn(
                              e.target.value
                            )
                          }
                          placeholder="To Share"
                        />
                      </label>


                      <div className="bm-owner-subcategory-editor-actions">

                        <button
                          type="button"
                          onClick={() => {
                            setShowAddSubcategory(false);
                            setSubcatEn("");
                            setSubcatHe("");
                          }}
                        >
                          {isHebrew
                            ? "ביטול"
                            : "Cancel"}
                        </button>

                        <button
                          type="submit"
                          className="primary"
                        >
                          {isHebrew
                            ? "הוסף תת־קטגוריה"
                            : "Add subcategory"}
                        </button>

                      </div>

                    </form>
                  ) : (
                    <button
                      type="button"
                      className="bm-owner-add"
                      onClick={() => {
                        setEditingSubcategoryId("");
                        setSubcatEn("");
                        setSubcatHe("");
                        setShowAddSubcategory(true);
                      }}
                    >
                      {isHebrew
                        ? "+ הוסף תת־קטגוריה"
                        : "+ ADD SUBCATEGORY"}
                    </button>
                  )}

                </div>
              ) : null}

              {/* BEYOND_SUBCATEGORY_MANAGER_END */}

            </main>

          </div>

        </>
      )}

    </div>
  );
}

export function BeyondMenuAdmin() {
  const session = useSession();
  const user = session?.user;

  const [admin, setAdmin] = useState(null);
  const [sites, setSites] = useState([]);
  const [directory, setDirectory] = useState([]);

  // BEYOND_RESTAURANT_REQUESTS_ADMIN_V1
  const [restaurantRequests, setRestaurantRequests] = useState([]);
  const [restaurantSubscriptions, setRestaurantSubscriptions] = useState([]);
  const [businessAccounts, setBusinessAccounts] = useState([]);

  const [assignments, setAssignments] = useState({});
  const [busySite, setBusySite] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    if (!user) return;

    const { data: membership, error: membershipError } =
      await supabase
        .from("menu_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError) {
      setAdmin(false);
      setSites([]);
      setDirectory([]);
      setMsg(membershipError.message);
      return;
    }

    const allowed = Boolean(membership);

    setAdmin(allowed);

    if (!allowed) {
      setSites([]);
      setDirectory([]);
      return;
    }

    const [
      siteResult,
      directoryResult,
      requestResult,
      subscriptionResult,
      businessResult
    ] = await Promise.all([
      supabase
        .from("menu_sites")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("menu_user_directory")
        .select("user_id,email")
        .order("email"),

      supabase
        .from("website_requests")
        .select(
          "id,user_id,subscription_id,restaurant_name,plan_id,status,site_id,created_at,updated_at"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("website_subscriptions")
        .select(
          "id,user_id,plan_id,status,current_period_start,current_period_end,created_at,updated_at"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("business_accounts")
        .select(
          "user_id,restaurant_name,contact_name,phone,requested_plan"
        )
    ]);

    if (
      siteResult.error ||
      directoryResult.error ||
      requestResult.error ||
      subscriptionResult.error ||
      businessResult.error
    ) {
      setMsg(
        siteResult.error?.message ||
        directoryResult.error?.message ||
        requestResult.error?.message ||
        subscriptionResult.error?.message ||
        businessResult.error?.message
      );
      return;
    }

    setSites(siteResult.data || []);
    setDirectory(directoryResult.data || []);
    setRestaurantRequests(requestResult.data || []);
    setRestaurantSubscriptions(subscriptionResult.data || []);
    setBusinessAccounts(businessResult.data || []);
  };

  useEffect(() => {
    if (user) load();
  }, [user?.id]);

  if (!supabase) return <Setup />;

  if (
    session === undefined ||
    (session && admin === null)
  ) {
    return (
      <div className="bm-shell">
        <div className="bm-card">
          Checking administrator access…
        </div>
      </div>
    );
  }

  if (!session) return <LoginRequired />;

  if (!admin) {
    return (
      <div className="bm-shell bm-admin-secure-shell">

        <header className="bm-head">
          <div>
            <span>BEYOND FOR BUSINESS</span>
            <h1>Access denied</h1>
            <p>
              This area is available only to Beyond administrators.
            </p>
          </div>

          <button
            onClick={() =>
              location.href = "/menu-studio"
            }
          >
            MY MENU
          </button>
        </header>

      </div>
    );
  }

  const ownerEmail = ownerId =>
    directory.find(
      entry => entry.user_id === ownerId
    )?.email || "";

  const subscriptionForRequest = request =>
    restaurantSubscriptions.find(
      subscription =>
        subscription.id === request.subscription_id
    ) || null;

  const businessForUser = userId =>
    businessAccounts.find(
      business =>
        business.user_id === userId
    ) || null;

  const requestStatusLabel = value =>
    String(value || "unknown")
      .split("_")
      .map(
        word =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ");

  const assignOwner = async site => {
    const email = String(
      assignments[site.id] || ""
    )
      .trim()
      .toLowerCase();

    if (!email) {
      setMsg("Enter the customer's Beyond account email.");
      return;
    }

    const account = directory.find(
      entry =>
        String(entry.email).toLowerCase() === email
    );

    if (!account) {
      setMsg(
        `No Beyond account exists for ${email}. Ask the customer to create/sign in to their Beyond account first.`
      );
      return;
    }

    setBusySite(site.id);
    setMsg("");

    const { error } = await supabase
      .from("menu_sites")
      .update({
        owner_id: account.user_id
      })
      .eq("id", site.id);

    if (error) {
      setBusySite("");
      setMsg(error.message);
      return;
    }

    setAssignments(current => ({
      ...current,
      [site.id]: ""
    }));

    await load();

    setBusySite("");

    setMsg(
      `${site.name} assigned to ${email}.`
    );
  };

  const toggle = async site => {
    const { error } = await supabase
      .from("menu_sites")
      .update({
        published: !site.published
      })
      .eq("id", site.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await load();
  };

  return (
    <div className="bm-shell bm-secure-admin">

      <header className="bm-head bm-secure-admin-head">
        <div>
          <span>BEYOND ADMIN</span>
          <h1>Restaurant Access</h1>
          <p>
            Create, assign and manage customer menu websites.
          </p>
        </div>

        <div>
          <button
            onClick={() =>
              location.href = "/menu-studio"
            }
          >
            MENU STUDIO
          </button>

          <button
            onClick={() =>
              location.href = "/"
            }
          >
            BEYOND
          </button>
        </div>
      </header>

      {msg ? (
        <button
          className="bm-msg"
          onClick={() => setMsg("")}
        >
          {msg}
        </button>
      ) : null}

      <section className="bm-admin-requests">

        <div className="bm-admin-request-heading">
          <div>
            <span className="bm-label">
              SUBSCRIPTIONS
            </span>

            <h2>Restaurant requests</h2>

            <p>
              New restaurant subscriptions and website
              setup requests will appear here.
            </p>
          </div>

          <strong>
            {restaurantRequests.length} REQUEST{
              restaurantRequests.length === 1 ? "" : "S"
            }
          </strong>
        </div>

        {!restaurantRequests.length ? (
          <div className="bm-admin-request-empty">
            No restaurant requests yet.
          </div>
        ) : (
          <div className="bm-admin-request-list">

            {restaurantRequests.map(request => {
              const subscription =
                subscriptionForRequest(request);

              const business =
                businessForUser(request.user_id);

              const email =
                ownerEmail(request.user_id);

              return (
                <article
                  className="bm-admin-request-card"
                  key={request.id}
                >

                  <div className="bm-admin-request-main">

                    <span
                      className={`bm-admin-request-status ${
                        request.status || ""
                      }`}
                    >
                      {requestStatusLabel(
                        request.status
                      )}
                    </span>

                    <h3>
                      {request.restaurant_name ||
                        business?.restaurant_name ||
                        "Restaurant"}
                    </h3>

                    <p>
                      {email || "Customer email unavailable"}
                    </p>

                  </div>

                  <div className="bm-admin-request-details">

                    <div>
                      <span>PLAN</span>

                      <strong>
                        {String(
                          request.plan_id || "basic"
                        )
                          .charAt(0)
                          .toUpperCase() +
                          String(
                            request.plan_id || "basic"
                          ).slice(1)}
                      </strong>
                    </div>

                    <div>
                      <span>PAYMENT</span>

                      <strong>
                        {requestStatusLabel(
                          subscription?.status ||
                            "pending_payment"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>WEBSITE</span>

                      <strong>
                        {request.site_id
                          ? "Assigned"
                          : "Not assigned"}
                      </strong>
                    </div>

                    <div>
                      <span>CONTACT</span>

                      <strong>
                        {business?.contact_name ||
                          "—"}
                      </strong>

                      {business?.phone ? (
                        <small>
                          {business.phone}
                        </small>
                      ) : null}
                    </div>

                  </div>

                </article>
              );
            })}

          </div>
        )}

      </section>

      <section className="bm-admin-owner-info">
        <div>
          <span className="bm-label">
            OWNER ACCESS
          </span>

          <h2>Assign restaurants</h2>

          <p>
            The customer must first have a Beyond account.
            Enter the email used for that account and assign
            the restaurant.
          </p>
        </div>

        <strong>
          {sites.length} RESTAURANT{sites.length === 1 ? "" : "S"}
        </strong>
      </section>

      <datalist id="bm-menu-owner-emails">
        {directory.map(person => (
          <option
            value={person.email}
            key={person.user_id}
          />
        ))}
      </datalist>

      <section className="bm-admin-owner-list">

        {sites.map(site => {

          const currentOwner =
            ownerEmail(site.owner_id);

          return (
            <article
              className="bm-admin-owner-card"
              key={site.id}
            >

              <div className="bm-admin-owner-main">

                <div className="bm-admin-owner-name">
                  <span
                    className={
                      site.published
                        ? "live"
                        : "draft"
                    }
                  >
                    {site.published
                      ? "● LIVE"
                      : "● DRAFT"}
                  </span>

                  <h2>
                    {site.name}
                  </h2>
                </div>

                <a
                  href={liveUrl(site.slug)}
                  target="_blank"
                  rel="noreferrer"
                >
                  /menu/{site.slug}
                </a>

              </div>

              <div className="bm-admin-current-owner">
                <span>CURRENT OWNER</span>

                <strong>
                  {currentOwner || "Not identified"}
                </strong>

                <small>
                  {site.owner_id}
                </small>
              </div>

              <div className="bm-admin-assign">

                <label>
                  Assign customer email

                  <input
                    type="email"
                    list="bm-menu-owner-emails"
                    value={
                      assignments[site.id] || ""
                    }
                    onChange={e =>
                      setAssignments(current => ({
                        ...current,
                        [site.id]:
                          e.target.value
                      }))
                    }
                    placeholder="customer@example.com"
                  />
                </label>

                <button
                  disabled={
                    busySite === site.id
                  }
                  onClick={() =>
                    assignOwner(site)
                  }
                >
                  {busySite === site.id
                    ? "ASSIGNING…"
                    : "ASSIGN OWNER"}
                </button>

              </div>

              <div className="bm-admin-owner-actions">

                <button
                  onClick={() =>
                    window.open(
                      liveUrl(site.slug),
                      "_blank"
                    )
                  }
                >
                  VIEW
                </button>

                <button
                  onClick={() =>
                    location.href =
                      `/menu-studio?site=${site.id}`
                  }
                >
                  EDIT
                </button>

                <button
                  onClick={() =>
                    toggle(site)
                  }
                >
                  {site.published
                    ? "UNPUBLISH"
                    : "PUBLISH"}
                </button>

              </div>

            </article>
          );
        })}

      </section>

    </div>
  );
}

export function BeyondMenuRoute({ fallback }) {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/menu-studio") return <BeyondMenuStudio />;
  if (path === "/admin/menus") return <BeyondMenuAdmin />;
  if (path.startsWith("/menu/")) {
    const slug = decodeURIComponent(path.slice(6));
    if (slug) return <BeyondPublicMenu slug={slug} />;
  }
  return fallback;
}
