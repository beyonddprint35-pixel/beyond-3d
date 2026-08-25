import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Palette, X } from "lucide-react";

import { useBeyondLanguage } from "../i18n/BeyondLanguage";
import { supabase } from "../lib/supabaseClient";
import MenuBrandEditor from "./MenuBrandEditor";
import { DEFAULT_MENU_BRANDING } from "./DigitalMenuTemplate";
import { BeyondPublicMenu } from "./BeyondMenuPlatform";

const PUBLIC_PREFIX = "/menu/";

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}


const CUSTOMER_CONTENT_DESIGN_KEYS = new Set([
  "display_name",
  "subtitle",
  "hero_title_en",
  "hero_title_he",
  "hero_title_ar",
  "logo_url",
]);

function designSettingsOnly(value) {
  if (!isObject(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) =>
        !CUSTOMER_CONTENT_DESIGN_KEYS.has(key)
    )
  );
}


function hasSavedDesign(site) {
  return isObject(site?.design_settings) && Object.keys(site.design_settings).length > 0;
}

function layoutName(design) {
  return String(design?.layout_style || "classic").trim().split(/\s+/)[0] || "classic";
}

function designForSite(site) {
  const saved =
    designSettingsOnly(
      site?.design_settings
    );

  const defaults =
    designSettingsOnly(
      DEFAULT_MENU_BRANDING
    );

  const accent =
    saved.accent ||
    site?.primary_color ||
    defaults.accent;

  return {
    ...defaults,
    ...saved,

    number_font:
      saved.number_font ||
      saved.heading_font ||
      defaults.number_font ||
      defaults.heading_font ||
      "Playfair Display",

    accent,

    category_background:
      saved.category_background ||
      accent,
  };
}

function designStyle(design) {
  const menuFont =
    design.heading_font ||
    design.body_font ||
    DEFAULT_MENU_BRANDING.heading_font ||
    "Inter";

  const menuFontStack =
    `"${menuFont}", "Noto Sans Hebrew", "Noto Sans Arabic", Arial, sans-serif`;

  return {
    "--bld-bg": design.background,
    "--bld-header-bg": design.header_background,
    "--bld-hero-bg": design.hero_background,
    "--bld-paper": design.paper,
    "--bld-card": design.card,
    "--bld-text": design.text,
    "--bld-muted": design.muted,
    "--bld-accent": design.accent,
    "--bld-accent-secondary": design.accent_secondary,
    "--bld-line": design.line,
    "--bld-category-bg": design.category_background,
    "--bld-category-text": design.category_text,
    "--bld-heading-font": `"${design.heading_font}", "Noto Sans Hebrew", "Noto Sans Arabic", Georgia, serif`,
    "--bld-body-font": `"${design.body_font}", "Noto Sans Hebrew", "Noto Sans Arabic", Arial, sans-serif`,
    "--bld-number-font": `"${design.number_font || DEFAULT_MENU_BRANDING.number_font || "Playfair Display"}", "Noto Sans Hebrew", "Noto Sans Arabic", Georgia, serif`,
    "--bld-brand-size": `${design.brand_font_size}px`,
    "--bld-hero-size": `${design.hero_font_size}px`,
    "--bld-section-size": `${design.section_font_size}px`,
    "--bld-category-size": `${design.category_font_size}px`,
    "--bld-item-size": `${design.item_name_font_size}px`,
    "--bld-description-size": `${design.description_font_size}px`,
    "--bld-price-size": `${design.price_font_size}px`,
    "--bld-secondary-size": `${design.secondary_font_size}px`,
  };
}

function setTextIfChanged(node, value) {
  if (!node || !value) return;
  if (node.textContent !== value) node.textContent = value;
}

function applyFitState(root, design) {
  if (!root) return;

  root.classList.remove("ep-live-fit-active");
  root.style.removeProperty("--bld-fit-count");
  root.style.removeProperty("--bld-fit-rows");

  if (
    design.fit_to_view !== true ||
    typeof window === "undefined" ||
    !window.matchMedia("(max-width: 560px)").matches
  ) {
    return;
  }

  const list = root.querySelector(".ep-menu-list");
  if (!list) return;

  const items = Array.from(
    list.querySelectorAll(":scope > .ep-item-row, :scope > .ep-wine-row")
  ).filter(node => node.offsetParent !== null);

  /*
    Live Fit is intentionally conservative. The existing live-menu
    renderer has special subcategory / dual-price rows, so stretching
    is allowed only when the item area contains a simple, small set.
    This mirrors the smart-fit principle used by the new template.
  */
  const specialRows = list.querySelector(
    ":scope > .ep-item-category, :scope > .ep-dual-header, :scope > .ep-mixers-box"
  );

  if (!items.length || items.length > 3 || specialRows) return;

  const layout = layoutName(design);
  const columns = layout === "cards" ? 2 : 1;
  const rows = Math.ceil(items.length / columns);

  root.style.setProperty("--bld-fit-count", String(items.length));
  root.style.setProperty("--bld-fit-rows", String(rows));
  root.classList.add("ep-live-fit-active");
}

