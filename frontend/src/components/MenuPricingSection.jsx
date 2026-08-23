import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";

import { useBeyondLanguage } from "../i18n/BeyondLanguage";
import { supabase } from "../lib/supabaseClient";
import { DEFAULT_MENU_PRICING, parseMenuPricing } from "../lib/menuPricing";

import "./MenuPricingSection.css";

export default function MenuPricingSection({ onSelectPlan }) {
  const { isHebrew } = useBeyondLanguage();
  const [pricing, setPricing] = useState(DEFAULT_MENU_PRICING);

  useEffect(() => {
    let alive = true;

    async function loadPricing() {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "menu_pricing_plans")
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.error("Unable to load pricing settings:", error);
        setPricing(DEFAULT_MENU_PRICING);
        return;
      }

      setPricing(parseMenuPricing(data?.value));
    }

    loadPricing();

    const handleUpdated = (event) => {
      if (event.detail?.pricing) {
        setPricing(parseMenuPricing(event.detail.pricing));
      } else {
        loadPricing();
      }
    };

    window.addEventListener("beyond-menu-pricing-updated", handleUpdated);

    return () => {
      alive = false;
      window.removeEventListener("beyond-menu-pricing-updated", handleUpdated);
    };
  }, []);

  const headline = isHebrew ? pricing.headline_he : pricing.headline_en;
  const subheadline = isHebrew ? pricing.subheadline_he : pricing.subheadline_en;

  return (
    <section className="menu-pricing-section" id="pricing">
      <div className="menu-pricing-heading">
        <div className="menu-home-kicker">
          <Sparkles size={15} />
          {isHebrew ? "חבילות" : "PRICING"}
        </div>
        <h2>{headline}</h2>
        <p>{subheadline}</p>
      </div>

      <div className="menu-pricing-grid">
        {pricing.plans.map((plan) => {
          const name = isHebrew ? plan.name_he : plan.name_en;
          const description = isHebrew ? plan.description_he : plan.description_en;
          const period = isHebrew ? plan.period_he : plan.period_en;
          const setupNote = isHebrew ? plan.setup_note_he : plan.setup_note_en;
          const cta = isHebrew ? plan.cta_he : plan.cta_en;

          return (
            <article
              key={plan.id}
              className={`menu-pricing-card ${plan.recommended ? "is-recommended" : ""}`}
            >
              <div className="menu-pricing-card-top">
                <div>
                  <h3>{name}</h3>
                  <p>{description}</p>
                </div>
                {plan.recommended ? (
                  <span className="menu-pricing-recommended">
                    {isHebrew ? "מומלץ" : "RECOMMENDED"}
                  </span>
                ) : null}
              </div>

              <div className="menu-pricing-price-row">
                <strong>{plan.price}</strong>
                <span>{period}</span>
              </div>

              <div className="menu-pricing-setup">
                <strong>
                  {isHebrew ? "הקמה חד-פעמית:" : "One-time setup:"} {plan.setup_fee}
                </strong>
                {setupNote ? <span>{setupNote}</span> : null}
              </div>

              <div className="menu-pricing-divider" />

              <div className="menu-pricing-features">
                {plan.features.map((feature, index) => (
                  <span key={`${plan.id}-${index}`}>
                    <Check size={15} />
                    {isHebrew ? feature.he || feature.en : feature.en}
                  </span>
                ))}
              </div>

              <button
                type="button"
                className={plan.recommended ? "menu-pricing-cta primary" : "menu-pricing-cta"}
                onClick={() => onSelectPlan?.(plan)}
              >
                {cta}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
