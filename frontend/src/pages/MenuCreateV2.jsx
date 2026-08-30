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
import { PREMIUM_MENU_DESIGNS } from "../features/menu-engine/domain/menuDesignLibrary";
import "./MenuCreateV2.css";

const FLOW_STORAGE_KEY = "beyond-menu-create-profile-v2";
const DESIGN_STORAGE_KEY = "beyond-menu-recommended-design-v2";

const START_OPTIONS = [
  {
    id: "upload",
    eyebrow: "FASTEST",
    title: "Upload my current menu",
    description: "Upload a PDF, photos or screenshots. BEYOND will structure the content for you.",
    icon: FileUp,
    action: "Upload menu",
  },
  {
    id: "website",
    eyebrow: "IMPORT",
    title: "Import from my website",
    description: "Give us the URL of your current restaurant or menu page so we can reuse what already exists.",
    icon: Globe2,
    action: "Add website link",
  },
  {
    id: "manual",
    eyebrow: "FULL CONTROL",
    title: "Build it myself",
    description: "Start with a clean menu, add categories and items yourself, and let BEYOND guide the design direction.",
    icon: PencilLine,
    action: "Build manually",
  },
  {
    id: "concierge",
    eyebrow: "DONE FOR YOU",
    title: "Build it for me",
    description: "Send BEYOND whatever you have. We will prepare the menu and return a polished draft for you to review.",
    icon: HeartHandshake,
    action: "Request a build",
  },
];

const QUESTIONS = [
  {
    id: "venue",
    eyebrow: "01 / YOUR PLACE",
    title: "What kind of place are you creating this menu for?",
    hint: "This helps us understand the browsing rhythm your customers need.",
    options: [
      { value: "restaurant", title: "Restaurant", text: "A broad food menu with a balanced customer journey." },
      { value: "cafe", title: "Café / Brunch", text: "Coffee, breakfast, pastry and casual daytime browsing." },
      { value: "bar", title: "Bar / Nightlife", text: "Drinks, cocktails, wine or a late-night experience." },
      { value: "bakery", title: "Bakery", text: "Warm, friendly and product-led with visual browsing." },
      { value: "casual", title: "Fast casual", text: "Quick decisions, bold categories and easy ordering." },
      { value: "fine", title: "Fine dining", text: "Refined pacing, premium typography and more restraint." },
    ],
  },
  {
    id: "feeling",
    eyebrow: "02 / FEELING",
    title: "How should the menu feel?",
    hint: "Choose the impression you want before we talk about colors and fonts.",
    options: [
      { value: "premium", title: "Premium & elegant", text: "Quiet confidence, refined type and sophisticated spacing." },
      { value: "modern", title: "Modern & clean", text: "Simple hierarchy, crisp surfaces and contemporary rhythm." },
      { value: "bold", title: "Bold & energetic", text: "Strong type, punchy blocks and high visual energy." },
      { value: "warm", title: "Warm & traditional", text: "Hospitality, familiar structure and tactile character." },
      { value: "playful", title: "Friendly & playful", text: "Soft shapes, approachable cards and visual personality." },
      { value: "minimal", title: "Minimal & editorial", text: "Less decoration, more typography and breathing room." },
    ],
  },
  {
    id: "photos",
    eyebrow: "03 / PHOTOGRAPHY",
    title: "How much should food photography lead the experience?",
    hint: "We will prioritize designs that naturally support the amount of imagery you want.",
    options: [
      { value: "photo-first", title: "Photo-first", text: "Images should be a major part of browsing and discovery." },
      { value: "some", title: "Some photos", text: "Use images selectively while keeping the menu easy to scan." },
      { value: "none", title: "Mostly typography", text: "Let names, descriptions and prices do most of the work." },
    ],
  },
  {
    id: "menuSize",
    eyebrow: "04 / MENU SIZE",
    title: "How large is the menu?",
    hint: "Dense menus need a different layout system than a short curated menu.",
    options: [
      { value: "small", title: "Small", text: "Up to roughly 20 items. Curated and easy to explore." },
      { value: "medium", title: "Medium", text: "Around 20–60 items across several categories." },
      { value: "large", title: "Large", text: "A deep menu, drinks list or many categories and variants." },
    ],
  },
  {
    id: "service",
    eyebrow: "05 / CUSTOMER BEHAVIOR",
    title: "What should customers be able to do quickly?",
    hint: "We use this to choose the right navigation and content density.",
    options: [
      { value: "fast", title: "Order quickly", text: "Get to categories and prices with as little friction as possible." },
      { value: "browse", title: "Browse & discover", text: "Encourage customers to explore photos, dishes and sections." },
      { value: "premium", title: "Enjoy the experience", text: "Slow the pace and make the menu feel more considered." },
      { value: "drinks", title: "Compare drinks & prices", text: "Make long drink lists, pours and bottle prices easy to scan." },
    ],
  },
  {
    id: "branding",
    eyebrow: "06 / BRAND",
    title: "How much branding do you already have?",
    hint: "Nothing is required. This only tells Studio how much guidance to give you next.",
    options: [
      { value: "full", title: "Logo + brand colors", text: "I already have a visual identity I want the menu to follow." },
      { value: "logo", title: "Logo only", text: "Keep my logo, but help me build the rest of the visual system." },
      { value: "none", title: "Starting from scratch", text: "I want BEYOND to help establish the entire menu direction." },
    ],
  },
];

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
    const tags = optionMap[selected] || [];
    tags.forEach((tag) => {
      if (haystack.includes(tag.toLowerCase())) {
        score += question === "venue" || question === "feeling" ? 8 : 5;
        matches += 1;
      }
    });
  });

  if (answers.branding === "none" && /friendly|modern|minimal|classic/.test(haystack)) score += 2;
  if (answers.branding === "full" && /minimal|editorial|gallery|split/.test(haystack)) score += 2;

  return {
    score: Math.min(98, Math.max(62, score)),
    matches,
  };
}

