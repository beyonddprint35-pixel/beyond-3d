import { useMemo } from "react";
import MenuContentStudioV2 from "./MenuContentStudioV2";
import MenuWebsiteImportV2 from "./MenuWebsiteImportV2";

export default function MenuContentStudioV2Entry() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const isWebsiteFlow = params.get("mode") === "website";
  const websiteImported = params.get("websiteImported") === "1";

  if (isWebsiteFlow && !websiteImported) return <MenuWebsiteImportV2 />;
  return <MenuContentStudioV2 />;
}
