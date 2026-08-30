import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileUp,
  Globe2,
  HeartHandshake,
  Link2,
  PencilLine,
  Sparkles,
} from "lucide-react";

import beyondLogo from "../assets/beyond-logo-transparent.png";
import StudioLanguageMenu from "../components/StudioLanguageMenu";
import { PREMIUM_MENU_DESIGNS } from "../features/menu-engine/domain/menuDesignLibrary";
import {
  MENU_CREATE_V2_DESIGN_KEY,
  MENU_CREATE_V2_FLOW_KEY,
} from "../features/menu-engine/studio/menuStudioV2Session";
import {
  readStudioLanguage,
  studioLanguageDirection,
  writeStudioLanguage,
} from "../features/menu-engine/studio/studioLanguage";
import {
  MENU_CREATE_QUESTIONS,
  MENU_CREATE_START_OPTIONS,
  MENU_CREATE_UI,
} from "./menuCreateV2Copy";
import "./MenuCreateV2.css";
import "./MenuCreateV2Multilingual.css";

const START_ICONS = {
  upload: FileUp,
  website: Globe2,
  manual: PencilLine,
  concierge: HeartHandshake,
};

const PROFILE_TAGS = {
  venue: {
    restaurant: ["restaurant", "bistro", "classic", "modern"],
    cafe: ["cafe", "coffee", "brunch", "friendly"],
    bar: ["bar", "cocktail", "cocktails", "wine", "spirits", "night", "drinks"],
    bakery: ["bakery", "cafe", "pastry", "friendly", "warm"],
    casual: ["fast casual", "street food", "burger", "pizza", "bold", "tiles"],
    fine: ["fine dining", "luxury", "editorial", "minimal", "premium"],
  },
  feeling: {
    premium: ["luxury", "fine dining", "premium", "editorial", "elegant"],
    modern: ["modern", "minimal", "white", "app", "mobile"],
    bold: ["bold", "street food", "fast casual", "colorful", "tiles"],
    warm: ["warm", "classic", "heritage", "bistro", "trattoria"],
    playful: ["playful", "friendly", "tiles", "cafe", "brunch"],
    minimal: ["minimal", "editorial", "quiet", "black white", "fine dining"],
  },
  photos: {
    "photo-first": ["photos", "visual", "gallery", "split", "photo story", "tiles"],
    some: ["visual", "tiles", "split", "gallery"],
    none: ["editorial", "ledger", "minimal", "classic", "price list"],
  },
  menuSize: {
    small: ["editorial", "minimal", "gallery", "fine dining"],
    medium: ["classic", "tiles", "split", "restaurant"],
    large: ["ledger", "dense", "price list", "wine", "spirits", "classic"],
  },
  service: {
    fast: ["fast casual", "tiles", "mobile", "launcher", "street food"],
    browse: ["gallery", "visual", "split", "photos", "photo story"],
    premium: ["fine dining", "luxury", "editorial", "minimal", "premium"],
    drinks: ["bar", "wine", "spirits", "cocktail", "cocktails", "ledger", "drinks"],
  },
};

function searchableDesignText(entry) {
  return [entry.name, entry.category, entry.layout, entry.description, ...(entry.tags || [])]
    .join(" ")
    .toLowerCase();
}

function scoreDesign(entry, answers) {
  const haystack = searchableDesignText(entry);
  let score = 50;
  let matches = 0;

  Object.entries(PROFILE_TAGS).forEach(([question, optionMap]) => {
    const selected = answers[question];
    if (!selected) return;
    (optionMap[selected] || []).forEach((tag) => {
      if (haystack.includes(tag.toLowerCase())) {
        score += question === "venue" || question === "feeling" ? 8 : 5;
        matches += 1;
      }
    });
  });

  if (answers.branding === "none" && /friendly|modern|minimal|classic/.test(haystack)) score += 2;
  if (answers.branding === "full" && /minimal|editorial|gallery|split/.test(haystack)) score += 2;
  return { score: Math.min(98, Math.max(62, score)), matches };
}

