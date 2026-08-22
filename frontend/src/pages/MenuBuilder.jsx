import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Check,
  FileText,
  Image,
  LoaderCircle,
  Sparkles,
  Upload,
} from "lucide-react";

import {
  supabase,
} from "../lib/supabaseClient";

import {
  setMenuBuilderIntent,
} from "../lib/menuBuilderIntent";

import beyondLogo from "../assets/beyond-logo-transparent.png";

import RestaurantCheckout from "../components/RestaurantCheckout";
import MobileMenuPreview from "../components/MobileMenuPreview";

import DigitalMenuTemplate, {
  DEFAULT_MENU_BRANDING,
} from "../components/DigitalMenuTemplate";

import MenuBrandEditor from "../components/MenuBrandEditor";

import MenuLanguageSelector from "../components/MenuLanguageSelector";

import MenuProjectSwitcher from "../components/MenuProjectSwitcher";

import "./MenuBuilder.css";

const MAX_FILES = 6;

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const value = String(reader.result || "");
      const comma = value.indexOf(",");

      resolve({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        base64:
          comma >= 0
            ? value.slice(comma + 1)
            : value,
      });
    };

    reader.onerror = () =>
      reject(
        new Error(
          `Could not read ${file.name}.`
        )
      );

    reader.readAsDataURL(file);
  });
}

