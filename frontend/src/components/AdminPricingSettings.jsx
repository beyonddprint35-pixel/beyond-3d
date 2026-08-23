import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { DEFAULT_MENU_PRICING, normalizeMenuPricing } from "../lib/menuPricing";

import "./AdminPricingSettings.css";

function clonePricing(value) {
  return JSON.parse(JSON.stringify(value));
}

export default function AdminPricingSettings({ password }) {
  const [pricing, setPricing] = useState(() => clonePricing(DEFAULT_MENU_PRICING));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/.netlify/functions/admin-pricing-settings", {
          headers: { "x-admin-password": password },
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Could not load pricing settings.");
        if (!alive) return;

        setPricing(clonePricing(normalizeMenuPricing(data.pricing)));
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
      const response = await fetch("/.netlify/functions/admin-pricing-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ pricing }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Could not save pricing settings.");

      const normalized = normalizeMenuPricing(data.pricing);
      setPricing(clonePricing(normalized));
      setMessage("Pricing updated successfully.");
      window.dispatchEvent(new CustomEvent("beyond-menu-pricing-updated", { detail: { pricing: normalized } }));
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
          <p>Change prices, plan text and features shown on the Beyond homepage.</p>
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
