import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Smartphone,
  X,
} from "lucide-react";

import {
  supabase,
} from "../lib/supabaseClient";

import {
  DEFAULT_MENU_BRANDING,
} from "./DigitalMenuTemplate";

import MenuBrandEditor from "./MenuBrandEditor";

import "./MobileMenuPreview.css";
import "./MobileMenuPreviewWorkspace.css";


const STORAGE_KEY =
  "beyond-mobile-menu-preview-v2";

const MESSAGE_TYPE =
  "beyond-mobile-preview-update";


function normalizeBranding(
  branding
) {
  return {
    ...DEFAULT_MENU_BRANDING,
    ...(branding || {}),
  };
}


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

  const [
    draftBranding,
    setDraftBranding,
  ] = useState(() =>
    normalizeBranding(
      branding
    )
  );

  const [
    draftLogoUrl,
    setDraftLogoUrl,
  ] = useState(
    logoUrl || ""
  );

  const [
    dirty,
    setDirty,
  ] = useState(false);

  const [
    hasChanges,
    setHasChanges,
  ] = useState(false);

  const [
    saveStatus,
    setSaveStatus,
  ] = useState(
    "Changes save automatically"
  );

  const iframeRef =
    useRef(null);

  const editVersionRef =
    useRef(0);


  function makePayload(
    nextBranding = draftBranding,
    nextLogoUrl = draftLogoUrl
  ) {
    const resolvedBranding = {
      ...normalizeBranding(
        nextBranding
      ),

      display_name:
        nextBranding
          ?.display_name
          ?.trim() ||
        menu
          ?.restaurant_name ||
        "My Restaurant",

      logo_url:
        nextLogoUrl ||
        null,
    };

    const resolvedMenu = {
      ...(menu || {}),

      restaurant_name:
        resolvedBranding
          .display_name,

      branding:
        resolvedBranding,
    };

    return {
      menu:
        resolvedMenu,

      branding:
        resolvedBranding,

      logoUrl:
        nextLogoUrl ||
        null,

      generatedAt:
        Date.now(),
    };
  }


  function storePayload(
    payload
  ) {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          payload
        )
      );

      return true;
    } catch (error) {
      console.error(
        "Unable to prepare mobile preview:",
        error
      );

      return false;
    }
  }


  function sendPayloadToPhone(
    payload = makePayload()
  ) {
    const frameWindow =
      iframeRef.current
        ?.contentWindow;

    if (!frameWindow) {
      return;
    }

    frameWindow.postMessage(
      {
        type:
          MESSAGE_TYPE,

        payload,
      },
      window.location.origin
    );
  }


  async function persistDraft() {
    if (
      !menu ||
      !hasChanges
    ) {
      return true;
    }

    const versionAtSave =
      editVersionRef.current;

    const payload =
      makePayload();

    setSaveStatus(
      "Saving changes..."
    );

    try {
      const {
        data,
      } =
        await supabase.auth
          .getSession();

      const userId =
        data
          ?.session
          ?.user
          ?.id ||
        "";

      if (!userId) {
        throw new Error(
          "Your BEYOND session is no longer available."
        );
      }

      let projectId =
        "";

      try {
        projectId =
          localStorage.getItem(
            `beyond-menu-project-${userId}`
          ) ||
          "";
      } catch {
        // Ignore storage errors and use the URL fallback.
      }

      if (!projectId) {
        projectId =
          new URLSearchParams(
            window.location.search
          ).get(
            "project"
          ) ||
          "";
      }

      if (!projectId) {
        throw new Error(
          "Could not identify the current menu project."
        );
      }

      const {
        error:
          saveError,
      } =
        await supabase
          .from(
            "menu_projects"
          )
          .update({
            name:
              payload
                .branding
                .display_name,

            structured_menu:
              payload.menu,
          })
          .eq(
            "id",
            projectId
          )
          .eq(
            "owner_user_id",
            userId
          );

      if (saveError) {
        throw saveError;
      }

      storePayload(
        payload
      );

      if (
        versionAtSave ===
        editVersionRef.current
      ) {
        setDirty(false);
        setSaveStatus(
          "Saved automatically"
        );
      }

      return true;
    } catch (error) {
      console.error(
        "Mobile Menu Studio save failed:",
        error
      );

      setSaveStatus(
        "Could not save changes"
      );

      return false;
    }
  }


  async function handleClose() {
    if (dirty) {
      const saved =
        await persistDraft();

      if (!saved) {
        return;
      }
    }

    const shouldReload =
      hasChanges;

    setOpen(false);

    if (shouldReload) {
      window.setTimeout(
        () =>
          window.location.reload(),
        20
      );
    }
  }


  function markChanged() {
    editVersionRef.current +=
      1;

    setDirty(true);
    setHasChanges(true);
    setSaveStatus(
      "Saving changes..."
    );
  }


  function handleBrandingChange(
    nextBranding
  ) {
    setDraftBranding(
      normalizeBranding(
        nextBranding
      )
    );

    markChanged();
  }


  function handleLogoChange(
    nextLogoUrl
  ) {
    setDraftLogoUrl(
      nextLogoUrl ||
      ""
    );

    markChanged();
  }


  function handleReset() {
    setDraftBranding({
      ...DEFAULT_MENU_BRANDING,

      display_name:
        menu
          ?.restaurant_name ||
        "",
    });

    setDraftLogoUrl(
      ""
    );

    markChanged();
  }


  function handleOpen() {
    if (!menu) {
      return;
    }

    const nextBranding =
      normalizeBranding(
        branding
      );

    const nextLogoUrl =
      logoUrl ||
      "";

    const payload =
      makePayload(
        nextBranding,
        nextLogoUrl
      );

    if (
      !storePayload(
        payload
      )
    ) {
      return;
    }

    setDraftBranding(
      nextBranding
    );

    setDraftLogoUrl(
      nextLogoUrl
    );

    setDirty(false);
    setHasChanges(false);
    setSaveStatus(
      "Changes save automatically"
    );

    editVersionRef.current =
      0;

    /*
      Force a fresh iframe when Mobile View opens.
      Once open, live changes are pushed into the
      existing 390px phone viewport with postMessage.
    */
    setPreviewKey(
      Date.now()
    );

    setOpen(true);
  }


  useEffect(() => {
    if (open) {
      return;
    }

    setDraftBranding(
      normalizeBranding(
        branding
      )
    );

    setDraftLogoUrl(
      logoUrl ||
      ""
    );
  }, [
    branding,
    logoUrl,
    open,
  ]);


  useEffect(() => {
    if (!open) {
      return;
    }

    const payload =
      makePayload();

    storePayload(
      payload
    );

    sendPayloadToPhone(
      payload
    );
  }, [
    open,
    menu,
    draftBranding,
    draftLogoUrl,
  ]);


  useEffect(() => {
    if (
      !open ||
      !dirty
    ) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () => {
          void persistDraft();
        },
        900
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    open,
    dirty,
    draftBranding,
    draftLogoUrl,
  ]);


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
        void handleClose();
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
    dirty,
    hasChanges,
    draftBranding,
    draftLogoUrl,
    menu,
  ]);


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
          aria-label="Mobile Menu Studio preview"
          onMouseDown={event => {
            if (
              event.target ===
              event.currentTarget
            ) {
              void handleClose();
            }
          }}
        >
          <div className="mobile-menu-preview-stage mobile-menu-preview-stage-workspace">

            <div className="mobile-menu-preview-top mobile-menu-preview-top-workspace">
              <div>
                <span>
                  LIVE MOBILE MENU STUDIO
                </span>

                <strong>
                  Edit beside the phone and see every change instantly
                </strong>
              </div>


              <button
                type="button"
                className="mobile-menu-preview-close"
                onClick={() =>
                  void handleClose()
                }
                aria-label="Close mobile preview"
              >
                <X
                  size={18}
                  strokeWidth={1.7}
                />
              </button>
            </div>


            <div className="mobile-menu-preview-workspace">
              <section className="mobile-menu-preview-editor-shell">
                <div className="mobile-menu-preview-editor-meta">
                  <div>
                    <span>MENU STUDIO</span>
                    <strong>Live editing</strong>
                  </div>

                  <small
                    className={
                      saveStatus ===
                      "Could not save changes"
                        ? "error"
                        : ""
                    }
                  >
                    {saveStatus}
                  </small>
                </div>

                <div className="mobile-menu-preview-editor-scroll">
                  <MenuBrandEditor
                    branding={
                      draftBranding
                    }
                    onChange={
                      handleBrandingChange
                    }
                    logoUrl={
                      draftLogoUrl
                    }
                    onLogoChange={
                      handleLogoChange
                    }
                    onReset={
                      handleReset
                    }
                  />
                </div>
              </section>


              <section className="mobile-menu-preview-phone-column">
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
                      This iframe remains a REAL 390 × 844
                      browser viewport, so all genuine mobile
                      breakpoints continue to run exactly as
                      they would for the restaurant customer.
                    */}
                    <iframe
                      ref={
                        iframeRef
                      }
                      key={
                        previewKey
                      }
                      className="mobile-menu-preview-frame"
                      title="BEYOND mobile customer menu preview"
                      src="/menu-mobile-preview"
                      onLoad={() =>
                        sendPayloadToPhone()
                      }
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
              </section>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
