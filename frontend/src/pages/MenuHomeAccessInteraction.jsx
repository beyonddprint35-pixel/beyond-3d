import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Radio, Sparkles } from "lucide-react";

import "./MenuHomeAccessInteraction.css";

export default function MenuHomeAccessInteraction() {
  const [stage, setStage] = useState(null);
  const [phone, setPhone] = useState(null);
  const [phase, setPhase] = useState("idle");
  const timers = useRef([]);

  function clearTimers() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }

  function runDemo() {
    clearTimers();
    setPhase("pulse");

    timers.current.push(
      window.setTimeout(() => setPhase("opening"), 520),
      window.setTimeout(() => setPhase("open"), 1180),
      window.setTimeout(() => setPhase("idle"), 5600)
    );
  }

  useEffect(() => {
    const currentStage = document.querySelector(".menu-home-access-preview");
    const currentStand = document.querySelector(".menu-home-table-stand");
    const currentPhone = document.querySelector(".menu-home-access-phone");

    if (!currentStage || !currentStand || !currentPhone) return undefined;

    setStage(currentStage);
    setPhone(currentPhone);

    currentStand.classList.add("menu-home-interactive-stand");
    currentStand.setAttribute("role", "button");
    currentStand.setAttribute("tabindex", "0");
    currentStand.setAttribute("aria-label", "Open the demo menu using QR or NFC");

    const activate = (event) => {
      if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
      if (event.type === "keydown") event.preventDefault();
      runDemo();
    };

    currentStand.addEventListener("click", activate);
    currentStand.addEventListener("keydown", activate);

    const initialTimer = window.setTimeout(runDemo, 1800);
    const interval = window.setInterval(runDemo, 9000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      clearTimers();
      currentStand.removeEventListener("click", activate);
      currentStand.removeEventListener("keydown", activate);
      currentStand.classList.remove("menu-home-interactive-stand");
      currentStand.removeAttribute("role");
      currentStand.removeAttribute("tabindex");
      currentStand.removeAttribute("aria-label");
    };
  }, []);

  useEffect(() => {
    if (!stage || !phone) return;

    const classes = ["is-demo-idle", "is-demo-pulse", "is-demo-opening", "is-demo-open"];
    stage.classList.remove(...classes);
    phone.classList.remove(...classes);

    const activeClass = `is-demo-${phase}`;
    stage.classList.add(activeClass);
    phone.classList.add(activeClass);
  }, [phase, stage, phone]);

  return (
    <>
      {stage && createPortal(
        <>
          <div className="menu-home-access-beam" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="menu-home-interaction-hint" aria-hidden="true">
            <Radio size={14} />
            <span>Tap the stand</span>
          </div>
        </>,
        stage
      )}

      {phone && createPortal(
        <div className="menu-home-phone-live-demo" aria-hidden="true">
          <div className="menu-home-phone-live-loading">
            <Sparkles size={17} />
            <strong>Opening menu…</strong>
          </div>

          <div className="menu-home-phone-live-menu">
            <div className="menu-home-phone-live-brand">
              <span>B</span>
              <div>
                <strong>BEYOND MENU</strong>
                <small>LIVE CUSTOMER MENU</small>
              </div>
            </div>

            <div className="menu-home-phone-live-tabs">
              <b>FOOD</b>
              <span>DRINKS</span>
              <span>DESSERTS</span>
            </div>

            <div className="menu-home-phone-live-item">
              <div><strong>Truffle Rigatoni</strong><small>Parmesan · black pepper</small></div>
              <b>₪68</b>
            </div>
            <div className="menu-home-phone-live-item">
              <div><strong>Sea Bass</strong><small>Lemon butter · herbs</small></div>
              <b>₪84</b>
            </div>

            <div className="menu-home-phone-live-success">
              <Check size={12} /> Opened instantly
            </div>
          </div>
        </div>,
        phone
      )}
    </>
  );
}
