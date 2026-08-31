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
import MenuStudioV3RealData from "./pages/MenuStudioV3RealData";
import MenuStudioV3Draft from "./pages/MenuStudioV3Draft";
import MenuPublicV3Dev from "./pages/MenuPublicV3Dev";
import MenuCreateV2 from "./pages/MenuCreateV2";
import MenuImportStudioV2 from "./pages/MenuImportStudioV2";
import MenuContentStudioV2Entry from "./pages/MenuContentStudioV2Entry";
import MenuDesignStudioV2 from "./pages/MenuDesignStudioV2";
import MenuPreviewStudioV2 from "./pages/MenuPreviewStudioV2";
import MenuPublishStudioV2 from "./pages/MenuPublishStudioV2";
import MenuMyMenusV2 from "./pages/MenuMyMenusV2";
import MenuManageV2 from "./pages/MenuManageV2";
import MenuStudioV2PersistenceBoundary from "./features/menu-engine/studio/MenuStudioV2PersistenceBoundary";
import CustomerShowcasePortal from "./components/CustomerShowcasePortal";

import "./components/MyAccountAdminShortcut.js";
import "./components/MyAccountAdminShortcut.css";
import "./components/MyAccountMenuStudioShortcut.js";
import "./components/MyAccountMenuStudioShortcut.css";
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
import "./pages/MenuStudioV2TypeSystem.css";
import "./pages/MenuContentStudioV2Drag.css";

function PersistentStudio({ children }) {
  return <MenuStudioV2PersistenceBoundary>{children}</MenuStudioV2PersistenceBoundary>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MenuHome />} />
        <Route path="/3DPRINTING" element={<ThreeDPrinting />} />
        <Route path="/menu-builder" element={<MenuBuilder />} />
        <Route path="/menu-mobile-preview" element={<MenuMobilePreviewPage />} />
        <Route path="/my-menus" element={<MenuMyMenusV2 />} />
        <Route path="/my-menus/:projectId" element={<MenuManageV2 />} />
        {import.meta.env.DEV ? (
          <>
            <Route path="/dev/menu-engine-v3" element={<MenuEngineV3Dev />} />
            <Route path="/dev/menu-studio-v3" element={<MenuStudioV3Dev />} />
            <Route path="/dev/menu-studio-v3-real" element={<MenuStudioV3RealData />} />
            <Route path="/dev/menu-studio-v3-draft" element={<MenuStudioV3Draft />} />
            <Route path="/dev/menu-public-v3/:slug" element={<MenuPublicV3Dev />} />
            <Route path="/dev/my-menus-v2" element={<MenuMyMenusV2 />} />
            <Route path="/dev/menu-manage-v2/:projectId" element={<MenuManageV2 />} />
            <Route path="/dev/menu-create-v2" element={<MenuCreateV2 />} />
            <Route path="/dev/menu-import-v2" element={<MenuImportStudioV2 />} />
            <Route path="/dev/menu-content-v2" element={<PersistentStudio><MenuContentStudioV2Entry /></PersistentStudio>} />
            <Route path="/dev/menu-design-v2" element={<PersistentStudio><MenuDesignStudioV2 /></PersistentStudio>} />
            <Route path="/dev/menu-preview-v2" element={<PersistentStudio><MenuPreviewStudioV2 /></PersistentStudio>} />
            <Route path="/dev/menu-publish-v2" element={<PersistentStudio><MenuPublishStudioV2 /></PersistentStudio>} />
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
