import BeyondAutoTranslate from "./i18n/BeyondAutoTranslate";
import {
  BeyondLanguageProvider,
} from "./i18n/BeyondLanguage";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// BEYOND_MENU_PLATFORM_PHASE1
import { BeyondMenuRoute } from "./components/BeyondMenuPlatform";
import BeyondLiveMenuDesignPortal from "./components/BeyondLiveMenuDesignPortal";
import MenuStudioHomeReturn from "./components/MenuStudioHomeReturn";
import installMenuTypographyGuard from "./features/menu-engine/renderer/menuTypographyGuard";
import "./components/BeyondMenuPlatform.css";
import "./components/BeyondLiveMenuDesign.css";
import "./components/BeyondLiveMenuDesignMobilePatch.css";
import "./pages/MenuStudioV3Controls.css";
import "./features/menu-engine/renderer/menuTypographyGuard.css";

// Development must never be controlled by a previously-installed service worker.
// The app currently has no /sw-menu.js asset, so registering it here only creates
// failed requests and can leave stale browser state on long-lived preview origins.
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch(() => {});

  if ("caches" in window) {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {});
  }
}

installMenuTypographyGuard();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BeyondLanguageProvider>
      <BeyondAutoTranslate />

      <BeyondMenuRoute
        fallback={<App />}
      />

      <MenuStudioHomeReturn />
      <BeyondLiveMenuDesignPortal />
    </BeyondLanguageProvider>
  </StrictMode>,
)
