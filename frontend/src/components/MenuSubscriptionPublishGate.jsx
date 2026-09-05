import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, CircleAlert, CreditCard, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import MenuStudioHeader from "./MenuStudioHeader";
import {
  activateMenuSubscriptionAsAdmin,
  loadMenuSubscription,
  selectMenuSubscriptionPlan,
} from "../features/menu-engine/data/menuSubscriptionService";
import { menuStudioProjectId } from "../features/menu-engine/studio/menuStudioV2Persistence";
import { readMenuStudioV2Draft, writeMenuStudioV2Draft } from "../features/menu-engine/studio/menuStudioV2Session";
import { readStudioLanguage, studioLanguageDirection } from "../features/menu-engine/studio/studioLanguage";
import { PREMIUM_MENU_DESIGNS } from "../features/menu-engine/domain/menuDesignLibrary";
import "./MenuSubscriptionPublishGate.css";
import "./MenuPublishDesignChooser.css";

const COPY = {
  en: {
    eyebrow: "CHOOSE YOUR PLAN",
    title: "Your menu is ready to launch.",
    intro: "Each menu has its own subscription. Choose the plan for this menu before it goes live.",
    loading: "Checking this menu’s subscription…",
    select: "Choose plan",
    selected: "Plan selected",
    pendingTitle: "Your plan is selected.",
    pendingText: "This menu stays in draft until the subscription is activated. Payment checkout will connect here next.",
    active: "Subscription active",
    adminActivate: "Activate manually as Admin",
    activating: "Activating…",
    refresh: "Refresh status",
    back: "Back to Preview",
    oneMenu: "1 subscription · 1 menu",
    setup: "Setup",
    monthly: "Monthly",
    errorTitle: "Subscription check failed",
    missingProject: "This menu must be saved to your Beyond account before you can choose a plan.",
    chooseDesignEyebrow: "FINAL DESIGN",
    chooseDesignTitle: "Which design do you want to publish?",
    chooseDesignIntro: "Your content is shared between both favorites. Choose the design guests should see on the live menu.",
    designA: "Design A",
    designB: "Design B",
  },
  he: {
    eyebrow: "בחירת חבילה",
    title: "התפריט שלכם מוכן להשקה.",
    intro: "לכל תפריט יש מנוי משלו. בחרו את החבילה של התפריט לפני שהוא עולה לאוויר.",
    loading: "בודק את המנוי של התפריט…",
    select: "בחירת חבילה",
    selected: "החבילה נבחרה",
    pendingTitle: "החבילה נבחרה.",
    pendingText: "התפריט נשאר בטיוטה עד להפעלת המנוי. חיבור התשלום יתווסף כאן בשלב הבא.",
    active: "המנוי פעיל",
    adminActivate: "הפעלה ידנית כאדמין",
    activating: "מפעיל…",
    refresh: "רענון סטטוס",
    back: "חזרה לתצוגה",
    oneMenu: "מנוי אחד · תפריט אחד",
    setup: "הקמה",
    monthly: "חודשי",
    errorTitle: "לא ניתן לבדוק את המנוי",
    missingProject: "צריך לשמור את התפריט בחשבון Beyond לפני בחירת חבילה.",
    chooseDesignEyebrow: "עיצוב סופי",
    chooseDesignTitle: "איזה עיצוב תרצו לפרסם?",
    chooseDesignIntro: "התוכן משותף לשני העיצובים. בחרו איזה עיצוב האורחים יראו בתפריט החי.",
    designA: "עיצוב A",
    designB: "עיצוב B",
  },
  ar: {
    eyebrow: "اختيار الخطة",
    title: "قائمتكم جاهزة للإطلاق.",
    intro: "لكل قائمة اشتراك مستقل. اختاروا الخطة الخاصة بهذه القائمة قبل نشرها.",
    loading: "جارٍ فحص اشتراك القائمة…",
    select: "اختيار الخطة",
    selected: "تم اختيار الخطة",
    pendingTitle: "تم اختيار الخطة.",
    pendingText: "تبقى القائمة كمسودة حتى يتم تفعيل الاشتراك. سيتم ربط الدفع هنا في المرحلة التالية.",
    active: "الاشتراك فعال",
    adminActivate: "تفعيل يدوي كمسؤول",
    activating: "جارٍ التفعيل…",
    refresh: "تحديث الحالة",
    back: "العودة للمعاينة",
    oneMenu: "اشتراك واحد · قائمة واحدة",
    setup: "إعداد",
    monthly: "شهري",
    errorTitle: "تعذر فحص الاشتراك",
    missingProject: "يجب حفظ القائمة في حساب Beyond قبل اختيار خطة.",
    chooseDesignEyebrow: "التصميم النهائي",
    chooseDesignTitle: "أي تصميم تريدون نشره؟",
    chooseDesignIntro: "المحتوى مشترك بين التصميمين. اختاروا التصميم الذي سيشاهده الضيوف في القائمة المباشرة.",
    designA: "التصميم A",
    designB: "التصميم B",
  },
};

