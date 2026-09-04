import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";

import MenuHome from "./pages/MenuHomeCustomerPreview";
import ThreeDPrinting from "./pages/ThreeDPrinting";
import Admin from "./pages/AdminWithPricing";
import OrderDetails from "./pages/OrderDetails";
import TrackOrder from "./pages/TrackOrder";
import LegacyMenuBuilder from "./pages/MenuBuilderStable";
import MenuMobilePreviewPage from "./pages/MenuMobilePreviewPage";
import MenuEngineV3Dev from "./pages/MenuEngineV3Dev";
import MenuStudioV3Dev from "./pages/MenuStudioV3Dev";
import MenuStudioV3RealData from "./pages/MenuStudioV3RealData";
import MenuStudioV3Draft from "./pages/MenuStudioV3Draft";
import MenuPublicV3Dev from "./pages/MenuPublicV3Dev";
import MenuCreateV2 from "./pages/MenuCreateV2";
import MenuImportStudioV2 from "./pages/MenuImportStudioV2";
import MenuImportReviewV2 from "./pages/MenuImportReviewV2";
import MenuContentStudioV2Entry from "./pages/MenuContentStudioV2Entry";
import MenuAiDishImagesV1 from "./pages/MenuAiDishImagesV1";
import MenuDesignStudioV2 from "./pages/MenuDesignStudioV2";
import MenuPreviewStudioV2 from "./pages/MenuPreviewStudioV2";
import MenuPublishStudioV2 from "./pages/MenuPublishStudioV2";
import MenuStudioEntry from "./pages/MenuStudioEntry";
import MenuAnalyticsStudioV2 from "./pages/MenuAnalyticsStudioV2";
import MenuStudioV2PersistenceBoundary from "./features/menu-engine/studio/MenuStudioV2PersistenceBoundary";
import MenuStudioWorkspace from "./features/menu-engine/studio/MenuStudioWorkspace";
import MenuStudioMobileStageNav from "./components/MenuStudioMobileStageNav";
import MenuSubscriptionPublishGate from "./components/MenuSubscriptionPublishGate";
import CustomerShowcasePortal from "./components/CustomerShowcasePortal";

import "./lib/beyondThemeBootstrap.js";
import "./components/MyAccountAdminShortcut.js";
import "./components/MyAccountAdminShortcut.css";
import "./components/MyAccountMenuStudioShortcut.js";
import "./components/MyAccountMenuStudioShortcut.css";
import "./components/MyAccountLightMode.css";
import "./components/MyAccountMenuDraftDelete.js";
import "./components/MyAccountMenuDraftDelete.css";
import "./components/AuthModalSimplified.css";
import "./components/AuthPricingDeferred.css";
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
import "./pages/MenuStudioHomeTheme.css";
import "./pages/MenuStudioHomeThemeComponents.css";
import "./pages/MenuContentStudioV2Mobile.css";
import "./pages/MenuStudioStageNavStability.css";
import "./pages/MenuStudioEnglishLTR.css";
import "./components/MenuStudioHeader.css";
import "./pages/MenuStudioDarkMode.css";
import "./pages/MenuAiDishImagesV1StyleLock.css";
import "./features/menu-engine/studio/MenuDesignDarkModePolish.css";
import "./features/menu-engine/renderer/menuHeritageDesignControlsFix.css";

function LegacyStudioRedirect({ to }) {
  const location = useLocation();
  const params = useParams();
  const base = typeof to === "function" ? to(params) : to;
  return <Navigate replace to={`${base}${location.search}${location.hash}`} />;
}

function LegacyMenuCreateRedirect() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const needsReview = query.get("resume") === "fit"
    && query.get("mode") === "upload"
    && query.get("reviewed") !== "1";
  const base = needsReview ? "/menu-builder/review" : "/menu-builder";
  return <Navigate replace to={`${base}${location.search}${location.hash}`} />;
}

