import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import MenuHome from "./pages/MenuHomeCustomerPreview";
import ThreeDPrinting from "./pages/ThreeDPrinting";
import Admin from "./pages/AdminWithPricing";
import OrderDetails from "./pages/OrderDetails";
import TrackOrder from "./pages/TrackOrder";
import MenuBuilder from "./pages/MenuBuilderStable";
import MenuMobilePreviewPage from "./pages/MenuMobilePreviewPage";
import MenuEngineV3Dev from "./pages/MenuEngineV3Dev";
import MenuStudioV3Dev from "./pages/MenuStudioV3Dev";
import CustomerShowcasePortal from "./components/CustomerShowcasePortal";

import "./components/MyAccountAdminShortcut.js";
import "./components/MyAccountAdminShortcut.css";
import "./components/MyAccountLightMode.css";
import "./components/MyAccountMenuDraftDelete.js";
import "./components/MyAccountMenuDraftDelete.css";
import "./components/AuthModalSimplified.css";
import "./pages/MenuHomeAccessInteraction.js";
import "./pages/MenuHomeOverrides.css";
import "./pages/MenuHomeFinalPatch.css";
import "./pages/MenuHomeWordmark.css";
import "./pages/MenuHomeDarkGlow.css";
import "./pages/MenuHomeAccessRealism.css";
import "./pages/MenuHomeAccessInteraction.css";
import "./pages/MenuHomeNavCleanup.css";
import "./pages/MenuHomeNavStructure.js";
import "./pages/AdminTheme.js";
import "./pages/AdminTheme.css";
import "./components/DigitalMenuLayoutsMobileFix.css";
import "./components/DigitalMenuFitMode.css";
import "./components/MenuBuilderMobileUX.css";
import "./components/MenuBuilderMobileOverflowFix.css";
import "./components/DigitalMenuFitSmartGuard.js";
import "./components/DigitalMenuFitSmartGuard.css";
import "./pages/MenuHomeMobilePhoneFrameFix.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MenuHome />} />
        <Route path="/3DPRINTING" element={<ThreeDPrinting />} />
        <Route path="/menu-builder" element={<MenuBuilder />} />
        <Route path="/menu-mobile-preview" element={<MenuMobilePreviewPage />} />
        {import.meta.env.DEV ? (
          <>
            <Route path="/dev/menu-engine-v3" element={<MenuEngineV3Dev />} />
            <Route path="/dev/menu-studio-v3" element={<MenuStudioV3Dev />} />
          </>
        ) : null}
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/order/:id" element={<OrderDetails />} />
        <Route path="/track" element={<TrackOrder />} />
      </Routes>
      <CustomerShowcasePortal />
    </BrowserRouter>
  );
}

export default App;
