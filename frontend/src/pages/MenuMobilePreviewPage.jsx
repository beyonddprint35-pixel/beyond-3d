import {
  useMemo,
} from "react";

import DigitalMenuTemplate from "../components/DigitalMenuTemplate";

import "./MenuMobilePreviewPage.css";


const STORAGE_KEY =
  "beyond-mobile-menu-preview-v2";


function getPreviewData() {
  try {
    const value =
      sessionStorage.getItem(
        STORAGE_KEY
      );

    if (!value) {
      return null;
    }

    return JSON.parse(
      value
    );
  } catch (error) {
    console.error(
      "Unable to read mobile preview:",
      error
    );

    return null;
  }
}


export default function MenuMobilePreviewPage() {
  const preview =
    useMemo(
      () =>
        getPreviewData(),
      []
    );

  const isHomepagePreview =
    useMemo(
      () =>
        new URLSearchParams(
          window.location.search
        ).get("source") === "home",
      []
    );


  if (
    !preview?.menu
  ) {
    return (
      <main className="menu-mobile-preview-empty">
        <strong>
          Preview unavailable
        </strong>

        <span>
          Close this view and press Mobile View again.
        </span>
      </main>
    );
  }


  return (
    <main
      className={
        isHomepagePreview
          ? "menu-mobile-preview-page menu-mobile-preview-home"
          : "menu-mobile-preview-page"
      }
    >

      {/*
        EXACT SAME CUSTOMER TEMPLATE.

        No scaling.
        No alternative menu component.

        It simply lives inside a genuine
        390px-wide browser viewport.
      */}
      <DigitalMenuTemplate
        menu={
          preview.menu
        }
        branding={
          preview.branding ||
          {}
        }
        logoUrl={
          preview.logoUrl ||
          null
        }
        fitViewport
      />

    </main>
  );
}
