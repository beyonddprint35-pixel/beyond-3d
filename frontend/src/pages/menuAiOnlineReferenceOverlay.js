import { readMenuStudioV2Draft } from "../features/menu-engine/studio/menuStudioV2Session";
import { localizedDishText, resolveProductReferenceImage, searchProductReferenceImages } from "../features/menu-engine/data/menuAiDishImageService";
import "./menuAiOnlineReferenceOverlay.css";

function currentItem() {
  const draft = readMenuStudioV2Draft();
  const id = new URLSearchParams(window.location.search).get("item") || "";
  const item = draft?.menu?.items?.find((entry) => entry.id === id) || null;
  return { draft, item };
}

function labelFor(item) {
  return localizedDishText(item?.name, "en") || localizedDishText(item?.name, "he") || localizedDishText(item?.name, "ar") || "menu item";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function renderSelected(card, selected) {
  const target = card.querySelector("[data-online-ref-selected]");
  if (!target) return;
  if (!selected) {
    target.innerHTML = "<span>No product reference selected.</span>";
    return;
  }
  target.innerHTML = `<img src="${escapeHtml(selected.previewUrl || "")}" alt=""><div><strong>Reference selected ✓</strong><small>${escapeHtml(selected.title || selected.sourceLabel || "Online reference")}</small></div><button type="button" data-online-ref-clear>Remove</button>`;
  target.querySelector("[data-online-ref-clear]")?.addEventListener("click", () => {
    window.__beyondAiProductReference = null;
    window.__beyondAiProductReferenceMeta = null;
    renderSelected(card, null);
  });
}

function installCard() {
  if (!window.location.pathname.includes("/menu-studio/ai-images")) return;
  const controls = document.querySelector(".ai-photo-v2-controls");
  if (!controls || controls.querySelector("[data-online-product-reference-card]")) return;
  const { item } = currentItem();
  if (!item) return;
  const itemName = labelFor(item);
  const card = document.createElement("section");
  card.className = "ai-dish-v1-card ai-online-reference-card";
  card.dataset.onlineProductReferenceCard = "1";
  card.innerHTML = `
    <header><div><strong>Product reference <em>Optional</em></strong><p>Show Beyond the exact glass, bottle, plate or product you mean. Your saved Place Style still controls the restaurant scene.</p></div></header>
    <div class="ai-online-reference-actions">
      <button type="button" data-online-ref-open>🔎 Find reference online</button>
      <label>⬆ Upload reference<input data-online-ref-upload type="file" accept="image/jpeg,image/png,image/webp"></label>
    </div>
    <div class="ai-online-reference-selected" data-online-ref-selected><span>No product reference selected.</span></div>
    <div class="ai-online-reference-panel" data-online-ref-panel hidden>
      <div class="ai-online-reference-search"><input data-online-ref-query value="${escapeHtml(`${itemName} glass product`)}" aria-label="Reference search"><button type="button" data-online-ref-search>Search</button></div>
      <p class="ai-online-reference-status" data-online-ref-status>Choose an image that shows the exact product shape you want.</p>
      <div class="ai-online-reference-results" data-online-ref-results></div>
    </div>`;
  const anchor = controls.querySelector(".custom-box") || controls.querySelector(".preflight-simple");
  controls.insertBefore(card, anchor || null);

  const panel = card.querySelector("[data-online-ref-panel]");
  const status = card.querySelector("[data-online-ref-status]");
  const results = card.querySelector("[data-online-ref-results]");
  const query = card.querySelector("[data-online-ref-query]");

  card.querySelector("[data-online-ref-open]")?.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) query?.focus();
  });

  async function runSearch() {
    const value = String(query?.value || "").trim();
    if (!value) return;
    status.textContent = "Searching online references…";
    results.innerHTML = "";
    try {
      const items = await searchProductReferenceImages(value);
      if (!items.length) {
        status.textContent = "No useful references found. Try a more specific search, for example ‘Liefmans beer glass’.";
        return;
      }
      status.textContent = "Tap the image that best represents the exact product or glass you want.";
      for (const result of items) {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "ai-online-reference-result";
        tile.innerHTML = `<img src="${escapeHtml(result.imageUrl)}" alt=""><span><strong>${escapeHtml(result.title || "Reference")}</strong><small>${escapeHtml(result.sourceLabel || result.source || "Web")}</small></span>`;
        tile.addEventListener("click", async () => {
          tile.disabled = true;
          status.textContent = "Preparing selected reference…";
          try {
            const reference = await resolveProductReferenceImage(result);
            window.__beyondAiProductReference = reference;
            window.__beyondAiProductReferenceMeta = { ...result, previewUrl: result.imageUrl };
            renderSelected(card, { ...result, previewUrl: result.imageUrl });
            panel.hidden = true;
            status.textContent = "Reference selected.";
          } catch (error) {
            status.textContent = error?.message || "Could not use that image. Try another result.";
          } finally {
            tile.disabled = false;
          }
        });
        results.appendChild(tile);
      }
    } catch (error) {
      status.textContent = error?.message || "Reference search failed.";
    }
  }

  card.querySelector("[data-online-ref-search]")?.addEventListener("click", runSearch);
  query?.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); runSearch(); } });

  card.querySelector("[data-online-ref-upload]")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      status.textContent = "Use a JPG, PNG or WEBP reference up to 5 MB.";
      panel.hidden = false;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const comma = dataUrl.indexOf(",");
      window.__beyondAiProductReference = { mimeType: file.type, base64: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl, bytes: file.size, name: file.name, sourceLabel: "Uploaded reference" };
      const previewUrl = URL.createObjectURL(file);
      window.__beyondAiProductReferenceMeta = { title: file.name, previewUrl, sourceLabel: "Uploaded reference" };
      renderSelected(card, window.__beyondAiProductReferenceMeta);
    };
    reader.readAsDataURL(file);
  });

  renderSelected(card, window.__beyondAiProductReferenceMeta || null);
}

export default function installMenuAiOnlineReferenceOverlay() {
  let lastItem = "";
  const refresh = () => {
    const id = new URLSearchParams(window.location.search).get("item") || "";
    if (id !== lastItem) {
      lastItem = id;
      window.__beyondAiProductReference = null;
      window.__beyondAiProductReferenceMeta = null;
      document.querySelector("[data-online-product-reference-card]")?.remove();
    }
    installCard();
  };
  refresh();
  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", refresh);
  window.setInterval(refresh, 900);
}
