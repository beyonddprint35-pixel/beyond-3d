import { useEffect } from "react";

import Home from "./Home";
import "./ThreeDPrinting.css";
import "./ThreeDPrintingNavCleanup.css";

function ensureSharedThemeDefault() {
  if (typeof window === "undefined") return;

  try {
    const storedTheme = window.localStorage.getItem("beyond-theme");

    if (storedTheme !== "light" && storedTheme !== "dark") {
      window.localStorage.setItem("beyond-theme", "light");
    }
  } catch {
    // The page can still render if local storage is unavailable.
  }
}

export default function ThreeDPrinting() {
  ensureSharedThemeDefault();

  useEffect(() => {
    const page = document.querySelector(".three-d-printing-page");
    const brand = page?.querySelector(".home-brand");
    const homeMenuButton = page?.querySelector(
      ".home-nav-links > button:first-child"
    );

    if (homeMenuButton instanceof HTMLButtonElement) {
      homeMenuButton.textContent = "Home";
    }

    function goHome(event) {
      event.preventDefault();
      event.stopPropagation();
      window.location.assign("/");
    }

    brand?.addEventListener("click", goHome, true);
    homeMenuButton?.addEventListener("click", goHome, true);

    return () => {
      brand?.removeEventListener("click", goHome, true);
      homeMenuButton?.removeEventListener("click", goHome, true);
    };
  }, []);

  return (
    <div className="three-d-printing-page">
      <style>{`
        .three-d-printing-page .digital-menu-hero {
          display: none !important;
        }
      `}</style>
      <Home />
    </div>
  );
}
