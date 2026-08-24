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
import "./components/BeyondMenuPlatform.css";
import "./components/BeyondLiveMenuDesign.css";


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BeyondLanguageProvider>
      <BeyondAutoTranslate />

      <BeyondMenuRoute
        fallback={<App />}
      />

      <BeyondLiveMenuDesignPortal />
    </BeyondLanguageProvider>
  </StrictMode>,
)
