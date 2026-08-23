import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DigitalMenuTemplate from "../components/DigitalMenuTemplate";

import "./MenuMobilePreviewPage.css";


const STORAGE_KEY =
  "beyond-mobile-menu-preview-v2";

const MESSAGE_TYPE =
  "beyond-mobile-preview-update";


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
  const [
    preview,
    setPreview,
  ] = useState(() =>
    getPreviewData()
  );

  const isHomepagePreview =
    useMemo(
      () =>
        new URLSearchParams(
          window.location.search
        ).get("source") === "home",
      []
    );


  useEffect(() => {
    function handleMessage(
      event
    ) {
      if (
        event.origin !==
        window.location.origin
      ) {
        return;
      }

      if (
        event.data?.type !==
        MESSAGE_TYPE ||
        !event.data
          ?.payload
          ?.menu
      ) {
        return;
      }

      setPreview(
        event.data.payload
      );
    }

    window.addEventListener(
      "message",
      handleMessage
    );

    return () => {
      window.removeEventListener(
        "message",
        handleMessage
      );
    };
  }, []);


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

        The Mobile Menu Studio now streams branding
        edits into this genuine 390px-wide viewport
        without rebuilding or refreshing the iframe.
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