function MenuStudioV2Routes() {
  const location = useLocation();
  const stage = location.pathname.replace(/^\/menu-studio\/?/, "").split("/")[0];

  if (!stage) {
    return <MenuStudioEntry />;
  }

  let screen = null;
  if (stage === "content") screen = <MenuContentStudioV2Entry />;
  if (stage === "ai-images") screen = <MenuAiDishImagesV1 />;
  if (stage === "design") screen = <MenuDesignStudioV2 />;
  if (stage === "preview") screen = <MenuPreviewStudioV2 />;
  if (stage === "analytics") screen = <MenuAnalyticsStudioV2 />;
  if (stage === "publish") screen = <MenuSubscriptionPublishGate><MenuPublishStudioV2 /></MenuSubscriptionPublishGate>;

  if (!screen) {
    return <Navigate replace to={`/menu-studio${location.search}${location.hash}`} />;
  }

  return (
    <MenuStudioV2PersistenceBoundary key={new URLSearchParams(location.search).get("project") || "local"}>
      <>
        {screen}
        {stage === "ai-images" ? null : <MenuStudioMobileStageNav />}
      </>
    </MenuStudioV2PersistenceBoundary>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MenuHome />} />
        <Route path="/3DPRINTING" element={<ThreeDPrinting />} />

        {/* Production Menu experience. */}
        <Route path="/menu-builder" element={<MenuCreateV2 />} />
        <Route path="/menu-builder/import" element={<MenuImportStudioV2 />} />
        <Route path="/menu-builder/review" element={<MenuImportReviewV2 />} />
        <Route path="/menu-studio/*" element={<MenuStudioWorkspace><MenuStudioV2Routes /></MenuStudioWorkspace>} />

        {/* The old menu library screen is retired. Studio itself now resolves the active/next menu. */}
        <Route path="/my-menus" element={<Navigate replace to="/menu-studio" />} />
        <Route path="/my-menus/:projectId" element={<Navigate replace to="/menu-studio" />} />
        <Route path="/menu/:slug" element={<MenuPublicV3Dev />} />

        {/* Existing legacy utility remains available while we validate the new flow. */}
        <Route path="/menu-mobile-preview" element={<MenuMobilePreviewPage />} />

        {/* Compatibility aliases: old local bookmarks now land on clean production routes. */}
        <Route path="/dev/menu-public-v3/:slug" element={<LegacyStudioRedirect to={({ slug }) => `/menu/${slug}`} />} />
        <Route path="/dev/my-menus-v2" element={<LegacyStudioRedirect to="/menu-studio" />} />
        <Route path="/dev/menu-manage-v2/:projectId" element={<LegacyStudioRedirect to="/menu-studio" />} />
        <Route path="/dev/menu-create-v2" element={<LegacyMenuCreateRedirect />} />
        <Route path="/dev/menu-import-v2" element={<LegacyStudioRedirect to="/menu-builder/import" />} />
        <Route path="/dev/menu-content-v2" element={<LegacyStudioRedirect to="/menu-studio/content" />} />
        <Route path="/dev/menu-design-v2" element={<LegacyStudioRedirect to="/menu-studio/design" />} />
        <Route path="/dev/menu-preview-v2" element={<LegacyStudioRedirect to="/menu-studio/preview" />} />
        <Route path="/dev/menu-publish-v2" element={<LegacyStudioRedirect to="/menu-studio/publish" />} />

        {import.meta.env.DEV ? (
          <>
            <Route path="/dev/legacy-menu-builder" element={<LegacyMenuBuilder />} />
            <Route path="/dev/menu-engine-v3" element={<MenuEngineV3Dev />} />
            <Route path="/dev/menu-studio-v3" element={<MenuStudioV3Dev />} />
            <Route path="/dev/menu-studio-v3-real" element={<MenuStudioV3RealData />} />
            <Route path="/dev/menu-studio-v3-draft" element={<MenuStudioV3Draft />} />
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