function applyDesignToPublicRoot(root, site, design) {
  if (!root || !site || !design) return;

  const layout = layoutName(design);

  root.classList.add("ep-live-designed");
  [
    "classic",
    "compact",
    "cards",
    "editorial",
    "minimal",
    "bold",
  ].forEach(name =>
    root.classList.toggle(`ep-live-layout-${name}`, name === layout)
  );

  root.dataset.liveLayout = layout;
  root.dataset.liveFitToView = design.fit_to_view === true ? "true" : "false";

  Object.entries(designStyle(design)).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      root.style.setProperty(key, String(value));
    }
  });

  applyFitState(root, design);
}


/* CUSTOMER_MENU_SITE_ISOLATION_GUARD */

function customerMenuRootForSite(
  siteId
) {
  if (!siteId) {
    return null;
  }

  return document.querySelector(
    `.ep-page.customers-template-menu[data-menu-site-id="${siteId}"]`
  );
}

function PublicLiveDesignApplicator({ slug }) {
  const [site, setSite] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("menu_sites")
        .select("id,name,slug,primary_color,design_settings,published")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (!alive || error) return;
      setSite(data || null);
    })();

    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!site || !hasSavedDesign(site)) return undefined;

    const design = designForSite(site);
    let frame = 0;

    const apply = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const root =
          customerMenuRootForSite(
            site.id
          );
        applyDesignToPublicRoot(root, site, design);
      });
    };

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["lang", "class"],
    });

    window.addEventListener("resize", apply, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [site]);

  return null;
}

function currentStudioSlug() {
  const link = document.querySelector(".bm-owner-menu-url-button");
  if (!link) return "";

  try {
    const href = link.getAttribute("href") || "";
    const parsed = new URL(href, window.location.origin);
    if (parsed.pathname.startsWith(PUBLIC_PREFIX)) {
      return decodeURIComponent(parsed.pathname.slice(PUBLIC_PREFIX.length));
    }
  } catch {
    // Fall through to visible text.
  }

  const text = link.textContent?.trim() || "";
  return text.startsWith(PUBLIC_PREFIX)
    ? text.slice(PUBLIC_PREFIX.length).trim()
    : "";
}

function LiveDesignPreview({ site, design, groups, items }) {
  const wrapperRef = useRef(null);
  const previewSite = useMemo(
    () => ({
      ...site,
      name: site?.name || "Restaurant",
      primary_color: design.accent || site?.primary_color,
      design_settings: designSettingsOnly(design),
    }),
    [site, design]
  );

  useEffect(() => {
    let frame = 0;

    const apply = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const root = wrapperRef.current?.querySelector(
          ".ep-page.customers-template-menu"
        );
        applyDesignToPublicRoot(root, previewSite, design);
      });
    };

    apply();

    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    const observer = new MutationObserver(apply);
    observer.observe(wrapper, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["lang", "class"],
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [previewSite, design, groups, items]);

  return (
    <div
      ref={wrapperRef}
      className={`beyond-live-design-preview ep-live-layout-${layoutName(design)}`}
      style={designStyle(design)}
    >
      <BeyondPublicMenu
        slug={previewSite.slug}
        previewSite={previewSite}
        previewGroups={groups}
        previewItems={items}
      />
    </div>
  );
}

