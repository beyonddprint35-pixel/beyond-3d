import { useEffect, useState } from "react";
import "./MenuStudioHomeReturn.css";

const LABELS = {
  en: "Back to Beyond",
  he: "חזרה ל-Beyond",
  ar: "العودة إلى Beyond",
};

export default function MenuStudioHomeReturn() {
  const isMenuStudio = window.location.pathname.startsWith("/dev/menu-studio-v3-draft");
  const [language, setLanguage] = useState("en");
  const [rtl, setRtl] = useState(false);

  useEffect(() => {
    if (!isMenuStudio) return undefined;

    const shell = document.querySelector(".studio-v3-shell");
    if (!shell) return undefined;

    const syncFromStudio = () => {
      setLanguage(shell.getAttribute("lang") || "en");
      setRtl(shell.getAttribute("dir") === "rtl");
    };

    syncFromStudio();
    const observer = new MutationObserver(syncFromStudio);
    observer.observe(shell, { attributes: true, attributeFilter: ["lang", "dir"] });

    return () => observer.disconnect();
  }, [isMenuStudio]);

  if (!isMenuStudio) return null;

  return (
    <a
      className={`studio-home-return ${rtl ? "rtl" : "ltr"}`}
      href="/"
      aria-label={LABELS[language] || LABELS.en}
    >
      <span className="studio-home-return-icon" aria-hidden="true">
        {rtl ? "→" : "←"}
      </span>
      <span className="studio-home-return-label">{LABELS[language] || LABELS.en}</span>
    </a>
  );
}
