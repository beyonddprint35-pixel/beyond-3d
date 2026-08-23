import { useEffect, useMemo, useState } from "react";
import { Store } from "lucide-react";

import { useBeyondLanguage } from "../i18n/BeyondLanguage";
import { supabase } from "../lib/supabaseClient";
import {
  CUSTOMER_SHOWCASE_SETTINGS_KEY,
  DEFAULT_CUSTOMER_SHOWCASE,
  parseCustomerShowcase,
} from "../lib/customerShowcase";

import "./CustomerShowcaseSection.css";

function CustomerLogo({ site, duplicate = false, instanceKey = "" }) {
  return (
    <a
      className="menu-customer-logo-item"
      href={`/menu/${encodeURIComponent(site.slug)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${site.name} menu`}
      aria-hidden={duplicate ? "true" : undefined}
      tabIndex={duplicate ? -1 : undefined}
      data-customer-instance={instanceKey}
    >
      <div className="menu-customer-logo-circle">
        {site.logo_url ? (
          <img src={site.logo_url} alt={duplicate ? "" : `${site.name} logo`} loading="lazy" />
        ) : (
          <span>{String(site.name).charAt(0).toUpperCase()}</span>
        )}
      </div>
      <strong>{site.name}</strong>
    </a>
  );
}

export default function CustomerShowcaseSection() {
  const { isHebrew } = useBeyondLanguage();
  const [config, setConfig] = useState(DEFAULT_CUSTOMER_SHOWCASE);
  const [sites, setSites] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const { data: settingRow, error: settingError } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", CUSTOMER_SHOWCASE_SETTINGS_KEY)
          .maybeSingle();

        if (settingError) throw settingError;
        if (!alive) return;

        const nextConfig = parseCustomerShowcase(settingRow?.value);
        setConfig(nextConfig);

        if (!nextConfig.enabled || !nextConfig.selected_site_ids.length) {
          setSites([]);
          setReady(true);
          return;
        }

        const { data: siteRows, error: siteError } = await supabase
          .from("menu_sites")
          .select("id,name,slug,logo_url,published")
          .in("id", nextConfig.selected_site_ids)
          .eq("published", true);

        if (siteError) throw siteError;
        if (!alive) return;

        const byId = new Map((siteRows || []).map((site) => [site.id, site]));
        setSites(
          nextConfig.selected_site_ids
            .map((id) => byId.get(id))
            .filter(Boolean)
        );
      } catch (error) {
        console.error("Unable to load homepage customer showcase:", error);
        if (alive) {
          setConfig(DEFAULT_CUSTOMER_SHOWCASE);
          setSites([]);
        }
      } finally {
        if (alive) setReady(true);
      }
    }

    load();

    const handleUpdated = () => load();
    window.addEventListener("beyond-customer-showcase-updated", handleUpdated);

    return () => {
      alive = false;
      window.removeEventListener("beyond-customer-showcase-updated", handleUpdated);
    };
  }, []);

  const visibleSites = useMemo(
    () => sites.filter((site) => site?.slug && site?.name),
    [sites]
  );

  const shouldAnimate = visibleSites.length > 1;

  const marqueeSites = useMemo(() => {
    if (visibleSites.length <= 1) return visibleSites;

    const targetCount = Math.max(6, visibleSites.length);
    return Array.from(
      { length: targetCount },
      (_, index) => visibleSites[index % visibleSites.length]
    );
  }, [visibleSites]);

  const duration = Math.max(24, marqueeSites.length * 4.8);

  if (!ready || !config.enabled || visibleSites.length === 0) return null;

  return (
    <section className="menu-customer-showcase" id="customers">
      <div className="menu-customer-showcase-heading">
        <div className="menu-home-kicker">
          <Store size={15} />
          {isHebrew ? "הלקוחות שלנו" : "OUR CUSTOMERS"}
        </div>
        <h2>{isHebrew ? "תפריטים שכבר חיים ב-Beyond." : "Menus already live with Beyond."}</h2>
        <p>
          {isHebrew
            ? "לחצו על לוגו כדי לפתוח את התפריט החי."
            : "Tap a logo to open the restaurant’s live menu."}
        </p>
      </div>

      <div
        className={`menu-customer-marquee${shouldAnimate ? " is-moving" : " is-static"}`}
        style={{ "--customer-marquee-duration": `${duration}s` }}
      >
        <div className="menu-customer-marquee-track">
          <div className="menu-customer-marquee-set">
            {marqueeSites.map((site, index) => (
              <CustomerLogo
                key={`${site.id}-primary-${index}`}
                site={site}
                instanceKey={`primary-${index}`}
              />
            ))}
          </div>

          {shouldAnimate ? (
            <div className="menu-customer-marquee-set" aria-hidden="true">
              {marqueeSites.map((site, index) => (
                <CustomerLogo
                  key={`${site.id}-duplicate-${index}`}
                  site={site}
                  duplicate
                  instanceKey={`duplicate-${index}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