function LiveMenuDesignStudio() {
  const { isHebrew } = useBeyondLanguage();
  const [actionsTarget, setActionsTarget] = useState(null);
  const [slug, setSlug] = useState("");
  const [site, setSite] = useState(null);
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [design, setDesign] = useState(() => ({
    ...designSettingsOnly(DEFAULT_MENU_BRANDING),
  }));

  const [
    contentSettings,
    setContentSettings,
  ] = useState({});

  const [
    siteName,
    setSiteName,
  ] = useState("");
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-beyond-theme") === "light"
      ? "light"
      : "dark"
  );
  const editVersionRef = useRef(0);

  useEffect(() => {
    let frame = 0;

    const scan = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const target = document.querySelector(".bm-owner-site-actions");
        setActionsTarget(current => (current === target ? current : target));

        const nextSlug = currentStudioSlug();
        setSlug(current => (current === nextSlug ? current : nextSlug));

        const nextTheme =
          document.documentElement.getAttribute("data-beyond-theme") === "light"
            ? "light"
            : "dark";
        setTheme(current => (current === nextTheme ? current : nextTheme));
      });
    };

    scan();

    const observer = new MutationObserver(scan);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["href", "class", "data-beyond-theme"],
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-beyond-theme"],
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!slug) {
      setSite(null);
      setGroups([]);
      setItems([]);
      setSiteName("");
      setContentSettings({});
      return undefined;
    }

    let alive = true;

    (async () => {
      setSaveStatus("");

      const siteResult = await supabase
        .from("menu_sites")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!alive || siteResult.error || !siteResult.data) return;

      const nextSite = siteResult.data;

      const [groupResult, itemResult] = await Promise.all([
        supabase
          .from("menu_groups")
          .select("*")
          .eq("site_id", nextSite.id)
          .order("sort_order")
          .order("created_at"),
        supabase
          .from("menu_items")
          .select("*")
          .eq("site_id", nextSite.id)
          .order("sort_order")
          .order("created_at"),
      ]);

      if (!alive) return;

      setSite(nextSite);
      setGroups(groupResult.data || []);
      setItems(itemResult.data || []);

      setSiteName(
        nextSite.name || ""
      );

      setContentSettings(
        nextSite.content_settings &&
        typeof nextSite.content_settings === "object"
          ? nextSite.content_settings
          : {}
      );

      setDesign(designForSite(nextSite));
      setDirty(false);
      editVersionRef.current = 0;
    })();

    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!dirty || !site) return undefined;

    const version = editVersionRef.current;
    const timer = window.setTimeout(async () => {
      setSaveStatus(isHebrew ? "שומר…" : "Saving…");

      const cleanSiteName =
        siteName.trim() ||
        site.name ||
        "Restaurant";

      const { error } = await supabase
        .from("menu_sites")
        .update({
          name: cleanSiteName,

          content_settings:
            contentSettings || {},

          design_settings:
            designSettingsOnly(design),

          primary_color:
            design.accent ||
            site.primary_color,
        })
        .eq("id", site.id);

      if (error) {
        setSaveStatus(
          isHebrew ? "לא ניתן לשמור את העיצוב" : "Could not save design"
        );
        return;
      }

      setSite(current =>
        current
          ? {
              ...current,

              name:
                siteName.trim() ||
                current.name,

              content_settings:
                contentSettings || {},

              design_settings:
                designSettingsOnly(design),

              primary_color:
                design.accent ||
                current.primary_color,
            }
          : current
      );

      if (version === editVersionRef.current) {
        setDirty(false);
        setSaveStatus(isHebrew ? "נשמר אוטומטית" : "Saved automatically");
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [
    dirty,
    design,
    contentSettings,
    siteName,
    site?.id,
    isHebrew,
  ]);


  function changeSiteName(
    nextName
  ) {
    setSiteName(nextName);

    setSite(current =>
      current
        ? {
            ...current,
            name: nextName,
          }
        : current
    );

    editVersionRef.current += 1;
    setDirty(true);

    setSaveStatus(
      isHebrew
        ? "שומר…"
        : "Saving…"
    );
  }


  function changeContentSettings(
    nextContent
  ) {
    const value =
      nextContent &&
      typeof nextContent === "object"
        ? nextContent
        : {};

    setContentSettings(value);

    setSite(current =>
      current
        ? {
            ...current,
            content_settings: value,
          }
        : current
    );

    editVersionRef.current += 1;
    setDirty(true);

    setSaveStatus(
      isHebrew
        ? "שומר…"
        : "Saving…"
    );
  }


  function changeDesign(nextDesign) {
    setDesign({
      ...designSettingsOnly(DEFAULT_MENU_BRANDING),
      ...designSettingsOnly(nextDesign || {}),
    });
    editVersionRef.current += 1;
    setDirty(true);
    setSaveStatus(isHebrew ? "שומר…" : "Saving…");
  }

  function resetDesign() {
    changeDesign({
      ...DEFAULT_MENU_BRANDING,
      accent: site?.primary_color || DEFAULT_MENU_BRANDING.accent,
      category_background:
        site?.primary_color || DEFAULT_MENU_BRANDING.category_background,
    });
  }

  async function changeLogo(dataUrl) {
    if (!site) return;

    setSaveStatus(isHebrew ? "שומר לוגו…" : "Saving logo…");

    if (!dataUrl) {
      const { error } = await supabase
        .from("menu_sites")
        .update({ logo_url: null })
        .eq("id", site.id);

      if (error) {
        setSaveStatus(isHebrew ? "לא ניתן להסיר את הלוגו" : "Could not remove logo");
        return;
      }

      setSite(current => (current ? { ...current, logo_url: null } : current));
      setSaveStatus(isHebrew ? "נשמר אוטומטית" : "Saved automatically");
      return;
    }

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const type = blob.type || "image/png";
      const extension =
        type.includes("jpeg") ? "jpg" :
        type.includes("webp") ? "webp" :
        type.includes("svg") ? "svg" : "png";

      const { data: authData } = await supabase.auth.getSession();
      const userId = authData?.session?.user?.id;
      if (!userId) throw new Error("Session unavailable");

      const objectPath = `${userId}/${site.id}/design-logo-${Date.now()}.${extension}`;
      const upload = await supabase.storage
        .from("menu-logos")
        .upload(objectPath, blob, {
          upsert: false,
          cacheControl: "3600",
          contentType: type,
        });

      if (upload.error) throw upload.error;

      const { data: publicData } = supabase.storage
        .from("menu-logos")
        .getPublicUrl(objectPath);

      const publicUrl = publicData?.publicUrl || "";
      if (!publicUrl) throw new Error("Logo URL unavailable");

      const update = await supabase
        .from("menu_sites")
        .update({ logo_url: publicUrl })
        .eq("id", site.id);

      if (update.error) throw update.error;

      setSite(current =>
        current ? { ...current, logo_url: publicUrl } : current
      );
      setSaveStatus(isHebrew ? "נשמר אוטומטית" : "Saved automatically");
    } catch (error) {
      console.error("Live menu logo update failed:", error);
      setSaveStatus(isHebrew ? "לא ניתן לשמור את הלוגו" : "Could not save logo");
    }
  }

  if (!site || !actionsTarget) return null;

  const trigger = createPortal(
    <button
      type="button"
      className={`bm-owner-live-design-trigger ${open ? "active" : ""}`}
      onClick={() => setOpen(true)}
    >
      <Palette size={15} strokeWidth={1.8} />
      {isHebrew ? "עיצוב התפריט החי" : "Design your live menu"}
    </button>,
    actionsTarget
  );

  return (
    <>
      {trigger}

      {open && createPortal(
        <div
          className="beyond-live-design-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={isHebrew ? "עיצוב התפריט החי" : "Design your live menu"}
        >
          <section
            className={`beyond-live-design-workspace menu-builder-unified theme-${theme}`}
            dir={isHebrew ? "rtl" : "ltr"}
          >
            <header className="beyond-live-design-head">
              <div>
                <span>BEYOND MENU STUDIO</span>
                <h2>{isHebrew ? "עיצוב התפריט החי" : "Design your live menu"}</h2>
                <p>
                  {isHebrew
                    ? "שנה את העיצוב וצפה מיד כיצד התפריט החי נראה ללקוחות."
                    : "Change the design and see instantly how your live customer menu looks."}
                </p>
              </div>

              <div className="beyond-live-design-head-actions">
                <small className={saveStatus.includes("Could not") || saveStatus.includes("לא ניתן") ? "error" : ""}>
                  {saveStatus || (isHebrew ? "השינויים נשמרים אוטומטית" : "Changes save automatically")}
                </small>

                <a
                  href={PUBLIC_PREFIX + site.slug}
                  target="_blank"
                  rel="noreferrer"
                >
                  {isHebrew ? "פתח תפריט חי" : "Open live menu"}
                </a>

                <button
                  type="button"
                  className="beyond-live-design-close"
                  onClick={() => setOpen(false)}
                  aria-label={isHebrew ? "סגור" : "Close"}
                >
                  <X size={19} />
                </button>
              </div>
            </header>

            <div className="beyond-live-design-body">
              <div className="beyond-live-design-editor">
                <MenuBrandEditor
                  branding={design}

          siteName={siteName}
          contentSettings={contentSettings}

          onSiteNameChange={
            changeSiteName
          }

          onContentSettingsChange={
            changeContentSettings
          }
                  onChange={changeDesign}
                  logoUrl={site.logo_url || ""}
                  onLogoChange={changeLogo}
                  onReset={resetDesign}
                />
              </div>

              <div className="beyond-live-design-preview-column">
                <div className="beyond-live-design-preview-label">
                  <span>{isHebrew ? "תצוגה חיה" : "LIVE PREVIEW"}</span>
                  <strong>/menu/{site.slug}</strong>
                </div>

                <div className="beyond-live-design-phone">
                  <LiveDesignPreview
                    site={site}
                    design={design}
                    groups={groups}
                    items={items}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}

export default function BeyondLiveMenuDesignPortal() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/menu-studio") {
    return <LiveMenuDesignStudio />;
  }

  if (path.startsWith(PUBLIC_PREFIX)) {
    const slug = decodeURIComponent(path.slice(PUBLIC_PREFIX.length));
    return slug ? <PublicLiveDesignApplicator slug={slug} /> : null;
  }

  return null;
}