function money(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function MenuBuilder() {
  const [session, setSession] =
    useState(null);

  const [authReady, setAuthReady] =
    useState(false);

  const [allowance, setAllowance] =
    useState(null);

  const [files, setFiles] =
    useState([]);

  const [menuText, setMenuText] =
    useState("");

  const [project, setProject] =
    useState(null);

  const [menu, setMenu] =
    useState(null);

  /*
    Customer chooses the languages
    BEFORE AI generation.

    Empty by default so the customer
    must explicitly choose.
  */
  const [
    selectedLanguages,
    setSelectedLanguages,
  ] = useState([]);


  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [plans, setPlans] =
    useState([]);

  const [showPlans, setShowPlans] =
    useState(false);

  const [billingInterval, setBillingInterval] =
    useState("monthly");

  const [
    selectedPlanId,
    setSelectedPlanId,
  ] = useState("");

  const [
    branding,
    setBranding,
  ] = useState({
    ...DEFAULT_MENU_BRANDING,
  });

  const [
    logoUrl,
    setLogoUrl,
  ] = useState("");

  const [
    savingDesign,
    setSavingDesign,
  ] = useState(false);

  const [
    draftLoading,
    setDraftLoading,
  ] = useState(false);

  const [
    draftRestored,
    setDraftRestored,
  ] = useState(false);

  const [
    draftSaveStatus,
    setDraftSaveStatus,
  ] = useState("");


  const [
    savedProjects,
    setSavedProjects,
  ] = useState([]);

  const [
    activeProjectId,
    setActiveProjectId,
  ] = useState("");

  useEffect(() => {
    let alive = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        setSession(
          data.session || null
        );
        setAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!alive) return;
        setSession(nextSession);
        setAuthReady(true);
      }
    );

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  // BEYOND_MENU_BUILDER_AUTH_REDIRECT_V1
  useEffect(() => {
    if (
      !authReady ||
      session
    ) {
      return;
    }

    setMenuBuilderIntent();

    window.location.replace(
      "/#digital-menus"
    );
  }, [
    authReady,
    session,
  ]);


  /*
    ========================================================
    SAVED MENU MODELS
    ========================================================

    Every successful AI build is its own menu_project.

    Customers can switch between Model 1 / 2 / 3
    instead of losing the previous generation.
  */

  function applyProjectToEditor(
    selectedProject
  ) {
    if (
      !selectedProject?.id ||
      !selectedProject
        ?.structured_menu
    ) {
      return;
    }

    const restoredMenu =
      selectedProject
        .structured_menu;

    const restoredBranding = {
      ...DEFAULT_MENU_BRANDING,

      ...(
        restoredMenu
          ?.branding ||
        {}
      ),

      display_name:
        restoredMenu
          ?.branding
          ?.display_name ||
        restoredMenu
          ?.restaurant_name ||
        selectedProject.name ||
        "",
    };


    setProject(
      selectedProject
    );

    setActiveProjectId(
      selectedProject.id
    );

    setMenu(
      restoredMenu
    );

    setBranding(
      restoredBranding
    );

    setLogoUrl(
      restoredBranding
        .logo_url ||
      ""
    );


    if (
      Array.isArray(
        restoredMenu
          ?.requested_languages
      ) &&
      restoredMenu
        .requested_languages
        .length
    ) {
      setSelectedLanguages(
        restoredMenu
          .requested_languages
      );
    }


    setDraftRestored(
      true
    );

    setDraftSaveStatus(
      "Saved menu restored"
    );

    setShowPlans(
      false
    );

    setSelectedPlanId(
      ""
    );


    try {
      localStorage.setItem(
        `beyond-menu-project-${session?.user?.id || "user"}`,
        selectedProject.id
      );
    } catch {
      // Ignore storage errors.
    }
  }


  async function loadSavedProjects(
    userId,
    preferredProjectId = ""
  ) {
    if (!userId) {
      return;
    }


    const {
      data,
      error:
        projectsError,
    } =
      await supabase
        .from(
          "menu_projects"
        )
        .select("*")
        .eq(
          "owner_user_id",
          userId
        )

        /*
          Only completed AI menu models belong
          in the Model 1 / 2 / 3 switcher.

          Older failed/test draft rows must
          never appear as customer menu models.
        */
        .eq(
          "status",
          "ready"
        )

        .not(
          "structured_menu",
          "is",
          null
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        );


    if (
      projectsError
    ) {
      console.error(
        "Saved menu models load failed:",
        projectsError
      );

      return;
    }


    const projects =
      data || [];


    setSavedProjects(
      projects
    );


    if (
      projects.length ===
      0
    ) {
      return;
    }


    let storedId =
      "";


    try {
      storedId =
        localStorage.getItem(
          `beyond-menu-project-${userId}`
        ) ||
        "";
    } catch {
      // Ignore.
    }


    const selected =
      projects.find(
        item =>
          item.id ===
          preferredProjectId
      ) ||
      projects.find(
        item =>
          item.id ===
          storedId
      ) ||
      projects[
        projects.length -
        1
      ];


    applyProjectToEditor(
      selected
    );
  }


  function handleSelectSavedProject(
    projectId
  ) {
    const selected =
      savedProjects.find(
        item =>
          item.id ===
          projectId
      );


    if (
      selected
    ) {
      applyProjectToEditor(
        selected
      );
    }
  }


  useEffect(() => {
    if (
      !session?.user?.id
    ) {
      setSavedProjects(
        []
      );

      setActiveProjectId(
        ""
      );

      return;
    }


    setDraftLoading(
      true
    );


    /*
      If My Websites opened a specific generated
      website draft, prefer that exact project.
    */
    const requestedProjectId =
      new URLSearchParams(
        window.location.search
      ).get(
        "project"
      ) ||
      "";

    loadSavedProjects(
      session.user.id,
      requestedProjectId
    ).finally(
      () =>
        setDraftLoading(
          false
        )
    );
  }, [
    session?.user?.id,
  ]);



  useEffect(() => {
    if (!session?.user?.id) {
      setAllowance(null);
      return;
    }

    let alive = true;

    async function loadAllowance() {
      const {
        data,
        error: allowanceError,
      } = await supabase.rpc(
        "get_menu_generation_allowance"
      );

      if (!alive) return;

      if (allowanceError) {
        console.error(
          "Menu allowance load failed:",
          allowanceError
        );
        return;
      }

      setAllowance(data);
    }

    loadAllowance();

    return () => {
      alive = false;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    let alive = true;

    supabase
      .from("subscription_plans")
      .select(
        "id,name,description,monthly_price_ils,annual_billing_months,features,includes_nfc_qr_stand,sort_order"
      )
      .eq("active", true)
      .order("sort_order", {
        ascending: true,
      })
      .then(({ data, error: plansError }) => {
        if (!alive) return;

        if (plansError) {
          console.error(
            "Plan load failed:",
            plansError
          );
          return;
        }

        setPlans(data || []);
      });

    return () => {
      alive = false;
    };
  }, []);

  /*
    ========================================================
    AUTO SAVE MENU DESIGN
    ========================================================

    The AI result itself is already stored by the
    Edge Function.

    This effect also persists the customer's:
      - restaurant name
      - colors
      - typography
      - logo
      - logo crop shape

    So logout/browser close does not lose the design.
  */
  useEffect(() => {
    if (
      !session?.user?.id ||
      !project?.id ||
      !menu
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        async () => {
          const nextBranding = {
            ...branding,

            display_name:
              branding
                .display_name
                ?.trim() ||
              menu
                .restaurant_name ||
              project.name ||
              "My Restaurant",

            logo_url:
              logoUrl ||
              null,
          };

          const nextMenu = {
            ...menu,

            restaurant_name:
              nextBranding
                .display_name,

            branding:
              nextBranding,
          };

          setDraftSaveStatus(
            "Saving..."
          );

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
                  nextBranding
                    .display_name,

                structured_menu:
                  nextMenu,
              })
              .eq(
                "id",
                project.id
              )
              .eq(
                "owner_user_id",
                session.user.id
              );

          if (
            saveError
          ) {
            console.error(
              "Menu draft autosave failed:",
              saveError
            );

            setDraftSaveStatus(
              "Could not save changes"
            );

            return;
          }

          setDraftSaveStatus(
            "Saved automatically"
          );

          setProject(
            current => ({
              ...(current || {}),

              name:
                nextBranding
                  .display_name,

              structured_menu:
                nextMenu,
            })
          );
        },
        850
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    session?.user?.id,
    project?.id,

    menu,

    branding,

    logoUrl,
  ]);


  const remainingText = useMemo(
    () => {
      if (!allowance) {
        return "Loading attempts...";
      }

      if (allowance.unlimited) {
        return "Admin access · Unlimited builds";
      }

      return `${allowance.remaining_attempts} of ${allowance.max_attempts} AI builds remaining`;
    },
    [allowance]
  );

  async function createGenerationProject() {
    const {
      data,
      error:
        createError,
    } =
      await supabase
        .from(
          "menu_projects"
        )
        .insert({
          owner_user_id:
            session.user.id,

          created_by:
            session.user.id,

          name:
            `Menu Model ${
              savedProjects.length +
              1
            }`,

          source_type:
            menuText.trim() &&
            files.length
              ? "mixed"
              : menuText.trim()
                ? "text"
                : files.some(
                    file =>
                      file.type ===
                      "application/pdf"
                  )
                  ? "pdf"
                  : "image",
        })
        .select()
        .single();


    if (
      createError
    ) {
      throw createError;
    }


    setProject(
      data
    );

    setActiveProjectId(
      data.id
    );


    return data;
  }


  async function handleGenerate() {
    if (!session) {
      return;
    }

    if (
      selectedLanguages.length === 0
    ) {
      setError(
        "Choose at least one menu language before building your menu."
      );

      return;
    }

    if (
      !menuText.trim() &&
      files.length === 0
    ) {
      setError(
        "Upload your menu or paste/write its content first."
      );
      return;
    }

    if (
      allowance &&
      !allowance.unlimited &&
      Number(
        allowance.remaining_attempts
      ) <= 0
    ) {
      setError(
        "You have used all 3 free AI menu builds."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
        Every successful generation becomes
        a separate model instead of overwriting
        the previous one.
      */
      setMenu(null);

      setBranding({
        ...DEFAULT_MENU_BRANDING,
      });

      setLogoUrl("");

      const nextProject =
        await createGenerationProject();

      const payloadFiles =
        await Promise.all(
          files.map(fileToPayload)
        );

      /*
        BEYOND MENU AI

        The AI backend now runs directly on
        Supabase Edge Functions.

        Netlify is NOT involved in this request.
      */
      const {
        data,
        error: functionError,
      } = await supabase.functions.invoke(
        "menu-ai-extract",
        {
          body: {
            projectId:
              nextProject.id,

            text:
              menuText.trim(),

            files:
              payloadFiles,
          
                languages:
                  selectedLanguages,
},

          /*
            This request goes directly to Supabase,
            so using the Supabase JWT in Authorization
            is correct here.
          */
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        }
      );

      /*
        Supabase returns FunctionsHttpError for
        non-2xx Edge Function responses.

        Extract BEYOND's actual error message
        when possible instead of showing a
        generic SDK error.
      */
      if (functionError) {
        let message =
          functionError.message ||
          "Could not build this menu.";

        try {
          const functionResponse =
            functionError.context;

          if (
            functionResponse &&
            typeof functionResponse.clone ===
              "function"
          ) {
            const raw =
              await functionResponse
                .clone()
                .text();

            if (raw) {
              try {
                const details =
                  JSON.parse(raw);

                message =
                  details?.error ||
                  details?.message ||
                  message;
              } catch {
                message =
                  raw ||
                  message;
              }
            }
          }
        } catch {
          // Keep original function error message.
        }

        throw new Error(message);
      }

      if (!data?.ok) {
        throw new Error(
          data?.error ||
            "Could not build this menu."
        );
      }

      setMenu(data.menu);

      if (
        Array.isArray(
          data.menu
            ?.requested_languages
        ) &&
        data.menu
          .requested_languages
          .length > 0
      ) {
        setSelectedLanguages(
          data.menu
            .requested_languages
        );
      }

      setDraftRestored(
        true
      );

      setDraftSaveStatus(
        "AI menu saved"
      );

      setBranding(current => ({
        ...current,

        display_name:
          current.display_name ||
          data.menu?.restaurant_name ||
          "My Restaurant",
      }));

      if (!data.unlimited) {
        setAllowance(current => ({
          ...(current || {}),
          remaining_attempts:
            data.remainingAttempts,
          used_attempts:
            Math.max(
              Number(
                current?.max_attempts ||
                  3
              ) -
                Number(
                  data.remainingAttempts ||
                    0
                ),
              0
            ),
        }));
      }

      setProject(current => ({
        ...(current || nextProject),
        name:
          data.menu?.restaurant_name ||
          "My Menu",
        structured_menu: data.menu,
        status: "ready",
      }));

      await loadSavedProjects(
        session.user.id,
        nextProject.id
      );
    } catch (generationError) {
      setError(
        generationError?.message ||
          "Could not build this menu."
      );

      const {
        data,
      } = await supabase.rpc(
        "get_menu_generation_allowance"
      );

      if (data) {
        setAllowance(data);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelection(event) {
    const selected = Array.from(
      event.target.files || []
    );

    const allowed = selected.filter(
      file =>
        [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(file.type)
    );

    const nextFiles = [
      ...files,
      ...allowed,
    ].slice(0, MAX_FILES);

    setFiles(nextFiles);
    event.target.value = "";
  }

  async function handleContinueToPlans() {
    if (
      !menu
    ) {
      return;
    }

    setSavingDesign(true);
    setError("");

    try {
      const nextBranding = {
        ...branding,

        display_name:
          branding.display_name?.trim() ||
          menu.restaurant_name ||
          "My Restaurant",

        logo_url:
          logoUrl ||
          null,
      };

      const menuWithBranding = {
        ...menu,

        restaurant_name:
          nextBranding.display_name,

        branding:
          nextBranding,
      };

      if (
        project?.id
      ) {
        const {
          error:
            saveDesignError,
        } =
          await supabase
            .from(
              "menu_projects"
            )
            .update({
              name:
                nextBranding
                  .display_name,

              structured_menu:
                menuWithBranding,
            })
            .eq(
              "id",
              project.id
            );

        if (
          saveDesignError
        ) {
          throw saveDesignError;
        }
      }

      setMenu(
        menuWithBranding
      );

      setProject(
        current => ({
          ...(current || {}),

          name:
            nextBranding
              .display_name,

          structured_menu:
            menuWithBranding,
        })
      );

      setShowPlans(true);
    } catch (
      designError
    ) {
      setError(
        designError?.message ||
        "Could not save your menu design."
      );
    } finally {
      setSavingDesign(false);
    }
  }


  if (!authReady) {
    return (
      <div className="menu-builder-loading-page">
        <LoaderCircle size={28} />
        Loading BEYOND Menu...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="menu-builder-loading-page">
        <LoaderCircle
          size={28}
        />

        Returning to BEYOND...
      </div>
    );
  }

  return (
    <main className="menu-builder-page">
      <header className="menu-builder-topbar">
        <button
          type="button"
          className="menu-builder-brand"
          onClick={() =>
            window.location.assign("/")
          }
        >
          <img
            src={beyondLogo}
            alt="BEYOND"
          />
          <span>BEYOND</span>
        </button>

        <div className="menu-builder-topbar-right">
          <span className="menu-builder-attempt-chip">
            <Sparkles size={14} />
            {remainingText}
          </span>

          <button
            type="button"
            className="menu-builder-back"
            onClick={() =>
              window.location.assign("/")
            }
          >
            <ArrowLeft size={15} />
            Back to BEYOND
          </button>
        </div>
      </header>

      {!showPlans ? (
        <div className="menu-builder-workspace">
          <section className="menu-builder-intro">
            <span>BEYOND MENU AI</span>
            <h1>
              Turn your existing menu
              <br />
              into a digital experience.
            </h1>
            <p>
              Upload a PDF, add menu photos, paste your text — or combine them. BEYOND AI will structure the menu and show you a private preview before you choose a subscription.
            </p>
          </section>

          {(draftLoading ||
            draftRestored) && (
            <div className="menu-builder-saved-draft">
              <div>
                <strong>
                  {draftLoading
                    ? "Checking for your saved menu..."
                    : "Your menu is saved to your BEYOND account."}
                </strong>

                {!draftLoading && (
                  <span>
                    You can log out and come back later. We will restore this menu automatically.
                  </span>
                )}
              </div>

              {!draftLoading &&
                draftSaveStatus && (
                  <small>
                    {draftSaveStatus}
                  </small>
                )}
            </div>
          )}

          <MenuProjectSwitcher
            projects={
              savedProjects
            }
            activeProjectId={
              activeProjectId
            }
            onSelect={
              handleSelectSavedProject
            }
          />

          <MenuLanguageSelector
            value={
              selectedLanguages
            }
            onChange={
              setSelectedLanguages
            }
            disabled={
              loading
            }
          />

          <section className="menu-builder-source-panel">
            <div className="menu-builder-source-heading">
              <div>
                <span>02 / SOURCE</span>
                <h2>
                  Give us your menu.
                </h2>
              </div>

              <strong>
                Up to 6 files
              </strong>
            </div>

            <div className="menu-builder-source-grid">
              <label className="menu-builder-upload-card">
                <Upload size={25} />
                <strong>
                  Upload PDF or photos
                </strong>
                <p>
                  PDF, JPG, PNG or WEBP. You can combine several menu pages.
                </p>
                <span>
                  Choose files
                </span>

                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  multiple
                  onChange={
                    handleFileSelection
                  }
                />
              </label>

              <div className="menu-builder-text-card">
                <div>
                  <FileText size={22} />
                  <strong>
                    Write or paste
                  </strong>
                </div>

                <textarea
                  value={menuText}
                  onChange={event =>
                    setMenuText(
                      event.target.value
                    )
                  }
                  placeholder={
                    "Example:\nBurgers\nClassic Burger - 58₪\nBeef patty, lettuce, tomato..."
                  }
                />
              </div>
            </div>

            {files.length > 0 && (
              <div className="menu-builder-files">
                {files.map(
                  (file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                    >
                      {file.type ===
                      "application/pdf" ? (
                        <FileText
                          size={16}
                        />
                      ) : (
                        <Image
                          size={16}
                        />
                      )}

                      <span>
                        {file.name}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setFiles(current =>
                            current.filter(
                              (_, itemIndex) =>
                                itemIndex !==
                                index
                            )
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            {error && (
              <div className="menu-builder-error">
                {error}
              </div>
            )}

            <div className="menu-builder-generate-row">
              <div>
                <strong>
                  Your AI preview is private.
                </strong>
                <span>
                  A successful build uses 1 of your 3 attempts. System failures are refunded automatically.
                </span>
              </div>

              <button
                type="button"
                className="menu-builder-main-button"
                onClick={handleGenerate}
                disabled={
                  loading ||
                  selectedLanguages.length === 0
                }
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      className="menu-builder-spin"
                      size={17}
                    />
                    Building your menu...
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    Build My Menu
                  </>
                )}
              </button>
            </div>
          </section>

          {menu && (
            <section className="menu-builder-result">
              <div className="menu-builder-result-heading">
                <div>
                  <span>02 / BRAND & PREVIEW</span>

                  <h2>
                    Design your live menu.
                  </h2>

                  <p>
                    This is the same BEYOND customer-menu system that your restaurant will use live. Add your logo, choose the brand colors and fonts, switch languages and preview the final customer experience before subscribing.
                  </p>
                </div>

                <div className="menu-builder-design-actions">

                  <MobileMenuPreview
                    menu={
                      menu
                    }
                    branding={
                      branding
                    }
                    logoUrl={
                      logoUrl
                    }
                  />

                  <button
                    type="button"
                    className="menu-builder-main-button"
                    onClick={
                      handleContinueToPlans
                    }
                    disabled={
                      savingDesign
                    }
                  >
                    {savingDesign
                      ? "Saving design..."
                      : "Save Design & Continue"}
                  </button>

                </div>
              </div>

              <div className="menu-builder-branding-layout">
                <MenuBrandEditor
                  branding={
                    branding
                  }
                  onChange={
                    setBranding
                  }
                  logoUrl={
                    logoUrl
                  }
                  onLogoChange={
                    setLogoUrl
                  }
                  onReset={() =>
                    setBranding({
                      ...DEFAULT_MENU_BRANDING,

                      display_name:
                        menu?.restaurant_name ||
                        "",
                    })
                  }
                />

                <div className="menu-builder-live-preview">
                  <div className="menu-builder-live-preview-label">
                    <span>
                      LIVE CUSTOMER PREVIEW
                    </span>

                    <strong>
                      Changes appear instantly
                    </strong>
                  </div>

                  <DigitalMenuTemplate
                    menu={
                      menu
                    }
                    branding={
                      branding
                    }
                    logoUrl={
                      logoUrl
                    }
                    embedded
                  />
                </div>
              </div>
            </section>
          )}
        </div>
      ) : selectedPlanId ? (
        <RestaurantCheckout
          plan={
            plans.find(
              plan =>
                plan.id ===
                selectedPlanId
            )
          }
          billingInterval={
            billingInterval
          }
          menu={
            menu
          }
          session={
            session
          }
          onBack={() =>
            setSelectedPlanId("")
          }
        />
      ) : (
        <section className="menu-builder-plans-page">
          <div className="menu-builder-plans-heading">
            <button
              type="button"
              onClick={() => {
                setSelectedPlanId("");
                setShowPlans(false);
              }}
            >
              <ArrowLeft size={16} />
              Back to preview
            </button>

            <span>04 / ACTIVATE</span>
            <h1>
              Choose your BEYOND plan.
            </h1>
            <p>
              Your menu draft is ready. Choose how you want to run it live.
            </p>
          </div>

          <div className="menu-builder-billing-toggle">
            <button
              type="button"
              className={
                billingInterval ===
                "monthly"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setBillingInterval(
                  "monthly"
                )
              }
            >
              Monthly
            </button>

            <button
              type="button"
              className={
                billingInterval ===
                "annual"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setBillingInterval(
                  "annual"
                )
              }
            >
              Annual
              <span>PAY FOR 11</span>
            </button>
          </div>

          <div className="menu-builder-plan-grid">
            {plans.map(plan => {
              const annualMonths =
                Number(
                  plan.annual_billing_months ||
                    11
                );

              const monthly = Number(
                plan.monthly_price_ils || 0
              );

              const amount =
                billingInterval ===
                "annual"
                  ? monthly * annualMonths
                  : monthly;

              const features =
                plan.features || {};

              return (
                <article
                  key={plan.id}
                  className={`menu-builder-plan-card ${
                    plan.id === "premium"
                      ? "premium"
                      : ""
                  }`}
                >
                  {plan.id ===
                    "premium" && (
                    <div className="menu-builder-plan-badge">
                      PREMIUM EXPERIENCE
                    </div>
                  )}

                  <span>
                    {plan.name}
                  </span>

                  <h2>
                    {money(amount)}
                  </h2>

                  <p className="menu-builder-plan-period">
                    {billingInterval ===
                    "annual"
                      ? "per year · 12 months of service"
                      : "per month"}
                  </p>

                  {billingInterval ===
                    "annual" && (
                    <strong className="menu-builder-plan-saving">
                      1 month included free
                    </strong>
                  )}

                  <div className="menu-builder-plan-features">
                    <div>
                      <Check size={15} />
                      Digital restaurant menu
                    </div>
                    <div>
                      <Check size={15} />
                      Menu management
                    </div>
                    <div>
                      <Check size={15} />
                      Multi-language support
                    </div>
                    <div>
                      <Check size={15} />
                      AI menu import
                    </div>

                    <div
                      className={
                        features.item_images
                          ? ""
                          : "muted"
                      }
                    >
                      {features.item_images ? (
                        <Check size={15} />
                      ) : (
                        <span>—</span>
                      )}
                      Pictures inside the menu
                    </div>

                    <div className="future">
                      + More plan features coming
                    </div>
                  </div>

                  <button
                    type="button"
                    className="menu-builder-main-button"
                    onClick={() => {
                      setError("");
                      setSelectedPlanId(
                        plan.id
                      );
                    }}
                  >
                    Choose {plan.name}
                  </button>
                </article>
              );
            })}
          </div>

          {error && (
            <div className="menu-builder-plan-note">
              {error}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
