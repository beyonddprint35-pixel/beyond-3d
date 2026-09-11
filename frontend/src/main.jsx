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
import LegacyPublicMenuAnalytics from "./features/menu-engine/analytics/LegacyPublicMenuAnalytics";
import installMenuTypographyGuard from "./features/menu-engine/renderer/menuTypographyGuard";
import installUiTypographyGuard from "./styles/uiTypographyGuard";
import installMenuContentAdvancedAlwaysOpen from "./features/menu-engine/studio/menuContentAdvancedAlwaysOpen";
import installMenuContentCategoryAccordion from "./pages/menuContentCategoryAccordion";
import installMenuContentPreviewSelection from "./pages/menuContentPreviewSelection";
import installMenuTranslationReviewOverlay from "./pages/menuTranslationReviewOverlay";
import installMenuStudioViewportLock from "./pages/menuStudioViewportLock";
import installMenuAiOnlineReferenceOverlay from "./pages/menuAiOnlineReferenceOverlay";
import installMenuAiImageViewerOverlay from "./pages/menuAiImageViewerOverlay";
import installMenuAiMenuCropOverlay from "./pages/menuAiMenuCropOverlay";
import installMenuLiveImageFraming from "./pages/menuLiveImageFraming";
import installMenuPublishShareActions from "./pages/menuPublishShareActions";
import "./components/BeyondMenuPlatform.css";
import "./components/BeyondLiveMenuDesign.css";
import "./components/BeyondLiveMenuDesignMobilePatch.css";
import "./pages/MenuStudioV3Controls.css";
import "./pages/MenuContentStudioV2FinalPolish.css";
import "./pages/MenuContentStudioV2FinishingPolish.css";
import "./pages/MenuContentStudioV2DarkModeFix.css";
import "./pages/MenuAiDishImagesV1DarkFix.css";
import "./pages/menuAiImageViewerOverlay.css";
import "./pages/menuStudioViewportLock.css";
import "./pages/menuStudioDarkModeRegulation.css";
import "./features/menu-engine/renderer/menuTypographyGuard.css";
import "./features/menu-engine/renderer/menuViewportFill.css";
import "./styles/uiTypographyGuard.css";
import "./pages/MenuDesignStudioMobileWorkspace.css";

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch(() => {});
  if ("caches" in window) {
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch(() => {});
  }
}

installMenuTypographyGuard();
installUiTypographyGuard();
installMenuContentAdvancedAlwaysOpen();
installMenuContentCategoryAccordion();
installMenuContentPreviewSelection();
installMenuTranslationReviewOverlay();
installMenuStudioViewportLock();
installMenuAiOnlineReferenceOverlay();
installMenuAiImageViewerOverlay();
installMenuAiMenuCropOverlay();
installMenuLiveImageFraming();
installMenuPublishShareActions();

function BeyondRootRoute() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  // Public customer menus now belong to App's V3 route. That route reads the
  // immutable publication first and falls back to migrated legacy menus, so
  // both new Studio publications and existing QR URLs use the same resilient
  // public-menu loader. Keep BeyondMenuRoute for its remaining legacy/admin
  // entry points only.
  if (path.startsWith("/menu/")) {
    return <App />;
  }

  return <BeyondMenuRoute fallback={<App />} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BeyondLanguageProvider>
      <BeyondAutoTranslate />
      <BeyondRootRoute />
      <LegacyPublicMenuAnalytics />
      <MenuStudioHomeReturn />
      <BeyondLiveMenuDesignPortal />
    </BeyondLanguageProvider>
  </StrictMode>,
)