function recommendationReason(entry, answers, t) {
  const reasons = [];
  const text = searchableDesignText(entry);
  if (answers.feeling === "premium" && /luxury|editorial|fine dining|premium/.test(text)) reasons.push(t.reasons.premium);
  if (answers.feeling === "warm" && /warm|heritage|classic|bistro/.test(text)) reasons.push(t.reasons.warm);
  if (answers.feeling === "bold" && /bold|street|tiles/.test(text)) reasons.push(t.reasons.bold);
  if (answers.photos === "photo-first" && /photo|gallery|visual|split|tiles/.test(text)) reasons.push(t.reasons.photo);
  if (answers.photos === "none" && /editorial|ledger|minimal|classic/.test(text)) reasons.push(t.reasons.typography);
  if (answers.menuSize === "large" && /ledger|dense|wine|classic/.test(text)) reasons.push(t.reasons.large);
  if (answers.service === "drinks" && /bar|wine|cocktail|ledger|drinks/.test(text)) reasons.push(t.reasons.drinks);
  if (answers.venue === "cafe" && /cafe|brunch|bakery|friendly/.test(text)) reasons.push(t.reasons.cafe);
  return reasons.slice(0, 2).join(" · ") || t.reasons.fallback;
}

function MiniMenuPreview({ entry }) {
  const [paper = "#f7f5f2", accent = "#4974e5", ink = "#17191d"] = entry.swatches || [];
  const visual = /gallery|tiles|split|visual|photo/i.test(`${entry.layout} ${entry.tags?.join(" ")}`);
  return (
    <div className="menu-create-v2-mini" style={{ "--mini-paper": paper, "--mini-accent": accent, "--mini-ink": ink }}>
      <div className="menu-create-v2-mini-top"><span /><b>MENU</b><i /></div>
      <div className="menu-create-v2-mini-hero"><small>{entry.category}</small><strong>{entry.name.split(" ")[0]}</strong></div>
      <div className="menu-create-v2-mini-tabs"><span /><span /><span /></div>
      <div className={`menu-create-v2-mini-items ${visual ? "visual" : "textual"}`}>
        {[0, 1, 2].map((index) => <article key={index}><i /><div><b /><span /></div><em /></article>)}
      </div>
    </div>
  );
}

function Progress({ screen, questionIndex, t }) {
  const fitActive = screen === "questions" || screen === "recommendations";
  const designsActive = screen === "recommendations";
  const fitLabel = screen === "questions" ? `${questionIndex + 1} / ${MENU_CREATE_QUESTIONS.length}` : t.fit;
  return (
    <div className="menu-create-v2-progress" aria-label={t.progress}>
      <span className="done"><Check size={12} /> {t.start}</span>
      <i />
      <span className={fitActive ? "active" : ""}>{fitLabel}</span>
      <i />
      <span className={designsActive ? "active" : ""}>{t.designs}</span>
    </div>
  );
}

