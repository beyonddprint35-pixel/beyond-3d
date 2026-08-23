import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Store } from "lucide-react";

import { useBeyondLanguage } from "../i18n/BeyondLanguage";
import { supabase } from "../lib/supabaseClient";
import {
  CUSTOMER_SHOWCASE_SETTINGS_KEY,
  DEFAULT_CUSTOMER_SHOWCASE,
  parseCustomerShowcase,
} from "../lib/customerShowcase";

import "./CustomerShowcaseSection.css";

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
            ? "לחצו על מסעדה כדי לראות את התפריט החי שלה בדיוק כפי שהלקוחות רואים אותו."
            : "Open a restaurant to see its live customer menu exactly as guests experience it."}
        </p>
      </div>

      <div className="menu-customer-showcase-grid">
        {visibleSites.map((site) => (
          <a
            key={site.id}
            className="menu-customer-showcase-card"
            href={`/menu/${encodeURIComponent(site.slug)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${site.name} menu`}
          >
            <div className="menu-customer-showcase-logo">
              {site.logo_url ? (
                <img src={site.logo_url} alt={`${site.name} logo`} loading="lazy" />
              ) : (
                <span>{String(site.name).charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="menu-customer-showcase-name">
              <strong>{site.name}</strong>
              <span>{isHebrew ? "צפייה בתפריט" : "View live menu"} <ExternalLink size={12} /></span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
