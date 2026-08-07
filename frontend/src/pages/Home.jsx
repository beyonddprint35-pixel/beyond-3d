import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import HowItWorks from "../components/HowItWorks";
import UploadProject from "../components/UploadProject";

function Home() {
  return (
    <main className="site-shell">
      <div id="top">
        <Navbar />
      </div>

      <Hero />

      <div id="how-it-works">
        <HowItWorks />
      </div>

      <div id="upload">
        <UploadProject />
      </div>

      <section
        id="contact"
        className="contact-section"
      >
        <div className="section-kicker">
          CONTACT
        </div>

        <h2>
          Have something in mind?
          <span> Let's build it.</span>
        </h2>

        <p>
          Questions about materials, design
          or your project? Get in touch with
          Beyond.
        </p>

        <a
          href="mailto:beyonddprint35@gmail.com"
          className="primary-button contact-button"
        >
          Contact Beyond
        </a>
      </section>
    </main>
  );
}

export default Home;