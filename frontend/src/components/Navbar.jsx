function Navbar() {
  function scrollToSection(
    event,
    id
  ) {
    event.preventDefault();

    const section =
      document.getElementById(id);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  return (
    <nav className="navbar">
      <a
        className="logo"
        href="#top"
        onClick={(event) =>
          scrollToSection(
            event,
            "top"
          )
        }
      >
        BEYOND
      </a>

      <div className="nav-links">
        <a
          href="#top"
          onClick={(event) =>
            scrollToSection(
              event,
              "top"
            )
          }
        >
          Home
        </a>

        <a
          href="#how-it-works"
          onClick={(event) =>
            scrollToSection(
              event,
              "how-it-works"
            )
          }
        >
          How It Works
        </a>

        <a
          href="#upload"
          onClick={(event) =>
            scrollToSection(
              event,
              "upload"
            )
          }
        >
          Start a Project
        </a>

        <a
          href="#contact"
          onClick={(event) =>
            scrollToSection(
              event,
              "contact"
            )
          }
        >
          Contact
        </a>
      </div>

      <a
        className="login-button"
        href="https://beyond3dshop.com/admin.html"
      >
        Admin
      </a>
    </nav>
  );
}

export default Navbar;