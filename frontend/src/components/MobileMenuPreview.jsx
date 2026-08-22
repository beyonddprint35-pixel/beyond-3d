import {
  useEffect,
  useState,
} from "react";

import {
  Smartphone,
  X,
} from "lucide-react";

import "./MobileMenuPreview.css";


const STORAGE_KEY =
  "beyond-mobile-menu-preview-v2";


export default function MobileMenuPreview({
  menu,
  branding,
  logoUrl,
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    previewKey,
    setPreviewKey,
  ] = useState(0);


  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const oldOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";


    function handleKeyDown(event) {
      if (
        event.key ===
        "Escape"
      ) {
        setOpen(false);
      }
    }


    window.addEventListener(
      "keydown",
      handleKeyDown
    );


    return () => {
      document.body.style.overflow =
        oldOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
  ]);


  function handleOpen() {
    if (!menu) {
      return;
    }


    const payload = {
      menu,

      branding:
        branding || {},

      logoUrl:
        logoUrl || null,

      generatedAt:
        Date.now(),
    };


    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          payload
        )
      );
    } catch (error) {
      console.error(
        "Unable to prepare mobile preview:",
        error
      );

      return;
    }


    /*
      Force a fresh iframe every time so the latest
      colors/logo/text/design are shown.
    */
    setPreviewKey(
      Date.now()
    );

    setOpen(true);
  }


  return (
    <>
      <button
        type="button"
        className="menu-builder-mobile-view-button"
        onClick={
          handleOpen
        }
        disabled={
          !menu
        }
      >
        <Smartphone
          size={17}
          strokeWidth={1.7}
        />

        Mobile View
      </button>


      {open && (
        <div
          className="mobile-menu-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile menu preview"
          onMouseDown={event => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setOpen(false);
            }
          }}
        >
          <div className="mobile-menu-preview-stage">

            <div className="mobile-menu-preview-top">
              <div>
                <span>
                  LIVE MOBILE PREVIEW
                </span>

                <strong>
                  Your real customer menu on mobile
                </strong>
              </div>


              <button
                type="button"
                className="mobile-menu-preview-close"
                onClick={() =>
                  setOpen(false)
                }
                aria-label="Close mobile preview"
              >
                <X
                  size={18}
                  strokeWidth={1.7}
                />
              </button>
            </div>


            <div className="mobile-menu-preview-phone">

              <div className="mobile-menu-preview-buttons left">
                <span />
                <span />
                <span />
              </div>


              <div className="mobile-menu-preview-buttons right">
                <span />
              </div>


              <div className="mobile-menu-preview-screen">

                <div className="mobile-menu-preview-island">
                  <span />
                </div>


                {/*
                  IMPORTANT:

                  This iframe is a REAL 390px browser viewport.

                  Therefore:
                  @media (max-width: 560px)
                  @media (max-width: 390px)

                  inside DigitalMenuTemplate.css actually activate.

                  This is what a real phone does.
                */}
                <iframe
                  key={
                    previewKey
                  }
                  className="mobile-menu-preview-frame"
                  title="BEYOND mobile customer menu preview"
                  src="/menu-mobile-preview"
                />

              </div>

            </div>


            <div className="mobile-menu-preview-info">
              <Smartphone
                size={12}
                strokeWidth={1.5}
              />

              390 × 844 real browser viewport
            </div>

          </div>
        </div>
      )}
    </>
  );
}
