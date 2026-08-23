import { useEffect, useState } from "react";
import { ExternalLink, Eye, EyeOff, Save } from "lucide-react";

import { supabase } from "../lib/supabaseClient";
import {
  CUSTOMER_SHOWCASE_SETTINGS_KEY,
  DEFAULT_CUSTOMER_SHOWCASE,
  normalizeCustomerShowcase,
  parseCustomerShowcase,
} from "../lib/customerShowcase";

import "./AdminCustomerShowcaseSettings.css";

function isLocalPreview() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".app.github.dev") ||
    hostname.endsWith(".github.dev")
  );
}

async function readFunctionJson(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("NETLIFY_FUNCTION_NOT_AVAILABLE");
  }
  return response.json();
}

export default function AdminCustomerShowcaseSettings({ password }) {
  const [config, setConfig] = useState(DEFAULT_CUSTOMER_SHOWCASE);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [localMode, setLocalMode] = useState(() => isLocalPreview());

  async function loadDirect() {
    const [settingResult, sitesResult] = await Promise.all([
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", CUSTOMER_SHOWCASE_SETTINGS_KEY)
        .maybeSingle(),
      supabase
        .from("menu_sites")
        .select("id,name,slug,logo_url,published")
        .eq("published", true)
        .order("created_at", { ascending: true }),
    ]);

    if (settingResult.error) throw settingResult.error;
    if (sitesResult.error) throw sitesResult.error;

    return {
      config: parseCustomerShowcase(settingResult.data?.value),
      sites: sitesResult.data || [],
    };
  }

  async function saveDirect(nextConfig) {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user || null;

    if (!user) {
      throw new Error(
        "Local preview cannot save homepage customers until your Beyond Menu Admin account is signed in."
      );
    }

    const normalized = normalizeCustomerShowcase(nextConfig);
    const { error: saveError } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: CUSTOMER_SHOWCASE_SETTINGS_KEY,
          value: JSON.stringify(normalized),
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: "key" }
      );

    if (saveError) {
      const text = String(saveError.message || "").toLowerCase();
      if (
        text.includes("row-level security") ||
        text.includes("permission") ||
        text.includes("policy")
      ) {
        throw new Error(
          "Your signed-in Beyond account does not have Menu Admin permission to save homepage customers."
        );
      }
      throw saveError;
    }

    return normalized;
  }

  async function load() {
    setLoading(true);
    setError("");

    try {
      let result;

      if (isLocalPreview()) {
        setLocalMode(true);
        result = await loadDirect();
      } else {
        try {
          const response = await fetch("/.netlify/functions/admin-customer-showcase", {
            headers: { "x-admin-password": password },
          });
          const data = await readFunctionJson(response);
          if (!response.ok) throw new Error(data.error || "Could not load customer showcase settings.");
          result = {
            config: normalizeCustomerShowcase(data.config),
            sites: Array.isArray(data.sites) ? data.sites : [],
          };
          setLocalMode(false);
        } catch (functionError) {
          if (functionError?.message !== "NETLIFY_FUNCTION_NOT_AVAILABLE") throw functionError;
          setLocalMode(true);
          result = await loadDirect();
        }
      }

      setConfig(result.config);
      setSites(result.sites);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load homepage customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (password) load();
  }, [password]);

  function toggleSite(siteId) {
    setConfig((current) => {
      const selected = current.selected_site_ids.includes(siteId)
        ? current.selected_site_ids.filter((id) => id !== siteId)
        : [...current.selected_site_ids, siteId];

      return { ...current, selected_site_ids: selected };
    });
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      let normalized;

      if (isLocalPreview() || localMode) {
        normalized = await saveDirect(config);
      } else {
        try {
          const response = await fetch("/.netlify/functions/admin-customer-showcase", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-password": password,
            },
            body: JSON.stringify({ config }),
          });
          const data = await readFunctionJson(response);
          if (!response.ok) throw new Error(data.error || "Could not save customer showcase settings.");
          normalized = normalizeCustomerShowcase(data.config);
        } catch (functionError) {
          if (functionError?.message !== "NETLIFY_FUNCTION_NOT_AVAILABLE") throw functionError;
          setLocalMode(true);
          normalized = await saveDirect(config);
        }
      }

      setConfig(normalized);
      setMessage(
        normalized.enabled
          ? "Customer showcase saved and enabled on the homepage."
          : "Customer showcase saved and hidden from the homepage."
      );
      window.dispatchEvent(new CustomEvent("beyond-customer-showcase-updated"));
      window.setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to save homepage customers.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-customer-showcase-settings">
      <div className="admin-customer-showcase-head">
        <div>
          <span className="admin-label">WEBSITE</span>
          <h2>Homepage Customers</h2>
          <p>Choose which restaurant menus can appear as customer examples on the Beyond homepage.</p>
          {localMode ? (
            <small>Local preview mode · customer settings are read directly from Supabase.</small>
          ) : null}
        </div>

        <button type="button" className="primary-button" onClick={save} disabled={saving || loading}>
          <Save size={16} /> {saving ? "Saving..." : "Save Customers"}
        </button>
      </div>

      <div className={`admin-customer-showcase-toggle ${config.enabled ? "is-on" : ""}`}>
        <div className="admin-customer-showcase-toggle-copy">
          {config.enabled ? <Eye size={19} /> : <EyeOff size={19} />}
          <div>
            <strong>Show customer section on homepage</strong>
            <span>
              {config.enabled
                ? "The selected customer menus can be shown publicly."
                : "Hidden. Nothing from this section is currently displayed on the homepage."}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="admin-customer-showcase-switch"
          aria-pressed={config.enabled}
          onClick={() => setConfig((current) => ({ ...current, enabled: !current.enabled }))}
        >
          <span />
        </button>
      </div>

      {loading ? <div className="admin-message">Loading customer menus...</div> : null}
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-customer-showcase-success">{message}</div> : null}

      {!loading ? (
        <>
          <div className="admin-customer-showcase-summary">
            <strong>{config.selected_site_ids.length}</strong>
            <span>selected customer{config.selected_site_ids.length === 1 ? "" : "s"}</span>
          </div>

          {sites.length ? (
            <div className="admin-customer-showcase-grid">
              {sites.map((site) => {
                const selected = config.selected_site_ids.includes(site.id);
                return (
                  <article
                    key={site.id}
                    className={`admin-customer-site ${selected ? "is-selected" : ""}`}
                  >
                    <label className="admin-customer-site-select">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSite(site.id)}
                      />
                      <div className="admin-customer-site-logo">
                        {site.logo_url ? (
                          <img src={site.logo_url} alt="" />
                        ) : (
                          <span>{String(site.name || "?").charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="admin-customer-site-copy">
                        <strong>{site.name || "Unnamed restaurant"}</strong>
                        <span>/menu/{site.slug}</span>
                      </div>
                    </label>
                    <a
                      href={`/menu/${encodeURIComponent(site.slug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Preview <ExternalLink size={13} />
                    </a>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="admin-message">No published customer menus are available yet.</div>
          )}
        </>
      ) : null}
    </section>
  );
}
