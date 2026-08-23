import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Check,
  Clock3,
  FileBox,
  FolderOpen,
  Globe2,
  ExternalLink,
  Settings2,
  ShieldCheck,
  Store,
  LogOut,
  PackageCheck,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  supabase,
} from "../lib/supabaseClient";

import {
  listUserCommunityShares,
  publishAiModelToCommunity,
  publishProjectToCommunity,
  unpublishCommunitySource,
} from "../lib/communityStore";

import "./MyAccount.css";

function makeOrderNumber(
  id
) {
  if (!id) {
    return "B3D-UNKNOWN";
  }

  return (
    "B3D-" +
    String(id)
      .slice(0, 8)
      .toUpperCase()
  );
}

function formatDate(
  value
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IL",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

function formatServiceStatus(
  value,
  fallback = "Not started"
) {
  if (!value) {
    return fallback;
  }

  return String(value)
    .split("_")
    .map(
      word =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function modelTitle(
  generation
) {
  if (
    generation.mode ===
      "text" &&
    generation.prompt
  ) {
    const value =
      generation.prompt
        .trim();

    if (
      value.length <=
      55
    ) {
      return value;
    }

    return `${value.slice(
      0,
      55
    )}…`;
  }

  return generation.mode ===
    "photos"
    ? "Photo-generated 3D model"
    : "AI-generated 3D model";
}

function MyAccount({
  open,
  onClose,
  session,
  profile,
  onProfileUpdated,
  passwordRecovery = false,
  onPasswordRecoveryComplete,
  onSignOut,
}) {
  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "overview"
  );

  const [
    orders,
    setOrders,
  ] = useState([]);

  const [
    models,
    setModels,
  ] = useState([]);

  const [
    projects,
    setProjects,
  ] = useState([]);

  const [
    menuSites,
    setMenuSites,
  ] = useState([]);

  /*
    AI-generated restaurant websites that are
    still private Menu Builder projects.

    These appear in My Websites as DRAFT until
    activation creates/connects a real menu_site.
  */
  const [
    menuDraftProjects,
    setMenuDraftProjects,
  ] = useState([]);


  /*
    Total websites visible in the customer account:
    generated drafts + activated menu sites.
  */
  const websiteCount =
    menuSites.length +
    menuDraftProjects.length;

  const [
    isMenuAdmin,
    setIsMenuAdmin,
  ] = useState(false);

  const [
    websitesLoading,
    setWebsitesLoading,
  ] = useState(false);

  // BEYOND_ADMIN_CONTACT_SETTINGS_V1
  const [
    adminContactPhone,
    setAdminContactPhone,
  ] = useState(
    "+972-537707072"
  );

  const [
    adminContactSaving,
    setAdminContactSaving,
  ] = useState(false);

  const [
    adminContactMessage,
    setAdminContactMessage,
  ] = useState("");



  // BEYOND_ADMIN_REQUESTS_IN_MY_WEBSITES_V1
  const [
    adminRestaurantRequests,
    setAdminRestaurantRequests,
  ] = useState([]);

  const [
    adminRequestsLoading,
    setAdminRequestsLoading,
  ] = useState(false);

  const [
    adminSiteSelections,
    setAdminSiteSelections,
  ] = useState({});

  const [
    adminLinkingRequest,
    setAdminLinkingRequest,
  ] = useState("");

  const [
    adminRequestMessage,
    setAdminRequestMessage,
  ] = useState("");

  // BEYOND_RESTAURANT_SERVICE_V1
  const [
    businessAccount,
    setBusinessAccount,
  ] = useState(null);

  const [
    restaurantSubscription,
    setRestaurantSubscription,
  ] = useState(null);

  const [
    websiteRequest,
    setWebsiteRequest,
  ] = useState(null);

  const [
    restaurantServiceLoading,
    setRestaurantServiceLoading,
  ] = useState(false);

  const [
    restaurantServiceActionLoading,
    setRestaurantServiceActionLoading,
  ] = useState(false);

  const [
    restaurantServiceMessage,
    setRestaurantServiceMessage,
  ] = useState("");

  const [
    restaurantPromoCode,
    setRestaurantPromoCode,
  ] = useState("");

  const [
    restaurantPromoLoading,
    setRestaurantPromoLoading,
  ] = useState(false);

  const [
    restaurantPromoMessage,
    setRestaurantPromoMessage,
  ] = useState("");

  const [
    communityShares,
    setCommunityShares,
  ] = useState([]);

  const [
    communityBusyKey,
    setCommunityBusyKey,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);

  const [
    profileMessage,
    setProfileMessage,
  ] = useState("");

  // BEYOND_ACCOUNT_PASSWORD_V1
  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState("");

  const [
    passwordError,
    setPasswordError,
  ] = useState("");

  const [
    archivingId,
    setArchivingId,
  ] = useState(null);

  // BEYOND_PASSWORD_RECOVERY_PROFILE_V1
  useEffect(() => {
    if (
      open &&
      passwordRecovery
    ) {
      setActiveTab(
        "profile"
      );
    }
  }, [
    open,
    passwordRecovery,
  ]);

  async function handleChangePassword(
    event
  ) {
    event.preventDefault();

    setPasswordError("");
    setPasswordMessage("");

    if (
      newPassword.length < 8
    ) {
      setPasswordError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordError(
        "The passwords do not match."
      );
      return;
    }

    setChangingPassword(
      true
    );

    try {
      const {
        error:
          updateError,
      } =
        await supabase.auth
          .updateUser({
            password:
              newPassword,
          });

      if (updateError) {
        throw updateError;
      }

      setNewPassword("");
      setConfirmPassword("");

      setPasswordMessage(
        "Your password has been updated successfully."
      );

      if (
        onPasswordRecoveryComplete
      ) {
        onPasswordRecoveryComplete();
      }
    } catch (err) {
      setPasswordError(
        err.message ||
          "Could not update your password."
      );
    } finally {
      setChangingPassword(
        false
      );
    }
  }

  const loadAccountData =
    useCallback(
      async () => {
        if (
          !session?.user?.id
        ) {
          setOrders([]);
          setModels([]);
          return;
        }

        setLoading(true);
        setError("");

        const [
          ordersResult,
          modelsResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "orders"
              )
              .select(
                `
                  id,
                  user_id,
                  project_type,
                  material,
                  color,
                  quantity,
                  status,
                  source_type,
                  ai_generation_id,
                  created_at,
                  needed_by
                `
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),

            supabase
              .from(
                "ai_generations"
              )
              .select(
                `
                  id,
                  user_id,
                  meshy_task_id,
                  mode,
                  prompt,
                  status,
                  model_3mf_url,
                  glb_url,
                  thumbnail_url,
                  glb_storage_path,
                  model_3mf_storage_path,
                  thumbnail_storage_path,
                  archived_at,
                  credits_used,
                  created_at
                `
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),
          ]);

        if (
          ordersResult.error ||
          modelsResult.error
        ) {
          console.error(
            "Account data error:",
            ordersResult.error,
            modelsResult.error
          );

          setError(
            "We could not load all of your account data."
          );
        }

        setOrders(
          ordersResult.data ||
            []
        );

        setModels(
          modelsResult.data ||
            []
        );

        setLoading(false);
      },
      [
        session?.user?.id,
      ]
    );

  useEffect(() => {
    if (!open) {
      return;
    }

    loadAccountData();
  }, [
    open,
    loadAccountData,
  ]);


  // BEYOND_MY_PROJECTS_V1
  const loadProjects =
    useCallback(
      async () => {
        if (!session?.user?.id) {
          setProjects([]);
          return;
        }

        const {
          data,
          error:
            projectsError,
        } = await supabase
          .from("projects")
          .select(
            "id,user_id,name,project_type,project_data,thumbnail_url,visibility,created_at,updated_at"
          )
          .eq(
            "user_id",
            session.user.id
          )
          .order(
            "updated_at",
            { ascending: false }
          );

        if (projectsError) {
          console.error(
            "Projects load error:",
            projectsError
          );
          return;
        }

        setProjects(data || []);
      },
      [session?.user?.id]
    );

  useEffect(() => {
    if (!open) return;
    loadProjects();
  }, [open, loadProjects]);

  useEffect(() => {
    function handleProjectSaved() {
      if (open) {
        loadProjects();
      }
    }

    window.addEventListener(
      "beyond-project-saved",
      handleProjectSaved
    );

    return () =>
      window.removeEventListener(
        "beyond-project-saved",
        handleProjectSaved
      );
  }, [open, loadProjects]);

  function openProject(project) {
    window.dispatchEvent(
      new CustomEvent(
        "beyond-project-open",
        { detail: project }
      )
    );
    onClose();
  }


  // BEYOND_HIDE_EMPTY_ACCOUNT_TABS_V1
  useEffect(() => {
    if (
      (activeTab === "orders" &&
        orders.length === 0) ||
      (activeTab === "projects" &&
        projects.length === 0) ||
      (activeTab === "models" &&
        models.length === 0)
    ) {
      setActiveTab("overview");
    }
  }, [
    activeTab,
    orders.length,
    projects.length,
    models.length,
  ]);

  // BEYOND_MY_WEBSITES_ACCOUNT_V2
  const loadMenuSites =
    useCallback(
      async () => {
        if (
          !session?.user?.id
        ) {
          setMenuSites([]);
          setMenuDraftProjects([]);
          setIsMenuAdmin(false);
          setWebsitesLoading(false);

          return;
        }


        setWebsitesLoading(
          true
        );


        const {
          data:
            adminRow,

          error:
            adminError,
        } =
          await supabase
            .from(
              "menu_admins"
            )
            .select(
              "user_id"
            )
            .eq(
              "user_id",
              session.user.id
            )
            .maybeSingle();


        if (
          adminError
        ) {
          console.error(
            "Menu admin check failed:",
            adminError
          );

          setMenuSites([]);
          setMenuDraftProjects([]);
          setIsMenuAdmin(false);
          setWebsitesLoading(false);

          return;
        }


        const adminMode =
          Boolean(
            adminRow
          );


        setIsMenuAdmin(
          adminMode
        );


        let siteQuery =
          supabase
            .from(
              "menu_sites"
            )
            .select(
              "id,owner_id,name,slug,published,created_at"
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );


        if (
          !adminMode
        ) {
          siteQuery =
            siteQuery.eq(
              "owner_id",
              session.user.id
            );
        }


        const draftQuery =
          supabase
            .from(
              "menu_projects"
            )
            .select(
              `
                id,
                owner_user_id,
                restaurant_id,
                name,
                status,
                structured_menu,
                activated_site_id,
                created_at,
                updated_at
              `
            )
            .eq(
              "owner_user_id",
              session.user.id
            )
            .eq(
              "status",
              "ready"
            )
            .is(
              "activated_site_id",
              null
            )
            .not(
              "structured_menu",
              "is",
              null
            )
            .order(
              "updated_at",
              {
                ascending:
                  false,
              }
            );


        const [
          sitesResult,
          draftsResult,
        ] =
          await Promise.all([
            siteQuery,
            draftQuery,
          ]);


        if (
          sitesResult.error
        ) {
          console.error(
            "Website load failed:",
            sitesResult.error
          );

          setMenuSites([]);
        } else {
          setMenuSites(
            sitesResult.data ||
            []
          );
        }


        if (
          draftsResult.error
        ) {
          console.error(
            "Website drafts load failed:",
            draftsResult.error
          );

          setMenuDraftProjects([]);
        } else {
          const drafts =
            (
              draftsResult.data ||
              []
            ).filter(
              project =>
                Array.isArray(
                  project
                    ?.structured_menu
                    ?.sections
                ) &&
                project
                  .structured_menu
                  .sections
                  .length >
                  0
            );

          setMenuDraftProjects(
            drafts
          );
        }


        setWebsitesLoading(
          false
        );
      },
      [
        session?.user?.id,
      ]
    );


  useEffect(() => {
    if (!open) {
      return;
    }

    loadMenuSites();
  }, [
    open,
    loadMenuSites,
  ]);

  useEffect(() => {
    if (
      activeTab === "websites" &&
      !websitesLoading &&
      !isMenuAdmin &&
      websiteCount === 0
    ) {
      setActiveTab("overview");
    }
  }, [
    activeTab,
    websitesLoading,
    isMenuAdmin,
    menuSites.length,
    menuDraftProjects.length,
    websiteCount,
  ]);

  // BEYOND_ADMIN_CONTACT_LOGIC_V1
  const loadAdminContactPhone =
    useCallback(
      async () => {
        if (
          !session?.user?.id ||
          !isMenuAdmin
        ) {
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("app_settings")
          .select("value")
          .eq(
            "key",
            "contact_phone"
          )
          .maybeSingle();

        if (error) {
          console.error(
            "Admin contact phone load failed:",
            error
          );

          return;
        }

        setAdminContactPhone(
          data?.value ||
          "+972-537707072"
        );
      },
      [
        session?.user?.id,
        isMenuAdmin,
      ]
    );

  useEffect(() => {
    if (
      open &&
      isMenuAdmin
    ) {
      loadAdminContactPhone();
    }
  }, [
    open,
    isMenuAdmin,
    loadAdminContactPhone,
  ]);


  async function handleSaveAdminContact(
    event
  ) {
    event.preventDefault();

    if (
      !isMenuAdmin ||
      !session?.user?.id
    ) {
      return;
    }

    const clean =
      adminContactPhone.trim();

    const digits =
      clean.replace(
        /\D/g,
        ""
      );

    if (
      !clean.startsWith("+") ||
      digits.length < 9
    ) {
      setAdminContactMessage(
        "Enter the phone number in international format, for example +972-537707072."
      );

      return;
    }

    setAdminContactSaving(true);
    setAdminContactMessage("");

    const {
      error,
    } = await supabase
      .from("app_settings")
      .upsert(
        {
          key:
            "contact_phone",

          value:
            clean,

          updated_by:
            session.user.id,

          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            "key",
        }
      );

    if (error) {
      console.error(
        "Contact phone update failed:",
        error
      );

      setAdminContactMessage(
        "Could not update the contact number."
      );

      setAdminContactSaving(false);

      return;
    }

    setAdminContactPhone(
      clean
    );

    setAdminContactMessage(
      "Website contact number updated."
    );

    window.dispatchEvent(
      new CustomEvent(
        "beyond-contact-phone-updated",
        {
          detail: {
            phone:
              clean,
          },
        }
      )
    );

    setAdminContactSaving(false);
  }


  // BEYOND_ADMIN_REQUESTS_IN_MY_WEBSITES_V1
  const loadAdminRestaurantRequests =
    useCallback(
      async () => {
        if (
          !session?.user?.id ||
          !isMenuAdmin
        ) {
          setAdminRestaurantRequests([]);
          setAdminRequestsLoading(false);
          return;
        }

        setAdminRequestsLoading(true);

        const [
          requestsResult,
          subscriptionsResult,
          businessesResult,
          directoryResult,
        ] = await Promise.all([
          supabase
            .from("website_requests")
            .select(
              "id,user_id,subscription_id,restaurant_name,plan_id,status,site_id,created_at,updated_at"
            )
            .order(
              "created_at",
              { ascending: false }
            ),

          supabase
            .from("website_subscriptions")
            .select(
              "id,user_id,plan_id,status,current_period_start,current_period_end,created_at"
            ),

          supabase
            .from("business_accounts")
            .select(
              "user_id,restaurant_name,contact_name,phone,requested_plan"
            ),

          supabase
            .from("menu_user_directory")
            .select(
              "user_id,email"
            ),
        ]);

        const requestError =
          requestsResult.error ||
          subscriptionsResult.error ||
          businessesResult.error ||
          directoryResult.error;

        if (requestError) {
          console.error(
            "Admin restaurant requests load failed:",
            requestError
          );

          setAdminRestaurantRequests([]);
          setAdminRequestsLoading(false);
          return;
        }

        const subscriptions =
          new Map(
            (subscriptionsResult.data || [])
              .map(item => [
                item.id,
                item
              ])
          );

        const businesses =
          new Map(
            (businessesResult.data || [])
              .map(item => [
                item.user_id,
                item
              ])
          );

        const emails =
          new Map(
            (directoryResult.data || [])
              .map(item => [
                item.user_id,
                item.email
              ])
          );

        const combined =
          (requestsResult.data || [])
            .map(request => ({
              ...request,

              subscription:
                subscriptions.get(
                  request.subscription_id
                ) || null,

              business:
                businesses.get(
                  request.user_id
                ) || null,

              customerEmail:
                emails.get(
                  request.user_id
                ) || "",
            }));

        setAdminRestaurantRequests(
          combined
        );

        setAdminRequestsLoading(false);
      },
      [
        session?.user?.id,
        isMenuAdmin,
      ]
    );

  useEffect(() => {
    if (!open) {
      return;
    }

    loadAdminRestaurantRequests();
  }, [
    open,
    loadAdminRestaurantRequests,
  ]);

  // BEYOND_RESTAURANT_SERVICE_V1
  const loadRestaurantService =
    useCallback(
      async () => {
        if (!session?.user?.id) {
          setBusinessAccount(null);
          setRestaurantSubscription(null);
          setWebsiteRequest(null);
          setRestaurantServiceLoading(false);
          return;
        }

        setRestaurantServiceLoading(true);

        const {
          data: business,
          error: businessError,
        } = await supabase
          .from("business_accounts")
          .select(
            "user_id,restaurant_name,contact_name,phone,requested_plan,created_at,updated_at"
          )
          .eq(
            "user_id",
            session.user.id
          )
          .maybeSingle();

        if (businessError) {
          console.error(
            "Business account load failed:",
            businessError
          );

          setBusinessAccount(null);
          setRestaurantSubscription(null);
          setWebsiteRequest(null);
          setRestaurantServiceLoading(false);
          return;
        }

        setBusinessAccount(
          business || null
        );

        if (!business) {
          setRestaurantSubscription(null);
          setWebsiteRequest(null);
          setRestaurantServiceLoading(false);
          return;
        }

        const [
          subscriptionResult,
          requestResult,
        ] = await Promise.all([
          supabase
            .from("website_subscriptions")
            .select(
              "id,user_id,plan_id,status,payment_provider,current_period_start,current_period_end,cancelled_at,created_at,updated_at"
            )
            .eq(
              "user_id",
              session.user.id
            )
            .order(
              "created_at",
              { ascending: false }
            )
            .limit(1)
            .maybeSingle(),

          supabase
            .from("website_requests")
            .select(
              "id,user_id,subscription_id,restaurant_name,plan_id,status,site_id,created_at,updated_at"
            )
            .eq(
              "user_id",
              session.user.id
            )
            .order(
              "created_at",
              { ascending: false }
            )
            .limit(1)
            .maybeSingle(),
        ]);

        if (subscriptionResult.error) {
          console.error(
            "Restaurant subscription load failed:",
            subscriptionResult.error
          );
        }

        if (requestResult.error) {
          console.error(
            "Website request load failed:",
            requestResult.error
          );
        }

        setRestaurantSubscription(
          subscriptionResult.data || null
        );

        setWebsiteRequest(
          requestResult.data || null
        );

        setRestaurantServiceLoading(false);
      },
      [session?.user?.id]
    );

  useEffect(() => {
    if (!open) {
      return;
    }

    loadRestaurantService();
  }, [
    open,
    loadRestaurantService,
  ]);

  useEffect(() => {
    if (
      activeTab === "restaurantService" &&
      !restaurantServiceLoading &&
      !businessAccount
    ) {
      setActiveTab("overview");
    }
  }, [
    activeTab,
    restaurantServiceLoading,
    businessAccount,
  ]);

  async function handleAdminLinkRestaurantSite(
    request
  ) {
    const siteId =
      adminSiteSelections[
        request.id
      ] || "";

    if (!siteId) {
      setAdminRequestMessage(
        "Choose a website first."
      );
      return;
    }

    const site =
      menuSites.find(
        item =>
          item.id === siteId
      );

    if (!site) {
      setAdminRequestMessage(
        "Selected website could not be found."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Link "${site.name}" to "${request.restaurant_name}"?

` +
        "This will transfer website ownership to that restaurant customer."
      );

    if (!confirmed) {
      return;
    }

    setAdminLinkingRequest(
      request.id
    );

    setAdminRequestMessage("");

    try {
      const {
        data,
        error: linkError,
      } = await supabase.rpc(
        "admin_link_restaurant_site",
        {
          p_request_id:
            request.id,

          p_site_id:
            siteId,
        }
      );

      if (linkError) {
        throw linkError;
      }

      await Promise.all([
        loadMenuSites(),
        loadAdminRestaurantRequests(),
      ]);

      setAdminSiteSelections(
        current => ({
          ...current,
          [request.id]: "",
        })
      );

      setAdminRequestMessage(
        `${data?.site_name || site.name} linked successfully.`
      );
    } catch (linkError) {
      console.error(
        "Admin website link failed:",
        linkError
      );

      setAdminRequestMessage(
        linkError?.message ||
          "Could not link the website."
      );
    } finally {
      setAdminLinkingRequest("");
    }
  }

  async function handleRedeemRestaurantPromo() {
    const code =
      restaurantPromoCode.trim();

    if (!code) {
      setRestaurantPromoMessage(
        "Enter a promo code."
      );
      return;
    }

    setRestaurantPromoLoading(true);
    setRestaurantPromoMessage("");
    setError("");

    try {
      const {
        data,
        error: promoError,
      } = await supabase.rpc(
        "redeem_restaurant_promo",
        {
          p_code: code,
        }
      );

      if (promoError) {
        throw promoError;
      }

      setRestaurantPromoCode("");

      await loadRestaurantService();

      setRestaurantPromoMessage(
        data?.success
          ? "Promo applied successfully. Your restaurant subscription is now active."
          : "Promo could not be applied."
      );
    } catch (promoError) {
      console.error(
        "Restaurant promo failed:",
        promoError
      );

      setRestaurantPromoMessage(
        promoError?.message ||
          "Promo code could not be applied."
      );
    } finally {
      setRestaurantPromoLoading(false);
    }
  }

  async function handleStartRestaurantSubscription() {
    if (!businessAccount) {
      return;
    }

    setRestaurantServiceActionLoading(true);
    setRestaurantServiceMessage("");
    setError("");

    try {
      const {
        data,
        error: startError,
      } = await supabase.rpc(
        "start_restaurant_subscription"
      );

      if (startError) {
        throw startError;
      }

      await loadRestaurantService();

      setRestaurantServiceMessage(
        data?.created
          ? "Subscription request created. No payment has been taken yet."
          : "Your subscription request is already prepared."
      );
    } catch (startError) {
      console.error(
        "Restaurant subscription start failed:",
        startError
      );

      setRestaurantServiceMessage(
        startError?.message ||
          "Could not prepare the subscription."
      );
    } finally {
      setRestaurantServiceActionLoading(false);
    }
  }

  // BEYOND_COMMUNITY_ACCOUNT_V1
  const loadCommunityShares =
    useCallback(
      async () => {
        if (!session?.user?.id) {
          setCommunityShares([]);
          return;
        }

        try {
          const data =
            await listUserCommunityShares(
              session.user.id
            );

          setCommunityShares(
            data || []
          );
        } catch (
          communityError
        ) {
          console.error(
            "Community shares load failed:",
            communityError
          );
        }
      },
      [session?.user?.id]
    );

  useEffect(() => {
    if (!open) return;
    loadCommunityShares();
  }, [
    open,
    loadCommunityShares,
  ]);

  function communityShareFor(
    sourceType,
    sourceId
  ) {
    return communityShares.find(
      (item) =>
        item.source_type ===
          sourceType &&
        item.source_id ===
          sourceId
    );
  }

  function communityCreatorName() {
    return (
      profile?.full_name ||
      session?.user
        ?.user_metadata
        ?.full_name ||
      session?.user?.email
        ?.split("@")[0] ||
      "BEYOND Creator"
    );
  }

  async function shareProjectToCommunity(
    project
  ) {
    const key =
      `project:${project.id}`;

    setCommunityBusyKey(
      key
    );
    setError("");

    try {
      await publishProjectToCommunity({
        project,
        userId:
          session.user.id,
        creatorName:
          communityCreatorName(),
      });

      await loadCommunityShares();

      window.dispatchEvent(
        new Event(
          "beyond-community-refresh"
        )
      );
    } catch (
      communityError
    ) {
      console.error(
        "Project Community share failed:",
        communityError
      );
      setError(
        communityError?.message ||
          "Could not share this project."
      );
    } finally {
      setCommunityBusyKey(
        null
      );
    }
  }

  async function shareAiModelToCommunity(
    generation
  ) {
    const key =
      `ai_model:${generation.id}`;

    setCommunityBusyKey(
      key
    );
    setError("");

    try {
      await publishAiModelToCommunity({
        generation,
        userId:
          session.user.id,
        creatorName:
          communityCreatorName(),
      });

      await loadCommunityShares();

      window.dispatchEvent(
        new Event(
          "beyond-community-refresh"
        )
      );
    } catch (
      communityError
    ) {
      console.error(
        "AI Community share failed:",
        communityError
      );
      setError(
        communityError?.message ||
          "Could not share this AI model."
      );
    } finally {
      setCommunityBusyKey(
        null
      );
    }
  }

  async function removeCommunityShare(
    sourceType,
    sourceId
  ) {
    const key =
      `${sourceType}:${sourceId}`;

    setCommunityBusyKey(
      key
    );
    setError("");

    try {
      await unpublishCommunitySource({
        userId:
          session.user.id,
        sourceType,
        sourceId,
      });

      setCommunityShares(
        (current) =>
          current.filter(
            (item) =>
              !(
                item.source_type ===
                  sourceType &&
                item.source_id ===
                  sourceId
              )
          )
      );

      window.dispatchEvent(
        new Event(
          "beyond-community-refresh"
        )
      );
    } catch (
      communityError
    ) {
      console.error(
        "Community unpublish failed:",
        communityError
      );
      setError(
        communityError?.message ||
          "Could not remove this creation from Community."
      );
    } finally {
      setCommunityBusyKey(
        null
      );
    }
  }

  // BEYOND_PROJECT_ACTIONS_PHASE_2
  async function renameProject(
    project
  ) {
    const nextName =
      window.prompt(
        "Rename BEYOND project",
        project.name ||
          "Untitled Project"
      );

    if (nextName == null) {
      return;
    }

    const cleanName =
      nextName.trim();

    if (!cleanName) {
      setError(
        "Project name cannot be empty."
      );
      return;
    }

    const {
      data,
      error: renameError,
    } = await supabase
      .from("projects")
      .update({
        name: cleanName,
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq("id", project.id)
      .eq(
        "user_id",
        session.user.id
      )
      .select()
      .single();

    if (renameError) {
      console.error(
        "Project rename failed:",
        renameError
      );
      setError(
        "Could not rename project."
      );
      return;
    }

    setProjects((current) =>
      current
        .map((item) =>
          item.id === data.id
            ? data
            : item
        )
        .sort(
          (a, b) =>
            new Date(
              b.updated_at || 0
            ) -
            new Date(
              a.updated_at || 0
            )
        )
    );

    window.dispatchEvent(
      new CustomEvent(
        "beyond-project-renamed",
        { detail: data }
      )
    );
  }

  async function duplicateProject(
    project
  ) {
    const now =
      new Date()
        .toISOString();

    const {
      data,
      error: duplicateError,
    } = await supabase
      .from("projects")
      .insert({
        user_id:
          session.user.id,
        name:
          `${project.name || "Untitled Project"} Copy`,
        project_type:
          project.project_type ||
          "creator",
        project_data: {
          ...(project.project_data || {}),
          duplicatedFrom:
            project.id,
          savedAt: now,
        },
        thumbnail_url:
          project.thumbnail_url ||
          null,
        visibility:
          "private",
        updated_at: now,
      })
      .select()
      .single();

    if (duplicateError) {
      console.error(
        "Project duplicate failed:",
        duplicateError
      );
      setError(
        "Could not duplicate project."
      );
      return;
    }

    setProjects((current) => [
      data,
      ...current,
    ]);
  }

  async function deleteProject(project) {
    const confirmed =
      window.confirm(
        `Delete “${project.name}”? This cannot be undone.`
      );

    if (!confirmed) return;

    const { error: deleteError } =
      await supabase
        .from("projects")
        .delete()
        .eq("id", project.id)
        .eq(
          "user_id",
          session.user.id
        );

    if (deleteError) {
      console.error(
        "Project delete failed:",
        deleteError
      );
      setError(
        "Could not delete project."
      );
      return;
    }

    setProjects((current) =>
      current.filter(
        (item) =>
          item.id !== project.id
      )
    );
  }

  useEffect(() => {
    setFullName(
      profile?.full_name ||
        session?.user
          ?.user_metadata
          ?.full_name ||
        ""
    );

    setPhone(
      profile?.phone ||
        ""
    );
  }, [
    profile,
    session,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(
      event
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    }

    const originalOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style
        .overflow =
        originalOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
    onClose,
  ]);

  const readyModels =
    useMemo(
      () =>
        models.filter(
          (item) =>
            item.status ===
            "SUCCEEDED"
        ).length,
      [models]
    );

  /*
    My Websites includes both:

      menu_projects -> private generated DRAFT websites
      menu_sites    -> activated website records
  */


  const activeOrders =
    useMemo(
      () =>
        orders.filter(
          (item) =>
            ![
              "Completed",
            ].includes(
              item.status
            )
        ).length,
      [orders]
    );

  async function handleSaveProfile(
    event
  ) {
    event.preventDefault();

    if (
      !session?.user?.id
    ) {
      return;
    }

    setSavingProfile(
      true
    );

    setProfileMessage(
      ""
    );

    const {
      data,
      error:
        updateError,
    } =
      await supabase
        .from(
          "profiles"
        )
        .update({
          full_name:
            fullName.trim(),
          phone:
            phone.trim(),
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          session.user.id
        )
        .select()
        .single();

    if (
      updateError
    ) {
      console.error(
        "Profile update failed:",
        updateError
      );

      setProfileMessage(
        "Could not update profile."
      );
    } else {
      setProfileMessage(
        "Profile updated."
      );

      onProfileUpdated?.(
        data
      );
    }

    setSavingProfile(
      false
    );
  }

  function useModel(
    generation
  ) {
    const modelData = {
      generationId:
        generation.id,

      meshyTaskId:
        generation.meshy_task_id,

      mode:
        generation.mode,

      prompt:
        generation.prompt,

      status:
        generation.status,

      model3mfUrl:
        generation.model_3mf_url,

      model3mfStoragePath:
        generation.model_3mf_storage_path,

      thumbnailUrl:
        generation.thumbnail_url,

      thumbnailStoragePath:
        generation.thumbnail_storage_path,
    };

    sessionStorage.setItem(
      "beyondSelectedAiModel",
      JSON.stringify(
        modelData
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "beyond-ai-model-selected",
        {
          detail:
            modelData,
        }
      )
    );

    onClose();

    window.setTimeout(
      () => {
        document
          .getElementById(
            "start"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",
            block:
              "start",
          });
      },
      100
    );
  }

  async function savePermanently(
    generation
  ) {
    if (
      !session?.access_token
    ) {
      return;
    }

    setArchivingId(
      generation.id
    );

    try {
      const response =
        await fetch(
          "/.netlify/functions/archive-ai-model",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                generationId:
                  generation.id,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Unable to save model."
        );
      }

      await loadAccountData();
    } catch (
      archiveError
    ) {
      console.error(
        archiveError
      );

      setError(
        archiveError.message ||
          "Unable to save model permanently."
      );
    } finally {
      setArchivingId(
        null
      );
    }
  }

  if (
    !open ||
    !session
  ) {
    return null;
  }

  const accountName =
    profile?.full_name ||
    session.user
      ?.user_metadata
      ?.full_name ||
    session.user
      ?.email ||
    "Customer";

  return (
    <div
      className="account-backdrop"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="account-panel"
        role="dialog"
        aria-modal="true"
        aria-label="My account"
      >
        <aside className="account-sidebar">
          <div className="account-sidebar-top">
            <div className="account-brand">
              BEYOND
            </div>

            <button
              type="button"
              className="account-close-mobile"
              onClick={
                onClose
              }
            >
              <X
                size={18}
                strokeWidth={
                  1.6
                }
              />
            </button>
          </div>

          <div className="account-person">
            <div className="account-avatar">
              {accountName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {accountName}
              </strong>

              <span>
                {
                  session.user
                    ?.email
                }
              </span>
            </div>
          </div>

          <nav className="account-nav">
            <button
              type="button"
              className={
                activeTab ===
                "overview"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "overview"
                )
              }
            >
              <Sparkles
                size={16}
                strokeWidth={
                  1.5
                }
              />

              Overview
            </button>

            {orders.length > 0 && (
              <button
                type="button"
                className={
                  activeTab ===
                  "orders"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveTab(
                    "orders"
                  )
                }
              >
                <PackageCheck
                  size={16}
                  strokeWidth={1.5}
                />

                My Orders

                <span>
                  {orders.length}
                </span>
              </button>
            )}

            {projects.length > 0 && (
              <button
                type="button"
                className={
                  activeTab ===
                  "projects"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveTab(
                    "projects"
                  )
                }
              >
                <FolderOpen
                  size={16}
                  strokeWidth={1.5}
                />

                My Projects

                <span>
                  {projects.length}
                </span>
              </button>
            )}

            {models.length > 0 && (
              <button
                type="button"
                className={
                  activeTab ===
                  "models"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveTab(
                    "models"
                  )
                }
              >
                <Box
                  size={16}
                  strokeWidth={1.5}
                />

                My Models

                <span>
                  {models.length}
                </span>
              </button>
            )}

            {(isMenuAdmin ||
              websiteCount > 0) && (
              <button
                type="button"
                className={
                  activeTab ===
                  "websites"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveTab(
                    "websites"
                  )
                }
              >
                <Globe2
                  size={16}
                  strokeWidth={
                    1.5
                  }
                />

                {isMenuAdmin ||
                websiteCount > 1
                  ? "My Websites"
                  : "My Website"}

                <span>
                  {
                    websiteCount
                  }
                </span>
              </button>
            )}

            {businessAccount && (
              <button
                type="button"
                className={
                  activeTab ===
                  "restaurantService"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveTab(
                    "restaurantService"
                  )
                }
              >
                <Store
                  size={16}
                  strokeWidth={1.5}
                />

                Restaurant Service
              </button>
            )}

            {(isMenuAdmin ||
              (businessAccount &&
                menuSites.length > 0)) && (

              <button
                type="button"
                onClick={() => {
                    window.open(
                      isMenuAdmin
                        ? "/menu-studio"
                        : `/menu-studio?site=${menuSites[0].id}`,
                      "beyond-menu-studio",
                      "width=1440,height=950,noopener,noreferrer"
                    );
                  }}
              >
                <Settings2
                  size={16}
                  strokeWidth={1.5}
                />

                Menu Studio
              </button>
            )}

            {/* BEYOND_ADMIN_SETTINGS_TAB_V1 */}
            {isMenuAdmin && (
              <button
                type="button"
                className={
                  activeTab ===
                  "adminSettings"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveTab(
                    "adminSettings"
                  )
                }
              >
                <ShieldCheck
                  size={16}
                  strokeWidth={1.5}
                />

                Admin Settings
              </button>
            )}

            <button
              type="button"
              className={
                activeTab ===
                "profile"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "profile"
                )
              }
            >
              <UserRound
                size={16}
                strokeWidth={
                  1.5
                }
              />

              Profile
            </button>
          </nav>

          <button
            type="button"
            className="account-logout"
            onClick={
              onSignOut
            }
          >
            <LogOut
              size={15}
              strokeWidth={
                1.5
              }
            />

            Log out
          </button>
        </aside>

        <div className="account-content">
          <header className="account-content-header">
            <div>
              <span>
                MY ACCOUNT
              </span>

              <h2>
                {activeTab ===
                "overview"
                  ? "Overview"
                  : activeTab ===
                      "orders"
                    ? "My Orders"
                    : activeTab ===
                        "projects"
                      ? "My Projects"
                      : activeTab ===
                          "models"
                        ? "My Models"
                        : activeTab ===
                            "websites"
                          ? "My Websites"
                          : activeTab ===
                              "restaurantService"
                            ? "Restaurant Service"
                            : activeTab ===
                                "adminSettings"
                              ? "Admin Settings"
                              : "Profile"}
              </h2>
            </div>

            <div className="account-header-actions">
              <button
                type="button"
                className="account-refresh"
                onClick={() => {
                  loadAccountData();
                  loadMenuSites();
                  loadRestaurantService();
                  loadAdminRestaurantRequests();

                  if (isMenuAdmin) {
                    loadAdminContactPhone();
                  }
                }}
                disabled={
                  loading
                }
                aria-label="Refresh account"
              >
                <RefreshCw
                  size={16}
                  strokeWidth={
                    1.5
                  }
                />
              </button>

              <button
                type="button"
                className="account-close"
                onClick={
                  onClose
                }
              >
                <X
                  size={18}
                  strokeWidth={
                    1.6
                  }
                />
              </button>
            </div>
          </header>

          {error && (
            <div className="account-error">
              {error}
            </div>
          )}

          {loading ? (
            <div className="account-loading">
              <RefreshCw
                size={22}
                strokeWidth={
                  1.4
                }
              />

              Loading account...
            </div>
          ) : activeTab ===
            "overview" ? (
            <div className="account-overview">
              <div className="account-welcome">
                <span>
                  WELCOME BACK
                </span>

                <h3>
                  {accountName}
                </h3>

                <p>
                  Your BEYOND account
                  keeps your orders and
                  AI-generated models
                  connected in one
                  place.
                </p>
              </div>

              <div className="account-stats">
                <article>
                  <span>
                    TOTAL ORDERS
                  </span>

                  <strong>
                    {
                      orders.length
                    }
                  </strong>

                  <small>
                    {activeOrders} active
                  </small>
                </article>

                <article>
                  <span>
                    AI MODELS
                  </span>

                  <strong>
                    {
                      models.length
                    }
                  </strong>

                  <small>
                    {readyModels} ready
                  </small>
                </article>

                <article>
                  <span>
                    WEBSITES
                  </span>

                  <strong>
                    {
                      websiteCount
                    }
                  </strong>

                  <small>
                    {isMenuAdmin
                      ? `${menuSites.filter(
                          site =>
                            site.published
                        ).length} live · ${menuDraftProjects.length} draft · admin`
                      : `${menuSites.filter(
                          site =>
                            site.published
                        ).length} live · ${menuDraftProjects.length} draft`}
                  </small>
                </article>

                <article>
                  <span>
                    MEMBER SINCE
                  </span>

                  <strong className="account-stat-date">
                    {formatDate(
                      profile
                        ?.created_at ||
                        session.user
                          ?.created_at
                    )}
                  </strong>

                  <small>
                    BEYOND customer
                  </small>
                </article>
              </div>

              <div className="account-recent-grid">
                <section>
                  <div className="account-subheading">
                    <div>
                      <span>
                        RECENT
                      </span>

                      <h3>
                        Orders
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          "orders"
                        )
                      }
                    >
                      View all
                    </button>
                  </div>

                  {orders
                    .slice(
                      0,
                      3
                    )
                    .map(
                      (
                        order
                      ) => (
                        <div
                          className="account-mini-row"
                          key={
                            order.id
                          }
                        >
                          <div>
                            <strong>
                              {makeOrderNumber(
                                order.id
                              )}
                            </strong>

                            <span>
                              {order.project_type ||
                                "3D Printing"}
                            </span>
                          </div>

                          <div className="account-mini-right">
                            <span
                              className={`account-status ${String(
                                order.status ||
                                  "Submitted"
                              ).toLowerCase()}`}
                            >
                              {order.status ||
                                "Submitted"}
                            </span>
                          </div>
                        </div>
                      )
                    )}

                  {!orders.length && (
                    <div className="account-empty-small">
                      No orders yet.
                    </div>
                  )}
                </section>

                <section>
                  <div className="account-subheading">
                    <div>
                      <span>
                        RECENT
                      </span>

                      <h3>
                        AI Models
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          "models"
                        )
                      }
                    >
                      View all
                    </button>
                  </div>

                  {models
                    .slice(
                      0,
                      3
                    )
                    .map(
                      (
                        model
                      ) => (
                        <div
                          className="account-mini-row"
                          key={
                            model.id
                          }
                        >
                          <div>
                            <strong>
                              {modelTitle(
                                model
                              )}
                            </strong>

                            <span>
                              {model.mode ===
                              "photos"
                                ? "Photos to 3D"
                                : "Text to 3D"}
                            </span>
                          </div>

                          <div className="account-mini-right">
                            <span
                              className={`account-status ${String(
                                model.status ||
                                  "PENDING"
                              ).toLowerCase()}`}
                            >
                              {model.status ||
                                "PENDING"}
                            </span>
                          </div>
                        </div>
                      )
                    )}

                  {!models.length && (
                    <div className="account-empty-small">
                      No AI models yet.
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : activeTab ===
            "orders" ? (
            <div className="account-orders">
              {!orders.length ? (
                <div className="account-empty">
                  <PackageCheck
                    size={34}
                    strokeWidth={
                      1.2
                    }
                  />

                  <strong>
                    No orders yet.
                  </strong>

                  <span>
                    Your submitted
                    projects will appear
                    here.
                  </span>
                </div>
              ) : (
                <div className="account-order-list">
                  {orders.map(
                    (
                      order
                    ) => (
                      <article
                        className="account-order-card"
                        key={
                          order.id
                        }
                      >
                        <div className="account-order-number">
                          <span>
                            ORDER
                          </span>

                          <strong>
                            {makeOrderNumber(
                              order.id
                            )}
                          </strong>
                        </div>

                        <div className="account-order-details">
                          <div>
                            <span>
                              PROJECT
                            </span>

                            <strong>
                              {order.project_type ||
                                "3D Printing"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              MATERIAL
                            </span>

                            <strong>
                              {order.material ||
                                "Not specified"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              SOURCE
                            </span>

                            <strong>
                              {order.source_type ===
                              "AI_MODEL"
                                ? "AI Model"
                                : "Uploaded File"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              SUBMITTED
                            </span>

                            <strong>
                              {formatDate(
                                order.created_at
                              )}
                            </strong>
                          </div>
                        </div>

                        <span
                          className={`account-status account-order-status ${String(
                            order.status ||
                              "Submitted"
                          ).toLowerCase()}`}
                        >
                          {order.status ||
                            "Submitted"}
                        </span>
                      </article>
                    )
                  )}
                      </div>
              )}
            </div>
          ) : activeTab ===
            "projects" ? (
            <div className="account-projects">
              {!projects.length ? (
                <div className="account-empty">
                  <FolderOpen
                    size={34}
                    strokeWidth={1.2}
                  />

                  <strong>
                    No saved projects yet.
                  </strong>

                  <span>
                    Save a project in BEYOND Creator and it will appear here.
                  </span>
                </div>
              ) : (
                <div className="account-project-grid">
                  {projects.map(
                    (project) => {
                      const objectCount =
                        project.project_data
                          ?.objects
                          ?.length || 0;

                      const projectCommunityShare =
                        communityShareFor(
                          "project",
                          project.id
                        );

                      return (
                        <article
                          className="account-project-card"
                          key={project.id}
                        >
                          <div className="account-project-preview">
                            {project.thumbnail_url ? (
                              <img
                                src={project.thumbnail_url}
                                alt=""
                              />
                            ) : (
                              <FolderOpen
                                size={42}
                                strokeWidth={1.05}
                              />
                            )}
                          </div>

                          <div className="account-project-body">
                            <span className="account-project-type">
                              {String(
                                project.project_type ||
                                  "CREATOR"
                              ).toUpperCase()}
                            </span>

                            <h3>
                              {project.name ||
                                "Untitled Project"}
                            </h3>

                            <div className="account-project-meta">
                              <span>
                                <Box size={12} />
                                {objectCount} {objectCount === 1 ? "object" : "objects"}
                              </span>

                              <span>
                                <Clock3 size={12} />
                                {formatDate(
                                  project.updated_at ||
                                    project.created_at
                                )}
                              </span>
                            </div>

                            <div className="account-project-actions">
                              <button
                                type="button"
                                className="account-primary-button"
                                onClick={() =>
                                  openProject(project)
                                }
                              >
                                Open Project
                              </button>

                              <button
                                type="button"
                                className="account-project-action-text"
                                onClick={() =>
                                  renameProject(project)
                                }
                              >
                                Rename
                              </button>

                              <button
                                type="button"
                                className="account-project-action-text"
                                onClick={() =>
                                  duplicateProject(project)
                                }
                              >
                                Duplicate
                              </button>

                              <button
                                type="button"
                                className={`account-community-button ${
                                  projectCommunityShare
                                    ? "is-published"
                                    : ""
                                }`}
                                disabled={
                                  communityBusyKey ===
                                  `project:${project.id}`
                                }
                                onClick={() =>
                                  projectCommunityShare
                                    ? removeCommunityShare(
                                        "project",
                                        project.id
                                      )
                                    : shareProjectToCommunity(
                                        project
                                      )
                                }
                              >
                                {communityBusyKey ===
                                `project:${project.id}`
                                  ? "Updating…"
                                  : projectCommunityShare
                                    ? "Remove from Community"
                                    : "Share to Community"}
                              </button>

                              <button
                                type="button"
                                className="account-project-delete"
                                aria-label="Delete project"
                                onClick={() =>
                                  deleteProject(project)
                                }
                              >
                                <Trash2
                                  size={15}
                                  strokeWidth={1.45}
                                />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          ) : activeTab ===
            "models" ? (
            <div className="account-models">
              {!models.length ? (
                <div className="account-empty">
                  <Box
                    size={34}
                    strokeWidth={
                      1.2
                    }
                  />

                  <strong>
                    No AI models yet.
                  </strong>

                  <span>
                    Models generated in
                    AI Studio will
                    appear here.
                  </span>
                </div>
              ) : (
                <div className="account-model-grid">
                  {models.map(
                    (
                      generation
                    ) => {
                      const ready =
                        generation.status ===
                        "SUCCEEDED";

                      const archived =
                        Boolean(
                          generation
                            .model_3mf_storage_path ||
                          generation
                            .glb_storage_path
                        );

                      const aiCommunityShare =
                        communityShareFor(
                          "ai_model",
                          generation.id
                        );

                      return (
                        <article
                          className="account-model-card"
                          key={
                            generation.id
                          }
                        >
                          <div className="account-model-preview">
                            {generation.thumbnail_url ? (
                              <img
                                src={
                                  generation.thumbnail_url
                                }
                                alt=""
                              />
                            ) : (
                              <Box
                                size={44}
                                strokeWidth={
                                  1.1
                                }
                              />
                            )}

                            <span
                              className={`account-status account-model-status ${String(
                                generation.status ||
                                  "PENDING"
                              ).toLowerCase()}`}
                            >
                              {generation.status ||
                                "PENDING"}
                            </span>
                          </div>

                          <div className="account-model-body">
                            <span className="account-model-type">
                              {generation.mode ===
                              "photos"
                                ? "PHOTOS TO 3D"
                                : "TEXT TO 3D"}
                            </span>

                            <h3>
                              {modelTitle(
                                generation
                              )}
                            </h3>

                            <div className="account-model-info">
                              <div>
                                <Clock3
                                  size={12}
                                  strokeWidth={
                                    1.4
                                  }
                                />

                                {formatDate(
                                  generation.created_at
                                )}
                              </div>

                              <div>
                                {archived ? (
                                  <>
                                    <Check
                                      size={12}
                                      strokeWidth={
                                        1.6
                                      }
                                    />

                                    Saved
                                  </>
                                ) : (
                                  <>
                                    <FileBox
                                      size={12}
                                      strokeWidth={
                                        1.4
                                      }
                                    />

                                    Meshy
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="account-model-actions">
                              {ready &&
                                !archived && (
                                <button
                                  type="button"
                                  className="account-secondary-button"
                                  disabled={
                                    archivingId ===
                                    generation.id
                                  }
                                  onClick={() =>
                                    savePermanently(
                                      generation
                                    )
                                  }
                                >
                                  <Save
                                    size={14}
                                    strokeWidth={
                                      1.5
                                    }
                                  />

                                  {archivingId ===
                                  generation.id
                                    ? "Saving..."
                                    : "Save Permanently"}
                                </button>
                              )}

                              {ready && (
                                <button
                                  type="button"
                                  className={`account-community-button ${
                                    aiCommunityShare
                                      ? "is-published"
                                      : ""
                                  }`}
                                  disabled={
                                    communityBusyKey ===
                                    `ai_model:${generation.id}`
                                  }
                                  onClick={() =>
                                    aiCommunityShare
                                      ? removeCommunityShare(
                                          "ai_model",
                                          generation.id
                                        )
                                      : shareAiModelToCommunity(
                                          generation
                                        )
                                  }
                                >
                                  {communityBusyKey ===
                                  `ai_model:${generation.id}`
                                    ? "Updating…"
                                    : aiCommunityShare
                                      ? "Remove from Community"
                                      : "Share to Community"}
                                </button>
                              )}

                              <button
                                type="button"
                                className="account-primary-button"
                                disabled={
                                  !ready
                                }
                                onClick={() =>
                                  useModel(
                                    generation
                                  )
                                }
                              >
                                Use This Model
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          ) : activeTab ===
            "websites" ? (
            <div className="account-websites">

              <div className="account-websites-intro">
                <div className="account-websites-intro-copy">

                  <div className="account-websites-icon">
                    <Globe2
                      size={25}
                      strokeWidth={1.25}
                    />
                  </div>

                  <div>
                    <span>
                      {isMenuAdmin
                        ? "BEYOND ADMIN"
                        : "MY WEBSITES"}
                    </span>

                    <h3>
                      {isMenuAdmin
                        ? "Website portfolio"
                        : "Your websites"}
                    </h3>

                    <p>
                      {isMenuAdmin
                        ? "View and manage every restaurant website connected to BEYOND."
                        : "View and manage the restaurant websites connected to your BEYOND account."}
                    </p>
                  </div>

                </div>

                {isMenuAdmin && (
                  <button
                    type="button"
                    className="account-websites-admin-button"
                    onClick={() => {
                      window.location.href =
                        "/admin/menus";
                    }}
                  >
                    <ShieldCheck
                      size={14}
                      strokeWidth={1.5}
                    />

                    Website Admin
                  </button>
                )}
              </div>

              {isMenuAdmin && (
                <section className="account-admin-requests">

                  <div className="account-admin-requests-head">
                    <div>
                      <span>
                        RESTAURANT REQUESTS
                      </span>

                      <h3>
                        Waiting for setup
                      </h3>

                      <p>
                        Subscription requests that have
                        not yet become an assigned
                        restaurant website.
                      </p>
                    </div>

                    <strong>
                      {
                        adminRestaurantRequests
                          .filter(
                            request =>
                              !request.site_id
                          )
                          .length
                      }
                    </strong>
                  </div>

                  {adminRequestMessage && (
                    <div className="account-admin-request-message">
                      {adminRequestMessage}
                    </div>
                  )}

                  {adminRequestsLoading ? (
                    <div className="account-admin-requests-empty">
                      Loading requests...
                    </div>
                  ) : !adminRestaurantRequests
                      .filter(
                        request =>
                          !request.site_id
                      )
                      .length ? (
                    <div className="account-admin-requests-empty">
                      No restaurant requests waiting for setup.
                    </div>
                  ) : (
                    <div className="account-admin-request-grid">

                      {adminRestaurantRequests
                        .filter(
                          request =>
                            !request.site_id
                        )
                        .map(request => {

                          const plan =
                            request.plan_id ||
                            request.subscription?.plan_id ||
                            request.business?.requested_plan ||
                            "basic";

                          const paymentStatus =
                            request.subscription?.status ||
                            "pending_payment";

                          return (
                            <article
                              className="account-admin-request-card"
                              key={request.id}
                            >

                              <div className="account-admin-request-card-top">

                                <span className="account-admin-request-badge">
                                  {
                                    String(plan)
                                      .toUpperCase()
                                  }
                                </span>

                                <span className="account-admin-request-payment">
                                  {
                                    formatServiceStatus(
                                      paymentStatus
                                    )
                                  }
                                </span>

                              </div>

                              <h3>
                                {
                                  request.restaurant_name ||
                                  request.business?.restaurant_name ||
                                  "Restaurant"
                                }
                              </h3>

                              <div className="account-admin-request-email">
                                {
                                  request.customerEmail ||
                                  "No customer email"
                                }
                              </div>

                              <div className="account-admin-request-meta">

                                <div>
                                  <span>
                                    WEBSITE
                                  </span>

                                  <strong>
                                    Not assigned
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    SETUP STATUS
                                  </span>

                                  <strong>
                                    {
                                      formatServiceStatus(
                                        request.status
                                      )
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    CONTACT
                                  </span>

                                  <strong>
                                    {
                                      request.business
                                        ?.contact_name ||
                                      "—"
                                    }
                                  </strong>
                                </div>

                              </div>

                              {request.business?.phone && (
                                <div className="account-admin-request-phone">
                                  {
                                    request.business.phone
                                  }
                                </div>
                              )}

                              <div className="account-admin-link-site">

                                <select
                                  value={
                                    adminSiteSelections[
                                      request.id
                                    ] || ""
                                  }
                                  onChange={event =>
                                    setAdminSiteSelections(
                                      current => ({
                                        ...current,
                                        [request.id]:
                                          event.target.value,
                                      })
                                    )
                                  }
                                >
                                  <option value="">
                                    Select existing website
                                  </option>

                                  {menuSites.map(site => (
                                    <option
                                      key={site.id}
                                      value={site.id}
                                    >
                                      {site.name}
                                      {site.published
                                        ? " — LIVE"
                                        : " — DRAFT"}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  className="account-primary-button"
                                  disabled={
                                    !adminSiteSelections[
                                      request.id
                                    ] ||
                                    adminLinkingRequest ===
                                      request.id ||
                                    request.subscription
                                      ?.status !==
                                      "active"
                                  }
                                  onClick={() =>
                                    handleAdminLinkRestaurantSite(
                                      request
                                    )
                                  }
                                >
                                  {adminLinkingRequest ===
                                  request.id
                                    ? "Linking..."
                                    : "Link Existing Website"}
                                </button>

                              </div>

                              <button
                                type="button"
                                className="account-secondary-button"
                                onClick={() => {
                                  window.location.href =
                                    "/admin/menus";
                                }}
                              >
                                <Settings2
                                  size={13}
                                  strokeWidth={1.5}
                                />

                                Manage Request
                              </button>

                            </article>
                          );
                        })}

                    </div>
                  )}

                </section>
              )}

              {websitesLoading ? (
                <div className="account-loading">
                  <RefreshCw
                    size={22}
                    strokeWidth={1.4}
                  />

                  Loading websites...
                </div>
              ) : websiteCount === 0 ? (
                <div className="account-empty account-websites-empty">
                  <Globe2
                    size={38}
                    strokeWidth={1.1}
                  />

                  <strong>
                    No websites yet.
                  </strong>

                  <span>
                    Generate a restaurant menu and it will appear here automatically as a draft website.
                  </span>
                </div>
              ) : (
                <>
                  {menuDraftProjects.length > 0 && (
                    <section className="account-generated-websites">
                      <div className="account-generated-websites-head">
                        <div>
                          <span>
                            GENERATED WITH BEYOND AI
                          </span>

                          <h3>
                            Website drafts
                          </h3>

                          <p>
                            Your private generated websites. Continue editing anytime before publishing.
                          </p>
                        </div>

                        <strong>
                          {menuDraftProjects.length}
                        </strong>
                      </div>


                      <div className="account-website-grid">
                        {menuDraftProjects.map(
                          draft => {
                            const draftMenu =
                              draft.structured_menu ||
                              {};

                            const draftBranding =
                              draftMenu.branding ||
                              {};

                            const draftName =
                              draftBranding.display_name ||
                              draftMenu.restaurant_name ||
                              draft.name ||
                              "Untitled website";

                            const sections =
                              Array.isArray(
                                draftMenu.sections
                              )
                                ? draftMenu.sections.length
                                : 0;

                            const languages =
                              Array.isArray(
                                draftMenu.requested_languages
                              )
                                ? draftMenu
                                    .requested_languages
                                    .length
                                : 0;


                            return (
                              <article
                                className="account-website-card account-generated-website-card"
                                key={draft.id}
                              >
                                <div className="account-website-card-top">
                                  <div>
                                    <span className="account-website-status draft">
                                      ● DRAFT
                                    </span>

                                    <h3>
                                      {draftName}
                                    </h3>
                                  </div>

                                  <span className="account-generated-ai-badge">
                                    <Sparkles
                                      size={11}
                                      strokeWidth={1.5}
                                    />

                                    AI GENERATED
                                  </span>
                                </div>


                                <div className="account-website-url account-generated-draft-url">
                                  Private draft · Not published
                                </div>


                                <div className="account-website-meta">
                                  <div>
                                    <span>
                                      STATUS
                                    </span>

                                    <strong>
                                      Draft
                                    </strong>
                                  </div>

                                  <div>
                                    <span>
                                      TYPE
                                    </span>

                                    <strong>
                                      Digital Menu
                                    </strong>
                                  </div>

                                  <div>
                                    <span>
                                      SECTIONS
                                    </span>

                                    <strong>
                                      {sections}
                                    </strong>
                                  </div>

                                  <div>
                                    <span>
                                      LANGUAGES
                                    </span>

                                    <strong>
                                      {languages || "—"}
                                    </strong>
                                  </div>
                                </div>


                                <div className="account-website-actions">
                                  <button
                                    type="button"
                                    className="account-primary-button"
                                    onClick={() =>
                                      window.open(
                                        `/menu-builder?project=${encodeURIComponent(
                                          draft.id
                                        )}`,
                                        "_blank",
                                        "noopener,noreferrer"
                                      )
                                    }
                                  >
                                    <Settings2
                                      size={13}
                                      strokeWidth={1.5}
                                    />

                                    Continue Editing
                                  </button>


                                  <button
                                    type="button"
                                    className="account-secondary-button"
                                    disabled
                                  >
                                    <ExternalLink
                                      size={13}
                                      strokeWidth={1.5}
                                    />

                                    Not Live Yet
                                  </button>
                                </div>


                                <div className="account-generated-draft-date">
                                  Last edited{" "}
                                  {formatDate(
                                    draft.updated_at ||
                                    draft.created_at
                                  )}
                                </div>
                              </article>
                            );
                          }
                        )}
                      </div>
                    </section>
                  )}


                  {menuSites.length > 0 && (
                    <section className="account-activated-websites">
                      {menuDraftProjects.length > 0 && (
                        <div className="account-generated-websites-head account-live-websites-head">
                          <div>
                            <span>
                              ACTIVATED
                            </span>

                            <h3>
                              Restaurant websites
                            </h3>
                          </div>

                          <strong>
                            {menuSites.length}
                          </strong>
                        </div>
                      )}


                      <div className="account-website-grid">
                        {menuSites.map(
                          site => (
                            <article
                              className="account-website-card"
                              key={site.id}
                            >
                              <div className="account-website-card-top">
                                <div>
                                  <span
                                    className={`account-website-status ${
                                      site.published
                                        ? "live"
                                        : "draft"
                                    }`}
                                  >
                                    {site.published
                                      ? "● LIVE"
                                      : "● DRAFT"}
                                  </span>

                                  <h3>
                                    {site.name ||
                                      "Untitled website"}
                                  </h3>
                                </div>


                                {isMenuAdmin && (
                                  <span className="account-website-admin-badge">
                                    <ShieldCheck
                                      size={11}
                                      strokeWidth={1.5}
                                    />

                                    ADMIN
                                  </span>
                                )}
                              </div>


                              <div className="account-website-url">
                                /menu/{site.slug}
                              </div>


                              <div className="account-website-meta">
                                <div>
                                  <span>
                                    STATUS
                                  </span>

                                  <strong>
                                    {site.published
                                      ? "Published"
                                      : "Draft"}
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    ACCESS
                                  </span>

                                  <strong>
                                    {isMenuAdmin
                                      ? "Administrator"
                                      : "Customer"}
                                  </strong>
                                </div>
                              </div>


                              <div className="account-website-actions">
                                <button
                                  type="button"
                                  className="account-primary-button"
                                  disabled={!site.published}
                                  onClick={() =>
                                    window.open(
                                      `/menu/${encodeURIComponent(
                                        site.slug ||
                                        ""
                                      )}`,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                >
                                  <ExternalLink
                                    size={13}
                                    strokeWidth={1.5}
                                  />

                                  {site.published
                                    ? "Open Website"
                                    : "Not Live Yet"}
                                </button>


                                <button
                                  type="button"
                                  className="account-secondary-button"
                                  onClick={() => {
                                    window.location.href =
                                      `/menu-studio?site=${encodeURIComponent(
                                        site.id
                                      )}`;
                                  }}
                                >
                                  <Settings2
                                    size={13}
                                    strokeWidth={1.5}
                                  />

                                  Manage Website
                                </button>
                              </div>
                            </article>
                          )
                        )}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          ) : activeTab ===
            "restaurantService" ? (
            <div className="account-restaurant-service">
              {restaurantServiceLoading ? (
                <div className="account-loading">
                  <RefreshCw
                    size={22}
                    strokeWidth={1.4}
                  />

                  Loading restaurant service...
                </div>
              ) : businessAccount ? (
                <>
                  <section className="account-service-hero">
                    <div className="account-service-hero-copy">
                      <div className="account-service-icon">
                        <Store
                          size={25}
                          strokeWidth={1.25}
                        />
                      </div>

                      <div>
                        <span>
                          BEYOND FOR RESTAURANTS
                        </span>

                        <h3>
                          {businessAccount.restaurant_name}
                        </h3>

                        <p>
                          Manage your restaurant plan,
                          subscription and website setup
                          from your BEYOND account.
                        </p>
                      </div>
                    </div>

                    <div className="account-service-plan">
                      {(restaurantSubscription?.plan_id ||
                        websiteRequest?.plan_id ||
                        businessAccount.requested_plan) ===
                      "premium"
                        ? "PREMIUM"
                        : "BASIC"}
                    </div>
                  </section>

                  <div className="account-service-grid">
                    <article>
                      <span>PLAN</span>

                      <strong>
                        {(restaurantSubscription?.plan_id ||
                          websiteRequest?.plan_id ||
                          businessAccount.requested_plan) ===
                        "premium"
                          ? "Premium"
                          : "Basic"}
                      </strong>

                      <p>
                        {(restaurantSubscription?.plan_id ||
                          websiteRequest?.plan_id ||
                          businessAccount.requested_plan) ===
                        "premium"
                          ? "Digital restaurant menu website plus branded NFC and QR stand."
                          : "Digital restaurant menu website and management platform."}
                      </p>
                    </article>

                    <article>
                      <span>SUBSCRIPTION</span>

                      <strong>
                        {formatServiceStatus(
                          restaurantSubscription?.status,
                          "Not activated"
                        )}
                      </strong>

                      <p>
                        {restaurantSubscription
                          ? restaurantSubscription.current_period_end
                            ? `Current period ends ${formatDate(
                                restaurantSubscription.current_period_end
                              )}.`
                            : "Your recurring subscription record is connected."
                          : "Recurring payment has not been activated yet."}
                      </p>
                    </article>

                    <article>
                      <span>WEBSITE SETUP</span>

                      <strong>
                        {menuSites.length
                          ? "Website assigned"
                          : formatServiceStatus(
                              websiteRequest?.status,
                              "Not started"
                            )}
                      </strong>

                      <p>
                        {menuSites.length
                          ? "Your restaurant website is available under My Website."
                          : websiteRequest
                            ? "BEYOND is tracking the setup of your restaurant website."
                            : "Website setup will begin after the service is activated."}
                      </p>
                    </article>

                    <article>
                      <span>RESTAURANT</span>

                      <strong>
                        {businessAccount.restaurant_name}
                      </strong>

                      <p>
                        {businessAccount.contact_name}
                        {businessAccount.phone
                          ? ` · ${businessAccount.phone}`
                          : ""}
                      </p>
                    </article>
                  </div>

                  <section className="account-service-action">
                    {!restaurantSubscription ||
                    restaurantSubscription.status ===
                      "cancelled" ? (
                      <>
                        <div>
                          <span>
                            NEXT STEP
                          </span>

                          <strong>
                            Activate your{" "}
                            {businessAccount.requested_plan ===
                            "premium"
                              ? "Premium"
                              : "Basic"}{" "}
                            subscription
                          </strong>

                          <p>
                            {businessAccount.requested_plan ===
                            "premium"
                              ? "₪129"
                              : "₪79"}{" "}
                            per month. This testing step
                            prepares the subscription only.
                            No payment will be taken yet.
                          </p>
                        </div>

                        <button
                          type="button"
                          className="account-primary-button account-service-action-button"
                          disabled={
                            restaurantServiceActionLoading
                          }
                          onClick={
                            handleStartRestaurantSubscription
                          }
                        >
                          {restaurantServiceActionLoading
                            ? "Preparing..."
                            : "Activate Subscription"}
                        </button>
                      </>
                    ) : restaurantSubscription.status ===
                      "pending_payment" ? (
                      <>
                        <div>
                          <span>
                            PAYMENT
                          </span>

                          <strong>
                            Subscription prepared
                          </strong>

                          <p>
                            Your subscription is waiting
                            for secure payment activation.
                            We will connect PayPlus here
                            later.
                          </p>
                        </div>

                        <button
                          type="button"
                          className="account-secondary-button account-service-action-button"
                          disabled
                        >
                          Payment Pending
                        </button>
                      </>
                    ) : (
                      <>
                        <div>
                          <span>
                            SUBSCRIPTION
                          </span>

                          <strong>
                            {formatServiceStatus(
                              restaurantSubscription.status
                            )}
                          </strong>

                          <p>
                            Your restaurant subscription
                            is connected to this account.
                          </p>
                        </div>
                      </>
                    )}
                  </section>

                  {restaurantServiceMessage && (
                    <div className="account-service-message">
                      {restaurantServiceMessage}
                    </div>
                  )}

                  {restaurantSubscription?.status !==
                    "active" && (
                    <section className="account-service-promo">

                      <div className="account-service-promo-copy">
                        <span>
                          HAVE A PROMO CODE?
                        </span>

                        <strong>
                          Apply a restaurant promo
                        </strong>

                        <p>
                          Enter your BEYOND promo code
                          to activate an eligible
                          restaurant subscription.
                        </p>
                      </div>

                      <div className="account-service-promo-form">

                        <input
                          type="text"
                          value={restaurantPromoCode}
                          onChange={event =>
                            setRestaurantPromoCode(
                              event.target.value
                                .toUpperCase()
                            )
                          }
                          onKeyDown={event => {
                            if (
                              event.key === "Enter"
                            ) {
                              event.preventDefault();
                              handleRedeemRestaurantPromo();
                            }
                          }}
                          placeholder="PROMO CODE"
                          autoComplete="off"
                        />

                        <button
                          type="button"
                          className="account-secondary-button"
                          disabled={
                            restaurantPromoLoading ||
                            !restaurantPromoCode.trim()
                          }
                          onClick={
                            handleRedeemRestaurantPromo
                          }
                        >
                          {restaurantPromoLoading
                            ? "Applying..."
                            : "Apply Promo"}
                        </button>

                      </div>

                    </section>
                  )}

                  {restaurantPromoMessage && (
                    <div className="account-service-promo-message">
                      {restaurantPromoMessage}
                    </div>
                  )}

                  <div className="account-service-security">
                    <ShieldCheck
                      size={18}
                      strokeWidth={1.4}
                    />

                    <div>
                      <strong>
                        Secure subscription status
                      </strong>

                      <span>
                        Payment activation will be based
                        on the verified payment status
                        received by BEYOND.
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="account-empty">
                  <Store
                    size={36}
                    strokeWidth={1.1}
                  />

                  <strong>
                    No restaurant service found.
                  </strong>
                </div>
              )}
            </div>
          ) : activeTab ===
            "adminSettings" &&
            isMenuAdmin ? (

            <div className="account-admin-settings">
              {/* BEYOND_ADMIN_SETTINGS_CONTENT_V1 */}

              <section className="account-admin-settings-hero">
                <div className="account-admin-settings-icon">
                  <ShieldCheck
                    size={30}
                    strokeWidth={1.2}
                  />
                </div>

                <div>
                  <span>
                    BEYOND ADMIN
                  </span>

                  <h3>
                    Website contact
                  </h3>

                  <p>
                    Control the public phone number used
                    by the Call and WhatsApp buttons on
                    the BEYOND website.
                  </p>
                </div>
              </section>


              <form
                className="account-admin-contact-form"
                onSubmit={
                  handleSaveAdminContact
                }
              >
                <label>
                  <span>
                    PUBLIC CONTACT NUMBER
                  </span>

                  <input
                    type="tel"
                    value={
                      adminContactPhone
                    }
                    onChange={event =>
                      setAdminContactPhone(
                        event.target.value
                      )
                    }
                    placeholder="+972-537707072"
                    autoComplete="tel"
                  />

                  <small>
                    Use international format. This
                    number controls both telephone
                    dialing and WhatsApp.
                  </small>
                </label>


                <div className="account-admin-contact-preview">

                  <div>
                    <span>
                      CALL
                    </span>

                    <strong>
                      {
                        adminContactPhone ||
                        "—"
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      WHATSAPP
                    </span>

                    <strong>
                      {
                        adminContactPhone ||
                        "—"
                      }
                    </strong>
                  </div>

                </div>


                <button
                  type="submit"
                  className="account-primary-button account-admin-contact-save"
                  disabled={
                    adminContactSaving
                  }
                >
                  <Save
                    size={14}
                    strokeWidth={1.5}
                  />

                  {adminContactSaving
                    ? "Saving..."
                    : "Save Contact Number"}
                </button>


                {adminContactMessage && (
                  <div className="account-admin-contact-message">
                    {
                      adminContactMessage
                    }
                  </div>
                )}

              </form>
            </div>

          ) : (
            <div className="account-profile">
              <div className="account-profile-intro">
                <UserRound
                  size={36}
                  strokeWidth={
                    1.1
                  }
                />

                <div>
                  <span>
                    PROFILE
                  </span>

                  <h3>
                    Your details
                  </h3>

                  <p>
                    Keep your contact
                    information up to
                    date for future
                    projects.
                  </p>
                </div>
              </div>

              <form
                className="account-profile-form"
                onSubmit={
                  handleSaveProfile
                }
              >
                <label>
                  <span>
                    FULL NAME
                  </span>

                  <input
                    type="text"
                    value={
                      fullName
                    }
                    onChange={(
                      event
                    ) =>
                      setFullName(
                        event.target
                          .value
                      )
                    }
                    placeholder="Your name"
                  />
                </label>

                <label>
                  <span>
                    EMAIL
                  </span>

                  <input
                    type="email"
                    value={
                      session.user
                        ?.email ||
                      ""
                    }
                    disabled
                  />

                  <small>
                    Email is managed by
                    your login account.
                  </small>
                </label>

                <label>
                  <span>
                    PHONE
                  </span>

                  <input
                    type="tel"
                    value={
                      phone
                    }
                    onChange={(
                      event
                    ) =>
                      setPhone(
                        event.target
                          .value
                      )
                    }
                    placeholder="Phone number"
                  />
                </label>

                <button
                  type="submit"
                  className="account-primary-button account-save-profile"
                  disabled={
                    savingProfile
                  }
                >
                  {savingProfile
                    ? "Saving..."
                    : "Save Profile"}
                </button>

                {profileMessage && (
                  <div className="account-profile-message">
                    {
                      profileMessage
                    }
                  </div>
                )}
              </form>

              <section className="account-security-card">
                <div className="account-security-heading">
                  <ShieldCheck
                    size={28}
                    strokeWidth={1.2}
                  />

                  <div>
                    <span>
                      SECURITY
                    </span>

                    <h3>
                      Change password
                    </h3>

                    <p>
                      {passwordRecovery
                        ? "Choose a new password to finish recovering your BEYOND account."
                        : "Update the password used to access your BEYOND account."}
                    </p>
                  </div>
                </div>

                <form
                  className="account-password-form"
                  onSubmit={
                    handleChangePassword
                  }
                >
                  <label>
                    <span>
                      NEW PASSWORD
                    </span>

                    <input
                      type="password"
                      value={
                        newPassword
                      }
                      onChange={event =>
                        setNewPassword(
                          event.target
                            .value
                        )
                      }
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                  </label>

                  <label>
                    <span>
                      CONFIRM NEW PASSWORD
                    </span>

                    <input
                      type="password"
                      value={
                        confirmPassword
                      }
                      onChange={event =>
                        setConfirmPassword(
                          event.target
                            .value
                        )
                      }
                      placeholder="Repeat your new password"
                      autoComplete="new-password"
                    />
                  </label>

                  <button
                    type="submit"
                    className="account-primary-button account-change-password"
                    disabled={
                      changingPassword
                    }
                  >
                    {changingPassword
                      ? "Updating..."
                      : "Change Password"}
                  </button>

                  {passwordError && (
                    <div className="account-password-error">
                      {passwordError}
                    </div>
                  )}

                  {passwordMessage && (
                    <div className="account-password-success">
                      {passwordMessage}
                    </div>
                  )}
                </form>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default MyAccount;