function recommendationReason(entry, answers) {
  const reasons = [];
  const text = searchableDesignText(entry);

  if (answers.feeling === "premium" && /luxury|editorial|fine dining|premium/.test(text)) reasons.push("matches your premium direction");
  if (answers.feeling === "warm" && /warm|heritage|classic|bistro/.test(text)) reasons.push("keeps the experience warm and familiar");
  if (answers.feeling === "bold" && /bold|street|tiles/.test(text)) reasons.push("supports a faster, more energetic menu");
  if (answers.photos === "photo-first" && /photo|gallery|visual|split|tiles/.test(text)) reasons.push("gives photography a strong role");
  if (answers.photos === "none" && /editorial|ledger|minimal|classic/.test(text)) reasons.push("stays strong without relying on photography");
  if (answers.menuSize === "large" && /ledger|dense|wine|classic/.test(text)) reasons.push("handles a larger menu efficiently");
  if (answers.service === "drinks" && /bar|wine|cocktail|ledger|drinks/.test(text)) reasons.push("makes drinks and prices easier to compare");
  if (answers.venue === "cafe" && /cafe|brunch|bakery|friendly/.test(text)) reasons.push("fits a casual daytime customer journey");

  if (!reasons.length) return entry.description;
  return `${entry.name} ${reasons.slice(0, 2).join(" and ")}.`;
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
        <article><i /><div><b /><span /></div><em /></article>
        <article><i /><div><b /><span /></div><em /></article>
        <article><i /><div><b /><span /></div><em /></article>
      </div>
    </div>
  );
}

function Progress({ screen, questionIndex }) {
  const fitActive = screen === "questions" || screen === "recommendations";
  const designsActive = screen === "recommendations";
  const fitLabel = screen === "questions" ? `${questionIndex + 1} / ${QUESTIONS.length}` : "Fit";

  return (
    <div className="menu-create-v2-progress" aria-label="Menu creation progress">
      <span className="done"><Check size={12} /> Start</span>
      <i />
      <span className={fitActive ? "active" : ""}>{fitLabel}</span>
      <i />
      <span className={designsActive ? "active" : ""}>Designs</span>
    </div>
  );
}

