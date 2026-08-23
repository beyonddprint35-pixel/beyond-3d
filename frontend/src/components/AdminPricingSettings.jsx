import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { supabase } from "../lib/supabaseClient";
import {
  DEFAULT_MENU_PRICING,
  normalizeMenuPricing,
  parseMenuPricing,
} from "../lib/menuPricing";

import "./AdminPricingSettings.css";

const SETTINGS_KEY = "menu_pricing_plans";

function clonePricing(value) {
  return JSON.parse(JSON.stringify(value));
}

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

export default function AdminPricingSettings({ password }) {
  const [pricing, setPricing] = useState(() => clonePricing(DEFAULT_MENU_PRICING));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [localMode, setLocalMode] = useState(() => isLocalPreview());

  async function loadDirectFromSupabase() {
    const { data, error: supabaseError } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (supabaseError) throw supabaseError;

    return parseMenuPricing(data?.value);
  }

  async function saveDirectToSupabase(nextPricing) {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user || null;

    if (!user) {
      throw new Error(
        "Local preview cannot save pricing until your Beyond admin account is signed in. Open the homepage, sign in, then return to /admin."
      );
    }

    const normalized = normalizeMenuPricing(nextPricing);

    const { error: supabaseError } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: SETTINGS_KEY,
          value: JSON.stringify(normalized),
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: "key" }
      );

    if (supabaseError) {
      const message = String(supabaseError.message || "");

      if (
        message.toLowerCase().includes("row-level security") ||
        message.toLowerCase().includes("permission") ||
        message.toLowerCase().includes("policy")
      ) {
        throw new Error(
          "Your signed-in Beyond account does not have Menu Admin permission to save website pricing."
        );
      }

      throw supabaseError;
    }

    return normalized;
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        let nextPricing;

        if (isLocalPreview()) {
          setLocalMode(true);
          nextPricing = await loadDirectFromSupabase();
        } else {
          try {
            const response = await fetch("/.netlify/functions/admin-pricing-settings", {
              headers: { "x-admin-password": password },
            });
            const data = await readFunctionJson(response);

            if (!response.ok) {
              throw new Error(data.error || "Could not load pricing settings.");
            }

            nextPricing = normalizeMenuPricing(data.pricing);
            setLocalMode(false);
          } catch (functionError) {
            if (functionError?.message !== "NETLIFY_FUNCTION_NOT_AVAILABLE") {
              throw functionError;
            }

            setLocalMode(true);
            nextPricing = await loadDirectFromSupabase();
          }
        }

        if (!alive) return;
        setPricing(clonePricing(nextPricing));
      } catch (err) {
        if (!alive) return;
        console.error(err);
        setError(err.message || "Unable to load pricing settings.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (password) load();

    return () => {
      alive = false;
    };
  }, [password]);

  function updateRoot(field, value) {
    setPricing((current) => ({ ...current, [field]: value }));
  }

  function updatePlan(planIndex, field, value) {
    setPricing((current) => ({
      ...current,
      plans: current.plans.map((plan, index) =>
        index === planIndex ? { ...plan, [field]: value } : plan
      ),
    }));
  }

  function updateFeature(planIndex, featureIndex, field, value) {
    setPricing((current) => ({
      ...current,
      plans: current.plans.map((plan, index) => {
        if (index !== planIndex) return plan;
        return {
          ...plan,
          features: plan.features.map((feature, currentFeatureIndex) =>
            currentFeatureIndex === featureIndex ? { ...feature, [field]: value } : feature
          ),
        };
      }),
    }));
  }

  function addFeature(planIndex) {
    setPricing((current) => ({
      ...current,
      plans: current.plans.map((plan, index) =>
        index === planIndex
          ? { ...plan, features: [...plan.features, { en: "", he: "" }] }
          : plan
      ),
    }));
  }

  function removeFeature(planIndex, featureIndex) {
    setPricing((current) => ({
      ...current,
      plans: current.plans.map((plan, index) =>
        index === planIndex
          ? { ...plan, features: plan.features.filter((_, i) => i !== featureIndex) }
          : plan
      ),
    }));
  }

  async function savePricing() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      let normalized;

      if (isLocalPreview() || localMode) {
        normalized = await saveDirectToSupabase(pricing);
      } else {
        try {
          const response = await fetch("/.netlify/functions/admin-pricing-settings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-password": password,
            },
            body: JSON.stringify({ pricing }),
          });
          const data = await readFunctionJson(response);

          if (!response.ok) {
            throw new Error(data.error || "Could not save pricing settings.");
          }

          normalized = normalizeMenuPricing(data.pricing);
        } catch (functionError) {
          if (functionError?.message !== "NETLIFY_FUNCTION_NOT_AVAILABLE") {
            throw functionError;
          }

          setLocalMode(true);
          normalized = await saveDirectToSupabase(pricing);
        }
      }

      setPricing(clonePricing(normalized));
      setMessage(
        localMode || isLocalPreview()
          ? "Pricing updated successfully in Supabase."
          : "Pricing updated successfully."
      );
      window.dispatchEvent(
        new CustomEvent("beyond-menu-pricing-updated", {
          detail: { pricing: normalized },
        })
      );
      window.setTimeout(() => setMessage(""), 3500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to save pricing settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-pricing-settings">
      <div className="admin-pricing-settings-head">
        <div>
          <span className="admin-label">WEBSITE</span>
          <h2>Menu Pricing</h2>
          <p>Change prices, setup fees, plan text and features shown on the Beyond homepage.</p>
          {localMode ? (
            <small style={{ display: "block", marginTop: "8px", color: "#7f91ad" }}>
              Local preview mode · pricing is read directly from Supabase.
            </small>
          ) : null}
        </div>
        <button type="button" className="primary-button" onClick={savePricing} disabled={saving || loading}>
          <Save size={16} /> {saving ? "Saving..." : "Save Pricing"}
        </button>
      </div>

      {loading ? <div className="admin-message">Loading pricing settings...</div> : null}
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-pricing-success">{message}</div> : null}

      {!loading ? (
        <>
          <div className="admin-pricing-copy-grid">
            <label>
              <span>Section title — English</span>
              <input value={pricing.headline_en} onChange={(event) => updateRoot("headline_en", event.target.value)} />
            </label>
            <label>
              <span>Section title — Hebrew</span>
              <input dir="rtl" value={pricing.headline_he} onChange={(event) => updateRoot("headline_he", event.target.value)} />
            </label>
            <label>
              <span>Subtitle — English</span>
              <textarea value={pricing.subheadline_en} onChange={(event) => updateRoot("subheadline_en", event.target.value)} />
            </label>
            <label>
              <span>Subtitle — Hebrew</span>
              <textarea dir="rtl" value={pricing.subheadline_he} onChange={(event) => updateRoot("subheadline_he", event.target.value)} />
            </label>
          </div>

          <div className="admin-pricing-plans">
            {pricing.plans.map((plan, planIndex) => (
              <article className="admin-pricing-plan" key={plan.id}>
                <div className="admin-pricing-plan-title">
                  <div>
                    <span>{plan.id.toUpperCase()}</span>
                    <h3>{plan.name_en || plan.id}</h3>
                  </div>
                  <label className="admin-pricing-check">
                    <input
                      type="checkbox"
                      checked={Boolean(plan.recommended)}
                      onChange={(event) => updatePlan(planIndex, "recommended", event.target.checked)}
                    />
                    Recommended
                  </label>
                </div>

                <div className="admin-pricing-fields">
                  <label><span>Name — English</span><input value={plan.name_en} onChange={(event) => updatePlan(planIndex, "name_en", event.target.value)} /></label>
                  <label><span>Name — Hebrew</span><input dir="rtl" value={plan.name_he} onChange={(event) => updatePlan(planIndex, "name_he", event.target.value)} /></label>
                  <label className="wide"><span>Description — English</span><textarea value={plan.description_en} onChange={(event) => updatePlan(planIndex, "description_en", event.target.value)} /></label>
                  <label className="wide"><span>Description — Hebrew</span><textarea dir="rtl" value={plan.description_he} onChange={(event) => updatePlan(planIndex, "description_he", event.target.value)} /></label>
                  <label><span>Price</span><input value={plan.price} onChange={(event) => updatePlan(planIndex, "price", event.target.value)} placeholder="₪49" /></label>
                  <label><span>Period — English</span><input value={plan.period_en} onChange={(event) => updatePlan(planIndex, "period_en", event.target.value)} /></label>
                  <label><span>Period — Hebrew</span><input dir="rtl" value={plan.period_he} onChange={(event) => updatePlan(planIndex, "period_he", event.target.value)} /></label>
                  <label><span>One-time setup fee</span><input value={plan.setup_fee} onChange={(event) => updatePlan(planIndex, "setup_fee", event.target.value)} placeholder="₪200" /></label>
                  <label className="wide"><span>Setup note — English</span><input value={plan.setup_note_en} onChange={(event) => updatePlan(planIndex, "setup_note_en", event.target.value)} placeholder="NFC stands not included" /></label>
                  <label className="wide"><span>Setup note — Hebrew</span><input dir="rtl" value={plan.setup_note_he} onChange={(event) => updatePlan(planIndex, "setup_note_he", event.target.value)} /></label>
                  <label><span>Button — English</span><input value={plan.cta_en} onChange={(event) => updatePlan(planIndex, "cta_en", event.target.value)} /></label>
                  <label><span>Button — Hebrew</span><input dir="rtl" value={plan.cta_he} onChange={(event) => updatePlan(planIndex, "cta_he", event.target.value)} /></label>
                </div>

                <div className="admin-pricing-feature-head">
                  <strong>Features</strong>
                  <button type="button" className="secondary-button" onClick={() => addFeature(planIndex)}>
                    <Plus size={15} /> Add feature
                  </button>
                </div>

                <div className="admin-pricing-feature-list">
                  {plan.features.map((feature, featureIndex) => (
                    <div className="admin-pricing-feature-row" key={`${plan.id}-${featureIndex}`}>
                      <input
                        value={feature.en}
                        placeholder="English feature"
                        onChange={(event) => updateFeature(planIndex, featureIndex, "en", event.target.value)}
                      />
                      <input
                        dir="rtl"
                        value={feature.he}
                        placeholder="פיצ'ר בעברית"
                        onChange={(event) => updateFeature(planIndex, featureIndex, "he", event.target.value)}
                      />
                      <button type="button" onClick={() => removeFeature(planIndex, featureIndex)} aria-label="Remove feature">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