export default function MenuCreateV2() {
  const [uiLanguage, setUiLanguage] = useState(() => readStudioLanguage("en"));
  const [screen, setScreen] = useState("start");
  const [mode, setMode] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [concierge, setConcierge] = useState({ restaurant: "", website: "", notes: "" });
  const [requestPrepared, setRequestPrepared] = useState(false);

  const t = MENU_CREATE_UI[uiLanguage] || MENU_CREATE_UI.en;
  const rtl = studioLanguageDirection(uiLanguage) === "rtl";
  const ForwardIcon = rtl ? ArrowLeft : ArrowRight;
  const BackIcon = rtl ? ArrowRight : ArrowLeft;
  const currentQuestion = MENU_CREATE_QUESTIONS[questionIndex];
  const [questionEyebrow, questionTitle, questionHint] = currentQuestion?.copy?.[uiLanguage] || currentQuestion?.copy?.en || [];

  const recommendations = useMemo(() => PREMIUM_MENU_DESIGNS
    .map((entry) => ({ ...entry, ...scoreDesign(entry, answers) }))
    .sort((a, b) => b.score - a.score || b.matches - a.matches)
    .slice(0, 3), [answers]);

  function changeUiLanguage(language) {
    setUiLanguage(language);
    writeStudioLanguage(language);
  }

  function persistFlow(nextMode = mode, extra = {}) {
    const payload = { mode: nextMode, answers, websiteUrl, uiLanguage, createdAt: new Date().toISOString(), ...extra };
    try { window.sessionStorage.setItem(MENU_CREATE_V2_FLOW_KEY, JSON.stringify(payload)); } catch { /* non-blocking */ }
  }

  function chooseStart(nextMode) {
    setMode(nextMode);
    if (nextMode === "upload") {
      persistFlow(nextMode);
      window.location.assign(`/menu-builder?guided=1&source=upload&ui=${uiLanguage}`);
      return;
    }
    if (nextMode === "website") { setScreen("website"); return; }
    if (nextMode === "concierge") { setScreen("concierge"); return; }
    setQuestionIndex(0);
    setScreen("questions");
  }

  function validateWebsiteAndContinue() {
    try {
      const parsed = new URL(websiteUrl.trim());
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("invalid");
      setWebsiteError("");
      persistFlow("website", { websiteUrl: parsed.toString() });
      setQuestionIndex(0);
      setScreen("questions");
    } catch {
      setWebsiteError(t.websiteError);
    }
  }

  function chooseAnswer(value) {
    const nextAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(nextAnswers);
    if (questionIndex < MENU_CREATE_QUESTIONS.length - 1) {
      setQuestionIndex((current) => current + 1);
      return;
    }
    try {
      window.sessionStorage.setItem(MENU_CREATE_V2_FLOW_KEY, JSON.stringify({ mode, answers: nextAnswers, websiteUrl, uiLanguage, createdAt: new Date().toISOString() }));
    } catch { /* non-blocking */ }
    setScreen("recommendations");
  }

  function goBack() {
    if (screen === "start") { window.location.assign("/"); return; }
    if (screen === "questions" && questionIndex > 0) { setQuestionIndex((current) => current - 1); return; }
    if (screen === "recommendations") {
      setQuestionIndex(MENU_CREATE_QUESTIONS.length - 1);
      setScreen("questions");
      return;
    }
    setScreen("start");
  }

  function selectDesign(entry) {
    persistFlow(mode, { recommendedDesignId: entry.id, recommendedDesignName: entry.name });
    try { window.sessionStorage.setItem(MENU_CREATE_V2_DESIGN_KEY, entry.id); } catch { /* non-blocking */ }
    const params = new URLSearchParams({ guided: "1", mode: mode || "manual", design: entry.id, ui: uiLanguage });
    if (websiteUrl.trim()) params.set("website", websiteUrl.trim());
    window.location.assign(`/dev/menu-content-v2?${params.toString()}`);
  }

  function prepareConciergeRequest(event) {
    event.preventDefault();
    const draft = { ...concierge, mode: "concierge", uiLanguage, createdAt: new Date().toISOString() };
    try { window.sessionStorage.setItem(MENU_CREATE_V2_FLOW_KEY, JSON.stringify(draft)); } catch { /* non-blocking */ }
    setRequestPrepared(true);
  }

  return (
    <main className="menu-create-v2" dir={rtl ? "rtl" : "ltr"} lang={uiLanguage}>
      <header className="menu-create-v2-topbar">
        <button type="button" className="menu-create-v2-brand" onClick={() => window.location.assign("/")}>
          <img src={beyondLogo} alt="" />
          <span><strong>Beyond</strong><small>{t.studio}</small></span>
        </button>
        <Progress screen={screen} questionIndex={questionIndex} t={t} />
        <div className="menu-create-v2-top-actions">
          <StudioLanguageMenu value={uiLanguage} onChange={changeUiLanguage} label={t.language} compact />
          <button type="button" className="menu-create-v2-exit" onClick={() => window.location.assign("/")}>{t.exit}</button>
        </div>
      </header>

      <div className="menu-create-v2-shell">
        {screen !== "start" ? <button type="button" className="menu-create-v2-back" onClick={goBack}><BackIcon size={16} /> {t.back}</button> : null}

        {screen === "start" ? (
          <section className="menu-create-v2-start">
            <div className="menu-create-v2-heading"><span>{t.createEyebrow}</span><h1>{t.createTitle}</h1><p>{t.createHint}</p></div>
            <div className="menu-create-v2-start-grid">
              {MENU_CREATE_START_OPTIONS.map((option) => {
                const Icon = START_ICONS[option.id];
                const [eyebrow, title, description, action] = option.copy[uiLanguage] || option.copy.en;
                return (
                  <button type="button" key={option.id} className={`menu-create-v2-start-card mode-${option.id}`} onClick={() => chooseStart(option.id)}>
                    <div className="menu-create-v2-start-icon"><Icon size={22} /></div>
                    <span>{eyebrow}</span><h2>{title}</h2><p>{description}</p><strong>{action}<ForwardIcon size={15} /></strong>
                  </button>
                );
              })}
            </div>
            <div className="menu-create-v2-continuity"><Sparkles size={15} /><span><strong>{t.oneWorkspace}</strong> {t.continuity}</span></div>
          </section>
        ) : null}

        {screen === "website" ? (
          <section className="menu-create-v2-narrow">
            <div className="menu-create-v2-step-icon"><Link2 size={22} /></div>
            <span className="menu-create-v2-kicker">{t.websiteEyebrow}</span><h1>{t.websiteTitle}</h1><p>{t.websiteHint}</p>
            <label className="menu-create-v2-url-field"><span>{t.websiteLabel}</span><div><Globe2 size={18} /><input dir="ltr" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://yourrestaurant.com/menu" autoFocus /></div></label>
            {websiteError ? <div className="menu-create-v2-field-error">{websiteError}</div> : null}
            <div className="menu-create-v2-dev-note"><strong>{t.devNote}</strong><span>{t.devWebsite}</span></div>
            <button type="button" className="menu-create-v2-primary" onClick={validateWebsiteAndContinue} disabled={!websiteUrl.trim()}>{t.continueFit} <ForwardIcon size={16} /></button>
          </section>
        ) : null}

        {screen === "questions" ? (
          <section className="menu-create-v2-question">
            <div className="menu-create-v2-question-heading"><span>{questionEyebrow}</span><h1>{questionTitle}</h1><p>{questionHint}</p></div>
            <div className={`menu-create-v2-answer-grid count-${currentQuestion.options.length}`}>
              {currentQuestion.options.map(([value, copies]) => {
                const selected = answers[currentQuestion.id] === value;
                const [title, text] = copies[uiLanguage] || copies.en;
                return <button type="button" key={value} className={selected ? "selected" : ""} onClick={() => chooseAnswer(value)}><span className="menu-create-v2-answer-check">{selected ? <Check size={14} /> : null}</span><strong>{title}</strong><p>{text}</p></button>;
              })}
            </div>
            <div className="menu-create-v2-question-foot">
              <div className="menu-create-v2-dots">{MENU_CREATE_QUESTIONS.map((question, index) => <span key={question.id} className={index === questionIndex ? "active" : index < questionIndex ? "done" : ""} />)}</div>
              <span>{t.chooseOne}</span>
            </div>
          </section>
        ) : null}

        {screen === "recommendations" ? (
          <section className="menu-create-v2-recommendations">
            <div className="menu-create-v2-heading compact"><span><Sparkles size={14} /> {t.matchesEyebrow}</span><h1>{t.matchesTitle}</h1><p>{t.matchesHint}</p></div>
            <div className="menu-create-v2-design-grid">
              {recommendations.map((entry, index) => (
                <article key={entry.id} className={index === 0 ? "best" : ""}>
                  <div className="menu-create-v2-design-preview"><MiniMenuPreview entry={entry} /><span className="menu-create-v2-fit"><strong>{entry.score}%</strong> {t.fitWord}</span>{index === 0 ? <span className="menu-create-v2-best-badge">{t.bestMatch}</span> : null}</div>
                  <div className="menu-create-v2-design-copy"><span>{t.direction} · {entry.layout}</span><h2>{entry.name}</h2><p>{recommendationReason(entry, answers, t)}</p><div className="menu-create-v2-swatches">{(entry.swatches || []).map((color) => <i key={color} style={{ background: color }} />)}</div><button type="button" onClick={() => selectDesign(entry)}>{t.startDesign} <ForwardIcon size={15} /></button></div>
                </article>
              ))}
            </div>
            <button type="button" className="menu-create-v2-secondary-link" onClick={() => window.location.assign(`/dev/menu-content-v2?guided=1&mode=manual&ui=${uiLanguage}`)}>{t.skip}</button>
          </section>
        ) : null}

        {screen === "concierge" ? (
          <section className="menu-create-v2-concierge">
            <div className="menu-create-v2-heading compact"><span>{t.conciergeEyebrow}</span><h1>{t.conciergeTitle}</h1><p>{t.conciergeHint}</p></div>
            <form onSubmit={prepareConciergeRequest}>
              <label><span>{t.restaurantName}</span><input required value={concierge.restaurant} onChange={(event) => setConcierge((current) => ({ ...current, restaurant: event.target.value }))} placeholder={t.restaurantName} /></label>
              <label><span>{t.websiteLink}</span><input dir="ltr" value={concierge.website} onChange={(event) => setConcierge((current) => ({ ...current, website: event.target.value }))} placeholder="https://..." /></label>
              <label className="wide"><span>{t.know}</span><textarea value={concierge.notes} onChange={(event) => setConcierge((current) => ({ ...current, notes: event.target.value }))} placeholder={t.notesPlaceholder} /></label>
              <div className="menu-create-v2-concierge-actions"><div><HeartHandshake size={18} /><span><strong>{t.doneForYou}</strong><small>{t.queueNote}</small></span></div><button type="submit" className="menu-create-v2-primary">{t.prepare} <ForwardIcon size={16} /></button></div>
            </form>
            {requestPrepared ? <div className="menu-create-v2-request-ready"><Check size={17} /><span><strong>{t.requestReady}</strong> {t.requestReadyHint}</span></div> : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