export default function MenuCreateV2() {
  const [screen, setScreen] = useState("start");
  const [mode, setMode] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [concierge, setConcierge] = useState({ restaurant: "", website: "", notes: "" });
  const [requestPrepared, setRequestPrepared] = useState(false);

  const recommendations = useMemo(() => {
    return PREMIUM_MENU_DESIGNS
      .map((entry) => ({ ...entry, ...scoreDesign(entry, answers) }))
      .sort((a, b) => b.score - a.score || b.matches - a.matches)
      .slice(0, 3);
  }, [answers]);

  const currentQuestion = QUESTIONS[questionIndex];

  function persistFlow(nextMode = mode, extra = {}) {
    const payload = {
      mode: nextMode,
      answers,
      websiteUrl,
      createdAt: new Date().toISOString(),
      ...extra,
    };
    try {
      window.sessionStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }

  function chooseStart(nextMode) {
    setMode(nextMode);
    if (nextMode === "upload") {
      persistFlow(nextMode);
      window.location.assign("/menu-builder?guided=1&source=upload");
      return;
    }
    if (nextMode === "website") {
      setScreen("website");
      return;
    }
    if (nextMode === "concierge") {
      setScreen("concierge");
      return;
    }
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
      setWebsiteError("Enter a full website address, for example https://restaurant.com/menu");
    }
  }

  function chooseAnswer(value) {
    const nextAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(nextAnswers);
    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex((current) => current + 1);
      return;
    }
    try {
      window.sessionStorage.setItem(
        FLOW_STORAGE_KEY,
        JSON.stringify({ mode, answers: nextAnswers, websiteUrl, createdAt: new Date().toISOString() }),
      );
    } catch {
      // Storage may be unavailable.
    }
    setScreen("recommendations");
  }

  function goBack() {
    if (screen === "start") {
      window.location.assign("/");
      return;
    }
    if (screen === "questions" && questionIndex > 0) {
      setQuestionIndex((current) => current - 1);
      return;
    }
    if (screen === "recommendations") {
      setQuestionIndex(QUESTIONS.length - 1);
      setScreen("questions");
      return;
    }
    setScreen("start");
  }

  function selectDesign(entry) {
    persistFlow(mode, { recommendedDesignId: entry.id, recommendedDesignName: entry.name });
    try {
      window.sessionStorage.setItem(DESIGN_STORAGE_KEY, entry.id);
    } catch {
      // Storage may be unavailable.
    }

    const params = new URLSearchParams({
      guided: "1",
      mode: mode || "manual",
      design: entry.id,
    });
    if (websiteUrl.trim()) params.set("website", websiteUrl.trim());
    window.location.assign(`/dev/menu-content-v2?${params.toString()}`);
  }

  function prepareConciergeRequest(event) {
    event.preventDefault();
    const draft = { ...concierge, mode: "concierge", createdAt: new Date().toISOString() };
    try {
      window.sessionStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Storage may be unavailable.
    }
    setRequestPrepared(true);
  }

  return (
    <main className="menu-create-v2">
      <header className="menu-create-v2-topbar">
        <button type="button" className="menu-create-v2-brand" onClick={() => window.location.assign("/")}>
          <img src={beyondLogo} alt="" />
          <span><strong>Beyond</strong><small>Menu Studio</small></span>
        </button>

        <Progress screen={screen} questionIndex={questionIndex} />

        <button type="button" className="menu-create-v2-exit" onClick={() => window.location.assign("/")}>Exit</button>
      </header>

      <div className="menu-create-v2-shell">
        {screen !== "start" ? (
          <button type="button" className="menu-create-v2-back" onClick={goBack}>
            <ArrowLeft size={16} /> Back
          </button>
        ) : null}

        {screen === "start" ? (
          <section className="menu-create-v2-start">
            <div className="menu-create-v2-heading">
              <span>CREATE A MENU</span>
              <h1>How would you like to start?</h1>
              <p>Bring what you already have, start from scratch, or let BEYOND do the setup for you. You can refine everything later in the same Studio.</p>
            </div>

            <div className="menu-create-v2-start-grid">
              {START_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button type="button" key={option.id} className={`menu-create-v2-start-card mode-${option.id}`} onClick={() => chooseStart(option.id)}>
                    <div className="menu-create-v2-start-icon"><Icon size={22} /></div>
                    <span>{option.eyebrow}</span>
                    <h2>{option.title}</h2>
                    <p>{option.description}</p>
                    <strong>{option.action}<ArrowRight size={15} /></strong>
                  </button>
                );
              })}
            </div>

            <div className="menu-create-v2-continuity">
              <Sparkles size={15} />
              <span><strong>One workspace.</strong> Your content, design, preview and publishing stay together from the first step.</span>
            </div>
          </section>
        ) : null}

        {screen === "website" ? (
          <section className="menu-create-v2-narrow">
            <div className="menu-create-v2-step-icon"><Link2 size={22} /></div>
            <span className="menu-create-v2-kicker">IMPORT FROM WEBSITE</span>
            <h1>Where does your current menu live?</h1>
            <p>Paste the restaurant website or direct menu page. We’ll keep this source with your creation brief and use it when the website importer is connected to the Content Studio.</p>

            <label className="menu-create-v2-url-field">
              <span>Website or menu URL</span>
              <div><Globe2 size={18} /><input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://yourrestaurant.com/menu" autoFocus /></div>
            </label>
            {websiteError ? <div className="menu-create-v2-field-error">{websiteError}</div> : null}

            <div className="menu-create-v2-dev-note">
              <strong>Development note</strong>
              <span>The UI path is ready. The scraper/import backend is the next connection; this version does not pretend a URL has already been imported.</span>
            </div>

            <button type="button" className="menu-create-v2-primary" onClick={validateWebsiteAndContinue} disabled={!websiteUrl.trim()}>
              Continue to menu fit <ArrowRight size={16} />
            </button>
          </section>
        ) : null}

        {screen === "questions" ? (
          <section className="menu-create-v2-question">
            <div className="menu-create-v2-question-heading">
              <span>{currentQuestion.eyebrow}</span>
              <h1>{currentQuestion.title}</h1>
              <p>{currentQuestion.hint}</p>
            </div>

            <div className={`menu-create-v2-answer-grid count-${currentQuestion.options.length}`}>
              {currentQuestion.options.map((option) => {
                const selected = answers[currentQuestion.id] === option.value;
                return (
                  <button type="button" key={option.value} className={selected ? "selected" : ""} onClick={() => chooseAnswer(option.value)}>
                    <span className="menu-create-v2-answer-check">{selected ? <Check size={14} /> : null}</span>
                    <strong>{option.title}</strong>
                    <p>{option.text}</p>
                  </button>
                );
              })}
            </div>

            <div className="menu-create-v2-question-foot">
              <div className="menu-create-v2-dots">
                {QUESTIONS.map((question, index) => <span key={question.id} className={index === questionIndex ? "active" : index < questionIndex ? "done" : ""} />)}
              </div>
              <span>Choose one answer to continue</span>
            </div>
          </section>
        ) : null}

        {screen === "recommendations" ? (
          <section className="menu-create-v2-recommendations">
            <div className="menu-create-v2-heading compact">
              <span><Sparkles size={14} /> YOUR BEST MATCHES</span>
              <h1>We found three designs that fit your menu.</h1>
              <p>These are real designs from the same library used inside Design Studio. Pick a strong starting point—you can still change every design later.</p>
            </div>

            <div className="menu-create-v2-design-grid">
              {recommendations.map((entry, index) => (
                <article key={entry.id} className={index === 0 ? "best" : ""}>
                  <div className="menu-create-v2-design-preview">
                    <MiniMenuPreview entry={entry} />
                    <span className="menu-create-v2-fit"><strong>{entry.score}%</strong> fit</span>
                    {index === 0 ? <span className="menu-create-v2-best-badge">Best match</span> : null}
                  </div>
                  <div className="menu-create-v2-design-copy">
                    <span>{entry.category} · {entry.layout}</span>
                    <h2>{entry.name}</h2>
                    <p>{recommendationReason(entry, answers)}</p>
                    <div className="menu-create-v2-swatches">{(entry.swatches || []).map((color) => <i key={color} style={{ background: color }} />)}</div>
                    <button type="button" onClick={() => selectDesign(entry)}>Start with this design <ArrowRight size={15} /></button>
                  </div>
                </article>
              ))}
            </div>

            <button type="button" className="menu-create-v2-secondary-link" onClick={() => window.location.assign("/dev/menu-content-v2?guided=1&mode=manual")}>Skip recommendations and start clean</button>
          </section>
        ) : null}

        {screen === "concierge" ? (
          <section className="menu-create-v2-concierge">
            <div className="menu-create-v2-heading compact">
              <span>BEYOND CONCIERGE</span>
              <h1>Give us what you have. We’ll take it from here.</h1>
              <p>Prepare a menu-build request with your restaurant details, current website and any notes. During development we save this request draft locally; the submission workflow will be connected before release.</p>
            </div>

            <form onSubmit={prepareConciergeRequest}>
              <label><span>Restaurant name</span><input required value={concierge.restaurant} onChange={(event) => setConcierge((current) => ({ ...current, restaurant: event.target.value }))} placeholder="Restaurant name" /></label>
              <label><span>Website / Instagram / menu link</span><input value={concierge.website} onChange={(event) => setConcierge((current) => ({ ...current, website: event.target.value }))} placeholder="https://..." /></label>
              <label className="wide"><span>What should we know?</span><textarea value={concierge.notes} onChange={(event) => setConcierge((current) => ({ ...current, notes: event.target.value }))} placeholder="Languages, menu size, style, launch date, special requirements..." /></label>
              <div className="menu-create-v2-concierge-actions">
                <div><HeartHandshake size={18} /><span><strong>Done-for-you path</strong><small>We’ll connect this to the real request queue before production.</small></span></div>
                <button type="submit" className="menu-create-v2-primary">Prepare request <ArrowRight size={16} /></button>
              </div>
            </form>

            {requestPrepared ? <div className="menu-create-v2-request-ready"><Check size={17} /><span><strong>Request draft prepared.</strong> It is saved for this development session. The production submission step is intentionally not faked.</span></div> : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
