const KEY =
  "beyond-menu-builder-intent-v1";

const MAX_AGE =
  2 * 60 * 60 * 1000;

export function setMenuBuilderIntent() {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        action: "menu-builder",
        createdAt: Date.now(),
      })
    );
  } catch {
    // Continue even if storage is unavailable.
  }
}

export function hasMenuBuilderIntent() {
  try {
    const raw =
      window.localStorage.getItem(
        KEY
      );

    if (!raw) {
      return false;
    }

    const value =
      JSON.parse(raw);

    if (
      value?.action !==
      "menu-builder"
    ) {
      clearMenuBuilderIntent();
      return false;
    }

    const createdAt =
      Number(
        value?.createdAt || 0
      );

    if (
      !createdAt ||
      Date.now() - createdAt >
        MAX_AGE
    ) {
      clearMenuBuilderIntent();
      return false;
    }

    return true;
  } catch {
    clearMenuBuilderIntent();
    return false;
  }
}

export function clearMenuBuilderIntent() {
  try {
    window.localStorage.removeItem(
      KEY
    );
  } catch {
    // Ignore storage errors.
  }
}
