import BeyondLanguageToggle from "../i18n/BeyondLanguageToggle";
import React, { useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import RestaurantAccessibility from "./RestaurantAccessibility";
import "./BeyondMenuStudioTheme.css";
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

export function BeyondPublicMenu({ slug }) {
  const [site, setSite] = useState(null);
  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState("");
  const [lang, setLang] = useState("he");
  const [status, setStatus] = useState("Loading menu…");

  useEffect(() => {
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
        setStatus("This menu is not available.");
        return;
      }

      const [sectionResult, itemResult] =
        await Promise.all([
          supabase
            .from("menu_sections")
            .select("*")
            .eq("site_id", siteRow.id)
            .eq("visible", true)
            .order("sort_order")
            .order("created_at"),

          supabase
            .from("menu_items")
            .select("*")
            .eq("site_id", siteRow.id)
            .eq("visible", true)
            .order("sort_order")
            .order("created_at")
        ]);

      if (!alive) return;

      if (sectionResult.error || itemResult.error) {
        setStatus("Could not load this menu.");
        return;
      }

      const loadedSections =
        sectionResult.data || [];

      setSite(siteRow);
      setSections(loadedSections);
      setItems(itemResult.data || []);

      setLang(
        siteRow.default_language === "en"
          ? "en"
          : "he"
      );

      setActive(
        loadedSections[0]?.id || ""
      );
    })();

    return () => {
      alive = false;
    };
  }, [slug]);

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
      className="ep-page"
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
        className="ep-app"
        tabIndex={-1}
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
  const session = useSession();
  const user = session?.user;

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

  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([]);
  const [activeSectionId, setActiveSectionId] = useState("");

  const [msg, setMsg] = useState("");

  const [showCreateSite, setShowCreateSite] = useState(false);
  const [isMenuAdmin, setIsMenuAdmin] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  const [editingSectionId, setEditingSectionId] = useState("");
  const [sectionDraft, setSectionDraft] = useState({
    name_en: "",
    name_he: ""
  });

  const [editingItemId, setEditingItemId] = useState("");
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

  const loadData = async (id) => {
    if (!id) {
      setSections([]);
      setItems([]);
      setActiveSectionId("");
      return;
    }

    const [sectionResult, itemResult] = await Promise.all([
      supabase
        .from("menu_sections")
        .select("*")
        .eq("site_id", id)
        .order("sort_order")
        .order("created_at"),

      supabase
        .from("menu_items")
        .select("*")
        .eq("site_id", id)
        .order("sort_order")
        .order("created_at")
    ]);

    if (sectionResult.error || itemResult.error) {
      setMsg(
        sectionResult.error?.message ||
        itemResult.error?.message
      );
      return;
    }

    const nextSections = sectionResult.data || [];
    const nextItems = itemResult.data || [];

    setSections(nextSections);
    setItems(nextItems);

    setActiveSectionId(current =>
      nextSections.some(s => s.id === current)
        ? current
        : nextSections[0]?.id || ""
    );

    setNewItem(v => ({
      ...v,
      section_id:
        nextSections.some(s => s.id === v.section_id)
          ? v.section_id
          : nextSections[0]?.id || ""
    }));
  };

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

  const addCategory = async e => {
    e.preventDefault();

    if (!selected || !secEn.trim()) return;

    const { data, error } = await supabase
      .from("menu_sections")
      .insert({
        site_id: selected.id,
        name_en: secEn.trim(),
        name_he: secHe.trim() || secEn.trim(),
        visible: true,
        sort_order: sections.length
      })
      .select()
      .single();

    if (error) {
      setMsg(error.message);
      return;
    }

    setSecEn("");
    setSecHe("");
    setShowAddCategory(false);

    await loadData(selected.id);
    setActiveSectionId(data.id);
    setMsg("Category added.");
  };

  const startCategoryEdit = section => {
    setEditingSectionId(section.id);

    setSectionDraft({
      name_en: section.name_en || "",
      name_he: section.name_he || ""
    });
  };

  const saveCategory = async () => {
    if (!editingSectionId || !sectionDraft.name_en.trim()) return;

    const { error } = await supabase
      .from("menu_sections")
      .update({
        name_en: sectionDraft.name_en.trim(),
        name_he:
          sectionDraft.name_he.trim() ||
          sectionDraft.name_en.trim()
      })
      .eq("id", editingSectionId);

    if (error) {
      setMsg(error.message);
      return;
    }

    setEditingSectionId("");
    await loadData(selected.id);
    setMsg("Category updated.");
  };

  const toggleCategory = async section => {
    const { error } = await supabase
      .from("menu_sections")
      .update({
        visible: section.visible === false
      })
      .eq("id", section.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await loadData(selected.id);
  };

  const deleteCategory = async section => {
    const categoryItems = items.filter(
      item => item.section_id === section.id
    );

    const message = categoryItems.length
      ? `Delete "${section.name_en}" and its ${categoryItems.length} item(s)?`
      : `Delete "${section.name_en}"?`;

    if (!window.confirm(message)) return;

    const { error } = await supabase
      .from("menu_sections")
      .delete()
      .eq("id", section.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await loadData(selected.id);
    setMsg("Category deleted.");
  };

  const openAddItem = () => {
    const sectionId =
      activeSectionId ||
      sections[0]?.id ||
      "";

    const sectionKey = String(
      sections.find(section => section.id === sectionId)?.section_key || ""
    ).toLowerCase();

    setNewItem({
      section_id: sectionId,
      type: sectionKey === "wine" ? "wine" : "item",
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
      !newItem.name_en.trim()
    ) return;

    const sectionItems = items.filter(
      i => i.section_id === newItem.section_id
    );

    const { error } = await supabase
      .from("menu_items")
      .insert({
        site_id: selected.id,
        section_id: newItem.section_id,

        type: newItem.type === "wine"
          ? "wine"
          : "item",

        name_en: newItem.name_en.trim(),

        name_he:
          newItem.name_he.trim() ||
          newItem.name_en.trim(),

        category_en:
          newItem.category_en.trim() || null,

        category_he:
          newItem.category_he.trim() || null,

        category:
          (
            newItem.category_en.trim() &&
            newItem.category_he.trim()
          )
            ? `${newItem.category_en.trim()} · ${newItem.category_he.trim()}`
            : newItem.category_en.trim() ||
              newItem.category_he.trim() ||
              null,

        description_en:
          newItem.description_en.trim() || null,

        description_he:
          newItem.description_he.trim() || null,

        description:
          newItem.description_en.trim() ||
          newItem.description_he.trim() ||
          newItem.description.trim() ||
          null,

        price:
          newItem.type === "wine"
            ? null
            : newItem.price.trim() || null,

        origin_en:
          newItem.type === "wine"
            ? newItem.origin_en.trim() || null
            : null,

        origin_he:
          newItem.type === "wine"
            ? newItem.origin_he.trim() || null
            : null,

        origin:
          newItem.type === "wine"
            ? (
                newItem.origin_en.trim() &&
                newItem.origin_he.trim()
              )
                ? `${newItem.origin_en.trim()} · ${newItem.origin_he.trim()}`
                : newItem.origin_en.trim() ||
                  newItem.origin_he.trim() ||
                  null
            : null,

        wine_glass:
          newItem.type === "wine"
            ? newItem.wine_glass.trim() || null
            : null,

        wine_bottle:
          newItem.type === "wine"
            ? newItem.wine_bottle.trim() || null
            : null,

        visible: true,
        sort_order: sectionItems.length
      });

    if (error) {
      setMsg(error.message);
      return;
    }

    setActiveSectionId(newItem.section_id);
    setShowAddItem(false);

    await loadData(selected.id);
    setMsg("Item added.");
  };

  const startItemEdit = menuItem => {
    setEditingItemId(menuItem.id);

    setItemDraft({
      section_id: menuItem.section_id || "",

      type:
        menuItem.type === "wine"
          ? "wine"
          : "item",

      name_en: menuItem.name_en || "",
      name_he: menuItem.name_he || "",

      category_en:
        menuItem.category_en || "",

      category_he:
        menuItem.category_he || "",

      description:
        menuItem.description || "",

      description_en:
        menuItem.description_en ||
        menuItem.description ||
        "",

      description_he:
        menuItem.description_he || "",

      price:
        menuItem.price || "",

      origin_en:
        menuItem.origin_en || "",

      origin_he:
        menuItem.origin_he || "",

      wine_glass:
        menuItem.wine_glass || "",

      wine_bottle:
        menuItem.wine_bottle || ""
    });
  };

  const saveItem = async () => {
    if (
      !editingItemId ||
      !itemDraft.section_id ||
      !itemDraft.name_en.trim()
    ) return;

    const { error } = await supabase
      .from("menu_items")
      .update({
        section_id: itemDraft.section_id,

        type:
          itemDraft.type === "wine"
            ? "wine"
            : "item",

        name_en:
          itemDraft.name_en.trim(),

        name_he:
          itemDraft.name_he.trim() ||
          itemDraft.name_en.trim(),

        category_en:
          itemDraft.category_en.trim() || null,

        category_he:
          itemDraft.category_he.trim() || null,

        category:
          (
            itemDraft.category_en.trim() &&
            itemDraft.category_he.trim()
          )
            ? `${itemDraft.category_en.trim()} · ${itemDraft.category_he.trim()}`
            : itemDraft.category_en.trim() ||
              itemDraft.category_he.trim() ||
              null,

        description_en:
          itemDraft.description_en.trim() || null,

        description_he:
          itemDraft.description_he.trim() || null,

        description:
          itemDraft.description_en.trim() ||
          itemDraft.description_he.trim() ||
          itemDraft.description.trim() ||
          null,

        price:
          itemDraft.type === "wine"
            ? null
            : itemDraft.price.trim() || null,

        origin_en:
          itemDraft.type === "wine"
            ? itemDraft.origin_en.trim() || null
            : null,

        origin_he:
          itemDraft.type === "wine"
            ? itemDraft.origin_he.trim() || null
            : null,

        origin:
          itemDraft.type === "wine"
            ? (
                itemDraft.origin_en.trim() &&
                itemDraft.origin_he.trim()
              )
                ? `${itemDraft.origin_en.trim()} · ${itemDraft.origin_he.trim()}`
                : itemDraft.origin_en.trim() ||
                  itemDraft.origin_he.trim() ||
                  null
            : null,

        wine_glass:
          itemDraft.type === "wine"
            ? itemDraft.wine_glass.trim() || null
            : null,

        wine_bottle:
          itemDraft.type === "wine"
            ? itemDraft.wine_bottle.trim() || null
            : null
      })
      .eq("id", editingItemId);

    if (error) {
      setMsg(error.message);
      return;
    }

    setEditingItemId("");
    setActiveSectionId(itemDraft.section_id);

    await loadData(selected.id);
    setMsg("Item updated.");
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
    if (!window.confirm(`Delete "${menuItem.name_en}"?`)) return;

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

  const moveCategory = async (sectionId, direction) => {
    const index = sections.findIndex(section => section.id === sectionId);
    const targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || targetIndex >= sections.length) return;

    const reordered = [...sections];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index]
    ];

    const normalized = reordered.map((section, sort_order) => ({
      ...section,
      sort_order
    }));

    setSections(normalized);

    const results = await Promise.all(
      normalized.map(section =>
        supabase
          .from("menu_sections")
          .update({ sort_order: section.sort_order })
          .eq("id", section.id)
      )
    );

    const failed = results.find(result => result.error);

    if (failed?.error) {
      setMsg(failed.error.message);
      await loadData(selected.id);
      return;
    }

    setMsg("Category order updated.");
  };

  const moveItem = async (itemId, direction) => {
    const categoryItems = items
      .filter(item => item.section_id === activeSectionId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const index = categoryItems.findIndex(item => item.id === itemId);
    const targetIndex = index + direction;

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >= categoryItems.length
    ) return;

    const reordered = [...categoryItems];

    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index]
    ];

    const normalized = reordered.map((item, sort_order) => ({
      ...item,
      sort_order
    }));

    setItems(current => {
      const replacements = new Map(
        normalized.map(item => [item.id, item])
      );

      return current.map(item =>
        replacements.get(item.id) || item
      );
    });

    const results = await Promise.all(
      normalized.map(item =>
        supabase
          .from("menu_items")
          .update({ sort_order: item.sort_order })
          .eq("id", item.id)
      )
    );

    const failed = results.find(result => result.error);

    if (failed?.error) {
      setMsg(failed.error.message);
      await loadData(selected.id);
      return;
    }

    setMsg("Item order updated.");
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

  const activeItems = items.filter(
    item => item.section_id === activeSectionId
  );

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
        <label>
          Menu category

          <select
            value={draft.section_id}
            onChange={e => {
              const sectionId = e.target.value;

              setDraft(current => ({
                ...current,
                section_id: sectionId,
                type:
                  itemSectionKey(sectionId) === "wine"
                    ? "wine"
                    : current.type
              }));
            }}
          >
            {sections.map(section => (
              <option
                key={section.id}
                value={section.id}
              >
                {section.name_en}
              </option>
            ))}
          </select>
        </label>

        <label>
          Item type

          <select
            value={draft.type}
            onChange={e =>
              setDraft(current => ({
                ...current,
                type: e.target.value
              }))
            }
          >
            <option value="item">
              Regular item
            </option>

            <option value="wine">
              Wine
            </option>
          </select>
        </label>

        <label>
          English name

          <input
            value={draft.name_en}
            onChange={e =>
              setDraft(current => ({
                ...current,
                name_en: e.target.value
              }))
            }
            placeholder="Margherita Pizza"
          />
        </label>

        <label>
          Hebrew name

          <input
            dir="rtl"
            value={draft.name_he}
            onChange={e =>
              setDraft(current => ({
                ...current,
                name_he: e.target.value
              }))
            }
            placeholder="פיצה מרגריטה"
          />
        </label>

        <label>
          Subcategory EN

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

        <label>
          Subcategory HE

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
            <label>
              Origin EN

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

            <label>
              Origin HE

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

            <label>
              Glass price

              <div className="bm-price-field">

                <select
                  className="bm-price-currency"
                  aria-label="Glass price currency"
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

            <label>
              Bottle price

              <div className="bm-price-field">

                <select
                  className="bm-price-currency"
                  aria-label="Bottle price currency"
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
          <label>
            Price

            <div className="bm-price-field">

              <select
                className="bm-price-currency"
                aria-label="Price currency"
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

        <label className="bm-v10-wide">
          Description EN

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

        <label className="bm-v10-wide">
          Description HE

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
            Enter both prices separated by /
            — for example ₪18 / ₪35.
            The public menu will display
            shot and glass pricing.
          </div>
        ) : null}
      </>
    );
  };

  return (
    <div
      className={`bm-shell bm-owner-dashboard bm-theme-${studioTheme}`}
    >

      <header className="bm-head bm-owner-header">
        <div>
          <span>BEYOND FOR BUSINESS</span>
          <h1>Menu Studio</h1>
          <p>Manage your digital menu.</p>
        </div>

        <div className="bm-owner-header-actions">

          {/* BEYOND_MENU_LANGUAGE_TOGGLE_V2 */}
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
              <Sun size={17} strokeWidth={1.8} />
            ) : (
              <Moon size={17} strokeWidth={1.8} />
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
                onClick={() =>
                  setShowCreateSite(v => !v)
                }
              >
                + NEW MENU
              </button>

              <button
                onClick={() =>
                  location.href = "/admin/menus"
                }
              >
                ADMIN
              </button>
            </>
          ) : null}

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
                href={liveUrl(selected.slug)}
                target="_blank"
                rel="noreferrer"
              >
                /menu/{selected.slug}
              </a>
            </div>

            <div className="bm-owner-site-actions">
              <button
                onClick={() =>
                  setShowSettings(v => !v)
                }
              >
                SETTINGS
              </button>

              <button
                onClick={() =>
                  window.open(
                    liveUrl(selected.slug),
                    "_blank"
                  )
                }
              >
                VIEW MENU
              </button>

              <button
                className="primary"
                onClick={() =>
                  updateSite({
                    published:
                      !selected.published
                  })
                }
              >
                {selected.published
                  ? "UNPUBLISH"
                  : "PUBLISH"}
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

          {showSettings ? (
            <section className="bm-card bm-owner-settings">

              <div className="bm-owner-section-title">
                <div>
                  <span className="bm-label">
                    RESTAURANT SETTINGS
                  </span>

                  <h2>Menu settings</h2>

                  <p className="bm-owner-settings-intro">
                    Change your restaurant name, public menu URL and branding.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowSettings(false)
                  }
                >
                  CLOSE
                </button>
              </div>

              <div className="bm-owner-settings-grid bm-owner-settings-grid-v5">

                <label>
                  Restaurant name

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
                  Menu URL

                  <div className="bm-owner-url-field">
                    <span>/menu/</span>

                    <input
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

                <div className="bm-owner-logo-setting bm-owner-logo-upload">
                  <span className="bm-owner-setting-label">
                    Restaurant logo
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
                          ? "UPLOADING…"
                          : selected.logo_url
                            ? "CHANGE LOGO"
                            : "UPLOAD LOGO"}
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
                          REMOVE
                        </button>
                      ) : null}

                      <small>
                        PNG, JPG, WEBP or SVG · max 5 MB
                      </small>

                    </div>

                  </div>
                </div>

                <label className="bm-owner-color-setting">
                  Brand color

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

                <label className="bm-owner-language-setting">
                  Default language

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
                      Hebrew — עברית
                    </option>

                    <option value="en">
                      English
                    </option>
                  </select>
                </label>

              </div>

              <div className="bm-owner-settings-footer">

                <div>
                  <span>PUBLIC MENU</span>

                  <strong>
                    /menu/{slugify(siteDraft.slug || siteDraft.name) || "your-menu"}
                  </strong>
                </div>

                <button
                  type="button"
                  className="bm-owner-save-settings"
                  onClick={saveRestaurantSettings}
                >
                  SAVE SETTINGS
                </button>

              </div>

            </section>
          ) : null}

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
                  + ADD
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
                      placeholder="Cocktails"
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
                      placeholder="קוקטיילים"
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

              <div className="bm-owner-category-list">

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
                            {section.name_en}
                          </strong>

                          <small>
                            {section.name_he}
                          </small>
                        </span>

                        <em>
                          {count}
                        </em>
                      </button>

                      <div className="bm-owner-category-actions">

                        <button
                          className="bm-move-button"
                          disabled={sections.findIndex(s => s.id === section.id) === 0}
                          onClick={() => moveCategory(section.id, -1)}
                          title="Move category up"
                        >
                          ↑
                        </button>

                        <button
                          className="bm-move-button"
                          disabled={
                            sections.findIndex(s => s.id === section.id) ===
                            sections.length - 1
                          }
                          onClick={() => moveCategory(section.id, 1)}
                          title="Move category down"
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
                            toggleCategory(section)
                          }
                        >
                          {section.visible === false
                            ? "SHOW"
                            : "HIDE"}
                        </button>

                        <button
                          className="danger"
                          onClick={() =>
                            deleteCategory(section)
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
                      ? activeSection.name_en
                      : "Select a category"}
                  </h2>

                  {activeSection?.name_he ? (
                    <p dir="rtl">
                      {activeSection.name_he}
                    </p>
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
                    {activeSection.name_en}.
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

                    return (
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
                            <strong>
                              {menuItem.name_en}
                            </strong>

                            {menuItem.name_he ? (
                              <span dir="rtl">
                                {menuItem.name_he}
                              </span>
                            ) : null}

                            {menuItem.description ? (
                              <p>
                                {menuItem.description}
                              </p>
                            ) : null}
                          </div>

                          <b className="bm-owner-item-price">
                            {studioPrice(menuItem)}
                          </b>

                        </button>

                        <div className="bm-owner-item-actions">

                          <button
                            className="bm-move-button"
                            disabled={
                              activeItems.findIndex(i => i.id === menuItem.id) === 0
                            }
                            onClick={() => moveItem(menuItem.id, -1)}
                            title="Move item up"
                          >
                            ↑
                          </button>

                          <button
                            className="bm-move-button"
                            disabled={
                              activeItems.findIndex(i => i.id === menuItem.id) ===
                              activeItems.length - 1
                            }
                            onClick={() => moveItem(menuItem.id, 1)}
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
                    );
                  })}

                </div>
              )}

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
