import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Check,
  LoaderCircle,
  ShieldCheck,
  Tag,
} from "lucide-react";

import {
  supabase,
} from "../lib/supabaseClient";

import "./RestaurantCheckout.css";


function money(value) {
  return new Intl.NumberFormat(
    "he-IL",
    {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value || 0)
  );
}


export default function RestaurantCheckout({
  plan,
  billingInterval,
  menu,
  session,
  onBack,
}) {
  const [
    restaurantName,
    setRestaurantName,
  ] = useState(
    menu?.restaurant_name || ""
  );

  const [
    promoCode,
    setPromoCode,
  ] = useState("");

  const [
    appliedPromoCode,
    setAppliedPromoCode,
  ] = useState("");

  const [
    quote,
    setQuote,
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
    message,
    setMessage,
  ] = useState("");


  async function getQuote(
    code = ""
  ) {
    if (!plan?.id) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const {
        data,
        error:
          quoteError,
      } =
        await supabase.rpc(
          "quote_restaurant_subscription",
          {
            p_plan_id:
              plan.id,

            p_billing_interval:
              billingInterval,

            p_promo_code:
              code.trim() ||
              null,
          }
        );

      if (quoteError) {
        throw quoteError;
      }

      setQuote(
        data
      );

      return data;
    } catch (quoteFailure) {
      setError(
        quoteFailure?.message ||
          "Could not calculate this subscription."
      );

      throw quoteFailure;
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    setRestaurantName(
      menu?.restaurant_name ||
        ""
    );
  }, [
    menu?.restaurant_name,
  ]);


  useEffect(() => {
    getQuote(
      appliedPromoCode
    ).catch(() => {
      // Error is already shown.
    });
  }, [
    plan?.id,
    billingInterval,
  ]);


  async function handleApplyPromo() {
    const cleanCode =
      promoCode
        .trim()
        .toUpperCase();

    if (!cleanCode) {
      setError(
        "Enter a promo code first."
      );

      return;
    }

    try {
      const nextQuote =
        await getQuote(
          cleanCode
        );

      setAppliedPromoCode(
        cleanCode
      );

      setPromoCode(
        cleanCode
      );

      setMessage(
        `${cleanCode} applied · ${Number(
          nextQuote?.discount_percent || 0
        )}% discount`
      );
    } catch {
      setAppliedPromoCode(
        ""
      );
    }
  }


  async function handleRemovePromo() {
    setPromoCode("");
    setAppliedPromoCode("");
    setMessage("");

    try {
      await getQuote("");
    } catch {
      // Error already displayed.
    }
  }


  function handleContinue() {
    setError("");
    setMessage("");

    if (
      restaurantName
        .trim()
        .length < 2
    ) {
      setError(
        "Enter your restaurant name."
      );

      return;
    }

    /*
      IMPORTANT:
      Local testing only.

      We deliberately DO NOT call
      begin_restaurant_subscription yet.

      Normal / 50% subscriptions must
      first be connected to PayPlus so
      we don't create unpaid production
      subscriptions during UI testing.
    */

    if (
      Number(
        quote?.amount_due_ils ||
          0
      ) === 0
    ) {
      setMessage(
        "100% promo verified. In the final flow this will activate the restaurant immediately without payment."
      );

      return;
    }

    setMessage(
      "Checkout looks correct. The next step is connecting this button to secure recurring PayPlus payment."
    );
  }


  if (!plan) {
    return null;
  }


  const discount =
    Number(
      quote?.discount_percent ||
        0
    );

  const baseAmount =
    Number(
      quote?.base_amount_ils ||
        0
    );

  const amountDue =
    Number(
      quote?.amount_due_ils ||
        0
    );

  const discountAmount =
    Math.max(
      baseAmount -
        amountDue,
      0
    );


  return (
    <section className="restaurant-checkout">
      <div className="restaurant-checkout-shell">

        {/* =====================================
            LEFT SIDE
        ===================================== */}

        <div className="restaurant-checkout-main">

          <button
            type="button"
            className="restaurant-checkout-back"
            onClick={
              onBack
            }
          >
            <ArrowLeft
              size={16}
            />

            Back to plans
          </button>


          <div className="restaurant-checkout-heading">
            <span>
              04 / CHECKOUT
            </span>

            <h1>
              Activate your menu.
            </h1>

            <p>
              Your menu is ready. Confirm the restaurant and subscription before continuing to secure payment.
            </p>
          </div>


          {/* RESTAURANT */}

          <div className="restaurant-checkout-section">

            <div className="restaurant-checkout-section-heading">
              <span>
                RESTAURANT
              </span>

              <strong>
                Who is this subscription for?
              </strong>
            </div>

            <label className="restaurant-checkout-field">
              <span>
                RESTAURANT NAME
              </span>

              <input
                type="text"
                value={
                  restaurantName
                }
                onChange={event =>
                  setRestaurantName(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Restaurant name"
              />
            </label>

          </div>


          {/* PAYER */}

          <div className="restaurant-checkout-section">

            <div className="restaurant-checkout-section-heading">
              <span>
                PAYER
              </span>

              <strong>
                Subscription payer
              </strong>
            </div>

            <div className="restaurant-checkout-payer">
              <div>
                <small>
                  BEYOND ACCOUNT
                </small>

                <strong>
                  {
                    session?.user
                      ?.email ||
                    "Signed-in user"
                  }
                </strong>
              </div>

              <ShieldCheck
                size={22}
              />
            </div>

            <p className="restaurant-checkout-helper">
              This user pays for the restaurant subscription. Other users can be assigned to the restaurant later without purchasing another subscription.
            </p>

          </div>


          {/* PROMO */}

          <div className="restaurant-checkout-section">

            <div className="restaurant-checkout-section-heading">
              <span>
                PROMO CODE
              </span>

              <strong>
                Have a BEYOND code?
              </strong>
            </div>

            <div className="restaurant-checkout-promo">

              <div className="restaurant-checkout-promo-input">
                <Tag
                  size={17}
                />

                <input
                  type="text"
                  value={
                    promoCode
                  }
                  onChange={event =>
                    setPromoCode(
                      event
                        .target
                        .value
                        .toUpperCase()
                    )
                  }
                  placeholder="Enter promo code"
                  disabled={
                    Boolean(
                      appliedPromoCode
                    )
                  }
                />
              </div>

              {appliedPromoCode ? (
                <button
                  type="button"
                  className="restaurant-checkout-promo-remove"
                  onClick={
                    handleRemovePromo
                  }
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  className="restaurant-checkout-promo-apply"
                  onClick={
                    handleApplyPromo
                  }
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? "Checking..."
                    : "Apply"}
                </button>
              )}

            </div>

            {appliedPromoCode && (
              <div className="restaurant-checkout-promo-active">
                <Check
                  size={15}
                />

                {appliedPromoCode}

                <strong>
                  {discount}% OFF
                </strong>
              </div>
            )}

          </div>


          {error && (
            <div className="restaurant-checkout-message error">
              {error}
            </div>
          )}

          {message && (
            <div className="restaurant-checkout-message success">
              {message}
            </div>
          )}

        </div>


        {/* =====================================
            ORDER SUMMARY
        ===================================== */}

        <aside className="restaurant-checkout-summary">

          <div className="restaurant-checkout-summary-kicker">
            ORDER SUMMARY
          </div>

          <div className="restaurant-checkout-plan-name">
            <div>
              <span>
                BEYOND
              </span>

              <h2>
                {plan.name}
              </h2>
            </div>

            {plan.id ===
              "premium" && (
              <strong>
                PREMIUM
              </strong>
            )}
          </div>


          <div className="restaurant-checkout-summary-row">
            <span>
              Billing
            </span>

            <strong>
              {billingInterval ===
              "annual"
                ? "Annual"
                : "Monthly"}
            </strong>
          </div>


          {billingInterval ===
            "annual" && (
            <div className="restaurant-checkout-annual-note">
              12 months of service · pay for 11
            </div>
          )}


          <div className="restaurant-checkout-divider" />


          <div className="restaurant-checkout-summary-row">
            <span>
              Subscription
            </span>

            <strong>
              {loading &&
              !quote
                ? "..."
                : money(
                    baseAmount
                  )}
            </strong>
          </div>


          {discount >
            0 && (
            <div className="restaurant-checkout-summary-row discount">
              <span>
                Promo discount
                <small>
                  {discount}% OFF
                </small>
              </span>

              <strong>
                -
                {money(
                  discountAmount
                )}
              </strong>
            </div>
          )}


          <div className="restaurant-checkout-divider" />


          <div className="restaurant-checkout-total">
            <span>
              TOTAL
            </span>

            <strong>
              {loading &&
              !quote
                ? "..."
                : money(
                    amountDue
                  )}
            </strong>

            <small>
              {amountDue ===
              0
                ? "No payment required"
                : billingInterval ===
                    "annual"
                  ? "per year"
                  : "per month"}
            </small>
          </div>


          <button
            type="button"
            className="restaurant-checkout-continue"
            onClick={
              handleContinue
            }
            disabled={
              loading ||
              !quote
            }
          >
            {loading ? (
              <>
                <LoaderCircle
                  size={17}
                  className="restaurant-checkout-spin"
                />

                Calculating...
              </>
            ) : amountDue ===
              0 ? (
              "Activate Subscription"
            ) : (
              "Continue to Secure Payment"
            )}
          </button>


          <div className="restaurant-checkout-secure">
            <ShieldCheck
              size={14}
            />

            Recurring payment secured through BEYOND
          </div>

        </aside>

      </div>
    </section>
  );
}
