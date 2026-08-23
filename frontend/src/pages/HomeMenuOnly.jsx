import Home from "./Home";
import "./HomeMenuOnly.css";

function HomeMenuOnly() {
  function handleClickCapture(event) {
    const start3DButton = event.target.closest(
      ".home-start-small"
    );

    if (!start3DButton) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    window.location.assign(
      "/3DPRINTING#start"
    );
  }

  return (
    <div
      className="home-menu-only"
      onClickCapture={
        handleClickCapture
      }
    >
      <Home />
    </div>
  );
}

export default HomeMenuOnly;
