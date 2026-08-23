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
import MenuBuilder from "./pages/MenuBuilderUnified";
import MenuMobilePreviewPage from "./pages/MenuMobilePreviewPage";
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MenuHome />} />
        <Route path="/3DPRINTING" element={<ThreeDPrinting />} />
        <Route path="/menu-builder" element={<MenuBuilder />} />
        <Route path="/menu-mobile-preview" element={<MenuMobilePreviewPage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/order/:id" element={<OrderDetails />} />
        <Route path="/track" element={<TrackOrder />} />
      </Routes>
      <CustomerShowcasePortal />
    </BrowserRouter>
  );
}

export default App;
