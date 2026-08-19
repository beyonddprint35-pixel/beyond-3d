import "./DigitalMenuBenefits.css";

const features = [
  {
    number: "01",
    title: "Digital Menu",
    text:
      "A modern mobile-first menu built for your restaurant, café or bar.",
    visual: "menu",
  },
  {
    number: "02",
    title: "QR + NFC Stand",
    text:
      "Guests scan the QR code or tap the NFC stand to open your menu instantly.",
    visual: "stand",
  },
  {
    number: "03",
    title: "Menu Studio",
    text:
      "Update categories, items, descriptions and prices whenever you need.",
    visual: "studio",
  },
  {
    number: "04",
    title: "Multi-language",
    text:
      "Serve local and international customers with multiple menu languages.",
    visual: "language",
  },
];

export default function DigitalMenuBenefits({
  onStartMenu,
}) {
  return (
    <section
      className="digital-benefits"
      id="menu-features"
    >
      <div className="digital-benefits-shell">

        <header className="digital-benefits-heading">
          <div>
            <div className="digital-benefits-kicker">
              BEYOND MENU SYSTEM
            </div>

            <h2>
              Everything your
              <span> menu needs.</span>
            </h2>
          </div>

          <p>
            One complete digital menu system —
            from the physical table stand to the
            menu your customer sees on their phone.
          </p>
        </header>


        <div className="digital-benefits-grid">
          {features.map(feature => (
            <article
              key={feature.number}
              className="digital-benefit-card"
            >
              <div className="digital-benefit-top">
                <span>
                  {feature.number}
                </span>

                <i />
              </div>

              <div
                className={`digital-benefit-visual ${feature.visual}`}
              >
                {feature.visual === "menu" ? (
                  <div className="benefit-menu-device">
                    <div className="benefit-menu-bar" />

                    <div className="benefit-menu-title">
                      MENU
                    </div>

                    <span />
                    <span />
                    <span />
                  </div>
                ) : null}


                {feature.visual === "stand" ? (
                  <div className="benefit-stand">
                    <div className="benefit-stand-card">
                      <div className="benefit-mini-qr">
                        <b />
                        <b />
                        <b />
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>

                    <div className="benefit-stand-leg" />
                    <div className="benefit-stand-base" />
                  </div>
                ) : null}


                {feature.visual === "studio" ? (
                  <div className="benefit-studio-window">
                    <div className="benefit-studio-header">
                      <span />
                      <span />
                      <span />
                    </div>

                    <div className="benefit-studio-body">
                      <div className="benefit-studio-sidebar">
                        <span />
                        <span />
                        <span />
                      </div>

                      <div className="benefit-studio-content">
                        <b />
                        <b />
                        <b />
                      </div>
                    </div>
                  </div>
                ) : null}


                {feature.visual === "language" ? (
                  <div className="benefit-language">
                    <div>
                      EN
                    </div>

                    <span>
                      ⇄
                    </span>

                    <div>
                      עב
                    </div>
                  </div>
                ) : null}
              </div>


              <div className="digital-benefit-copy">
                <h3>
                  {feature.title}
                </h3>

                <p>
                  {feature.text}
                </p>
              </div>
            </article>
          ))}
        </div>


        <div className="digital-benefits-footer">
          <div>
            <span>
              FROM TABLE
            </span>

            <i />

            <span>
              TO PHONE
            </span>

            <i />

            <span>
              TO MENU STUDIO
            </span>
          </div>

          <button
            type="button"
            onClick={onStartMenu}
          >
            Start your digital menu
            <span>→</span>
          </button>
        </div>

      </div>
    </section>
  );
}