function planName(plan, lang) {
  return plan?.[`name_${lang}`] || plan?.name_en || plan?.id || "Plan";
}

function planDescription(plan, lang) {
  return plan?.[`description_${lang}`] || plan?.description_en || "";
}

function planPeriod(plan, lang) {
  return plan?.[`period_${lang}`] || plan?.period_en || "";
}

function planSetupNote(plan, lang) {
  return plan?.[`setup_note_${lang}`] || plan?.setup_note_en || "";
}

function featureText(feature, lang) {
  if (typeof feature === "string") return feature;
  return feature?.[lang] || feature?.en || feature?.he || "";
}

function designName(variant) {
  if (!variant) return "";
  return PREMIUM_MENU_DESIGNS.find((entry) => entry.id === variant.designId)?.name || "Custom";
}

export default function MenuSubscriptionPublishGate({ children }) {
  const navigate = useNavigate();
  const draft = useMemo(() => readMenuStudioV2Draft(), []);
  const projectId = menuStudioProjectId(draft);
  const menuName = draft?.menu?.restaurant_name || draft?.menu?.name || "Menu";
  const [language] = useState(() => readStudioLanguage("en"));
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [selectingPlanId, setSelectingPlanId] = useState("");
  const [activating, setActivating] = useState(false);
  const [publishDesignVariant, setPublishDesignVariant] = useState("");
  const t = COPY[language] || COPY.en;
  const rtl = studioLanguageDirection(language) === "rtl";

  async function load() {
    if (!projectId) {
      setState({ loading: false, data: null, error: t.missingProject });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await loadMenuSubscription(projectId);
      setState({ loading: false, data, error: "" });
    } catch (error) {
      setState({ loading: false, data: null, error: error?.message || t.errorTitle });
    }
  }

  useEffect(() => {
    void load();
  }, [projectId]);

  async function choosePlan(planId) {
    if (!projectId || selectingPlanId) return;
    setSelectingPlanId(planId);
    setState((current) => ({ ...current, error: "" }));
    try {
      const result = await selectMenuSubscriptionPlan(projectId, planId, "monthly");
      setState((current) => ({ ...current, data: { ...(current.data || {}), ...result }, error: "" }));
    } catch (error) {
      setState((current) => ({ ...current, error: error?.message || "Could not select this plan." }));
    } finally {
      setSelectingPlanId("");
    }
  }

  async function activateAsAdmin() {
    if (!projectId || activating) return;
    setActivating(true);
    setState((current) => ({ ...current, error: "" }));
    try {
      const result = await activateMenuSubscriptionAsAdmin(projectId);
      setState((current) => ({ ...current, data: { ...(current.data || {}), ...result }, error: "" }));
    } catch (error) {
      setState((current) => ({ ...current, error: error?.message || "Could not activate this subscription." }));
    } finally {
      setActivating(false);
    }
  }

  function choosePublishDesign(slot) {
    const currentDraft = readMenuStudioV2Draft();
    const variant = currentDraft?.profile?.designVariants?.[slot];
    if (!variant?.design) return;
    writeMenuStudioV2Draft({
      ...currentDraft,
      design: variant.design,
      designId: variant.designId || currentDraft.designId,
      profile: {
        ...(currentDraft.profile || {}),
        activeDesignVariant: slot,
      },
      publication: {
        ...(currentDraft.publication || {}),
        selectedDesignVariant: slot,
      },
    });
    setPublishDesignVariant(slot);
  }

  const latestDraft = readMenuStudioV2Draft() || draft;
  const designVariants = latestDraft?.profile?.designVariants || {};
  const availableVariants = ["A", "B"].filter((slot) => designVariants?.[slot]?.design);
  const requiresDesignChoice = availableVariants.length > 1;

  if (state.data?.canPublish || state.data?.subscription?.status === "active") {
    if (requiresDesignChoice && !publishDesignVariant) {
      return (
        <>
          <MenuStudioHeader
            stage="publish"
            language={language}
            menuName={menuName}
            onBack={() => navigate(`/menu-studio/preview${window.location.search || ""}`)}
            backLabel={t.back}
          />
          <main className="menu-publish-design-choice" dir={rtl ? "rtl" : "ltr"} lang={language}>
            <section className="menu-publish-design-choice-card">
              <span>{t.chooseDesignEyebrow}</span>
              <h1>{t.chooseDesignTitle}</h1>
              <p>{t.chooseDesignIntro}</p>
              <div className="menu-publish-design-choice-options">
                {availableVariants.map((slot) => (
                  <button key={slot} type="button" className="menu-publish-design-choice-option" onClick={() => choosePublishDesign(slot)}>
                    <span className="menu-publish-design-choice-letter">{slot}</span>
                    <span>
                      <strong>{slot === "B" ? t.designB : t.designA}</strong>
                      <small>{designName(designVariants[slot])}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </main>
        </>
      );
    }
    return children;
  }

  const plans = state.data?.pricing?.plans || [];
  const subscription = state.data?.subscription || null;
  const selectedPlan = plans.find((plan) => plan.id === subscription?.plan_id) || subscription?.plan_snapshot || null;

  return (
    <main className="menu-subscription-gate" dir={rtl ? "rtl" : "ltr"} lang={language}>
      <MenuStudioHeader
        stage="publish"
        language={language}
        menuName={menuName}
        onBack={() => navigate(`/menu-studio/preview${window.location.search || ""}`)}
        backLabel={t.back}
      />

      <section className="menu-subscription-gate-shell">
        <button type="button" className="menu-subscription-back" onClick={() => navigate(`/menu-studio/preview${window.location.search || ""}`)}>
          <ChevronLeft size={16} /> {t.back}
        </button>

        <div className="menu-subscription-hero">
          <div>
            <span className="menu-subscription-eyebrow"><Sparkles size={14} /> {t.eyebrow}</span>
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
          </div>
          <div className="menu-subscription-rule"><ShieldCheck size={18} /><span><strong>{t.oneMenu}</strong><small>{menuName}</small></span></div>
        </div>

        {state.error ? (
          <div className="menu-subscription-error"><CircleAlert size={17} /><span><strong>{t.errorTitle}</strong><small>{state.error}</small></span><button type="button" onClick={load}><RefreshCw size={14} /> {t.refresh}</button></div>
        ) : null}

        {state.loading ? (
          <div className="menu-subscription-loading"><RefreshCw size={20} className="spin" /><span>{t.loading}</span></div>
        ) : subscription?.status === "pending_payment" ? (
          <section className="menu-subscription-pending">
            <div className="menu-subscription-pending-icon"><CreditCard size={24} /></div>
            <span className="menu-subscription-status">PENDING PAYMENT</span>
            <h2>{t.pendingTitle}</h2>
            {selectedPlan ? <strong>{planName(selectedPlan, language)} · {selectedPlan.price || ""}</strong> : null}
            <p>{t.pendingText}</p>
            <div className="menu-subscription-pending-actions">
              <button type="button" className="secondary" onClick={load}><RefreshCw size={15} /> {t.refresh}</button>
              {state.data?.isAdmin ? <button type="button" className="primary" onClick={activateAsAdmin} disabled={activating}><ShieldCheck size={15} /> {activating ? t.activating : t.adminActivate}</button> : null}
            </div>
          </section>
        ) : (
          <section className="menu-subscription-plans">
            {plans.map((plan) => (
              <article key={plan.id} className={`menu-subscription-plan ${plan.recommended ? "recommended" : ""}`}>
                {plan.recommended ? <span className="menu-subscription-recommended">RECOMMENDED</span> : null}
                <div className="menu-subscription-plan-head">
                  <div><span>{planName(plan, language)}</span><p>{planDescription(plan, language)}</p></div>
                </div>
                <div className="menu-subscription-price"><strong>{plan.price || "—"}</strong><span>{planPeriod(plan, language)}</span></div>
                {plan.setup_fee ? <div className="menu-subscription-setup"><span>{t.setup}</span><strong>{plan.setup_fee}</strong><small>{planSetupNote(plan, language)}</small></div> : null}
                {Array.isArray(plan.features) && plan.features.length ? <div className="menu-subscription-features">{plan.features.map((feature, index) => {
                  const text = featureText(feature, language);
                  return text ? <span key={`${plan.id}-${index}`}><Check size={14} /> {text}</span> : null;
                })}</div> : null}
                <button type="button" onClick={() => choosePlan(plan.id)} disabled={Boolean(selectingPlanId)}>{selectingPlanId === plan.id ? "…" : (plan?.[`cta_${language}`] || plan.cta_en || t.select)}</button>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
