from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


p = Path("frontend/src/components/MenuContentImageEditor.jsx")
s = p.read_text()

s = replace_once(
    s,
    '  const sourceUrl = item.image_original_url || item.image_url || "";\n  const sourcePath = item.image_original_path || item.image_path || "";\n',
    '''  // Preserve the untouched customer upload separately from every derived image.\n  // All future AI options branch from this immutable source, never from Option 1/2/etc.\n  const immutableOriginalUrl = String(item.image_upload_original_url || "").trim();\n  const immutableOriginalPath = String(item.image_upload_original_path || "").trim();\n  const legacyOriginalUrl = String(item.image_original_url || "").trim();\n  const legacyOriginalPath = String(item.image_original_path || "").trim();\n  const savedOptions = optionsFromItem(item);\n  const legacyOriginalTrusted = Boolean(\n    legacyOriginalUrl\n      && (legacyOriginalUrl !== String(item.image_url || "").trim() || !savedOptions.length),\n  );\n  const originalUrl = immutableOriginalUrl || (legacyOriginalTrusted ? legacyOriginalUrl : "");\n  const originalPath = immutableOriginalPath || (legacyOriginalTrusted ? legacyOriginalPath : "");\n  const sourceUrl = immutableOriginalUrl || legacyOriginalUrl || item.image_url || "";\n  const sourcePath = immutableOriginalPath || legacyOriginalPath || item.image_path || "";\n  const originalNeedsRepair = Boolean(!originalUrl && savedOptions.length && legacyOriginalUrl);\n  const originalRepairMessage = ({\n    en: "This older item no longer has a trustworthy untouched original. Re-upload the original photo once before creating another AI option.",\n    he: "בפריט הישן הזה כבר אין מקור אמין שלא נערך. העלו מחדש את התמונה המקורית פעם אחת לפני יצירת אפשרות AI נוספת.",\n    ar: "هذا العنصر القديم لم يعد يحتوي على نسخة أصلية موثوقة وغير معدلة. أعد رفع الصورة الأصلية مرة واحدة قبل إنشاء خيار AI جديد.",\n  }[language] || "Re-upload the original photo before creating another AI option.");\n''',
    "source constants",
)

# Upload and remove both need to know about the immutable source asset.
group = '        item.image_path,\n        item.image_original_path,\n        item.image_processed_path,\n'
replacement = '        item.image_path,\n        item.image_upload_original_path,\n        item.image_original_path,\n        item.image_processed_path,\n'
if s.count(group) < 2:
    raise SystemExit(f"Expected at least two cleanup path groups, found {s.count(group)}")
s = s.replace(group, replacement, 2)

s = replace_once(
    s,
    '    try {\n      const previousPaths = [...new Set([\n',
    '    try {\n      const repairingOriginal = originalNeedsRepair;\n      const preservedOptionPaths = new Set(optionsFromItem(item).map((option) => option.path).filter(Boolean));\n      const previousPaths = [...new Set([\n',
    "repair-mode upload setup",
)

s = replace_once(
    s,
    '      for (const path of previousPaths) {\n        if (path !== uploaded.image_path) await removeMenuItemImage(path).catch(() => {});\n      }\n',
    '      for (const path of previousPaths) {\n        if (repairingOriginal && preservedOptionPaths.has(path)) continue;\n        if (path !== uploaded.image_path) await removeMenuItemImage(path).catch(() => {});\n      }\n',
    "preserve AI options during legacy original repair",
)

s = replace_once(
    s,
    '        image_original_url: uploaded.image_url,\n        image_original_path: uploaded.image_path,\n',
    '        image_upload_original_url: uploaded.image_url,\n        image_upload_original_path: uploaded.image_path,\n        image_original_url: uploaded.image_url,\n        image_original_path: uploaded.image_path,\n',
    "immutable upload fields",
)

s = replace_once(
    s,
    '        image_ai_options: [],\n      });\n      setResults([]);\n',
    '        image_ai_options: repairingOriginal ? normalizeAiOptions(results) : [],\n      });\n      setResults(repairingOriginal ? results : []);\n',
    "preserve options on original repair",
)

s = replace_once(
    s,
    '  async function generatePreview() {\n    if (!sourceUrl || processing) return;\n',
    '  async function generatePreview() {\n    if (!sourceUrl || processing) return;\n    if (originalNeedsRepair) {\n      setError(originalRepairMessage);\n      return;\n    }\n',
    "generation guard",
)

s = replace_once(
    s,
    '      onChange?.({ image_url: "", image_path: "", image_original_url: "", image_original_path: "", image_processed_url: "", image_processed_path: "", image_variant: "", image_ai_mode: "", image_ai_model: "", image_ai_scene: "", image_ai_style: null, image_ai_options: [] });\n',
    '      onChange?.({ image_url: "", image_path: "", image_upload_original_url: "", image_upload_original_path: "", image_original_url: "", image_original_path: "", image_processed_url: "", image_processed_path: "", image_variant: "", image_ai_mode: "", image_ai_model: "", image_ai_scene: "", image_ai_style: null, image_ai_options: [] });\n',
    "clear immutable fields",
)

s = replace_once(
    s,
    '  function chooseOriginal() {\n    if (!sourceUrl || busy) return;\n    setResult({ id: "original", url: sourceUrl, path: sourcePath, isOriginal: true });\n',
    '  function chooseOriginal() {\n    if (!originalUrl || busy) return;\n    setResult({ id: "original", url: originalUrl, path: originalPath, isOriginal: true });\n',
    "choose original",
)

s = replace_once(
    s,
    '    const currentIsOriginal = Boolean(sourceUrl && item.image_url === sourceUrl && !item.image_processed_path);\n    const selected = currentIsOriginal\n      ? { id: "original", url: sourceUrl, path: sourcePath, isOriginal: true }\n',
    '    const currentIsOriginal = Boolean(originalUrl && item.image_url === originalUrl && !item.image_processed_path);\n    const selected = currentIsOriginal\n      ? { id: "original", url: originalUrl, path: originalPath, isOriginal: true }\n',
    "open studio original",
)

old_card = '''                <div\n                  className={`menu-content-v2-photo-variant-card original ${result?.isOriginal || (!result && !results.length) ? "active" : ""}`}\n                  role="button"\n                  tabIndex={busy ? -1 : 0}\n                  aria-label={copy.originalOption}\n                  onClick={chooseOriginal}\n                  onKeyDown={(event) => { if (!busy && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); chooseOriginal(); } }}\n                >\n                  <img src={sourceUrl} alt="" />\n                  <button type="button" className="menu-content-v2-photo-variant-download" disabled={busy} aria-label={`${copy.download} — ${copy.originalOption}`} onClick={(event) => { event.stopPropagation(); downloadPhotoUrl(sourceUrl, `${itemDisplayName(item, language) || "menu-item"}-original`); }}>\n                    <Download size={12} />\n                  </button>\n                  <span><span>{copy.originalOption}</span>{result?.isOriginal || (!result && !results.length) ? <i className="selected-mark"><Check size={11} /></i> : null}</span>\n                </div>\n'''
new_card = '''                {originalUrl ? <div\n                  className={`menu-content-v2-photo-variant-card original ${result?.isOriginal || (!result && !results.length) ? "active" : ""}`}\n                  role="button"\n                  tabIndex={busy ? -1 : 0}\n                  aria-label={copy.originalOption}\n                  onClick={chooseOriginal}\n                  onKeyDown={(event) => { if (!busy && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); chooseOriginal(); } }}\n                >\n                  <img src={originalUrl} alt="" />\n                  <button type="button" className="menu-content-v2-photo-variant-download" disabled={busy} aria-label={`${copy.download} — ${copy.originalOption}`} onClick={(event) => { event.stopPropagation(); downloadPhotoUrl(originalUrl, `${itemDisplayName(item, language) || "menu-item"}-original`); }}>\n                    <Download size={12} />\n                  </button>\n                  <span><span>{copy.originalOption}</span>{result?.isOriginal || (!result && !results.length) ? <i className="selected-mark"><Check size={11} /></i> : null}</span>\n                </div> : null}\n'''
s = replace_once(s, old_card, new_card, "gallery original card")

s = replace_once(
    s,
    '                <small>{copy.optionsHint}</small>\n',
    '                <small>{originalNeedsRepair ? originalRepairMessage : copy.optionsHint}</small>\n',
    "gallery repair explanation",
)

s = replace_once(
    s,
    '          image_url: sourceUrl,\n          image_path: sourcePath,\n          image_original_url: sourceUrl,\n          image_original_path: sourcePath,\n',
    '          image_url: originalUrl || sourceUrl,\n          image_path: originalPath || sourcePath,\n          image_upload_original_url: immutableOriginalUrl || originalUrl || "",\n          image_upload_original_path: immutableOriginalPath || originalPath || "",\n          image_original_url: originalUrl || sourceUrl,\n          image_original_path: originalPath || sourcePath,\n',
    "restore original save",
)

p.write_text(s)

# Remove the old large generic Download photo button. Exact card downloads remain.
d = Path("frontend/src/pages/menuContentImageDownload.js")
x = d.read_text()
start_marker = '  const editor = document.querySelector(".menu-content-v2-image-editor");\n'
end_marker = '    editor.appendChild(button);\n  }\n'
start = x.find(start_marker)
if start < 0:
    raise SystemExit("Missing generic download start")
end = x.find(end_marker, start)
if end < 0:
    raise SystemExit("Missing generic download end")
end += len(end_marker)
x = x[:start] + '''  // Exact downloads now live on the Original / Option cards. The old generic\n  // button was ambiguous and could download a stale selection.\n  document.querySelectorAll(".menu-content-v2-image-download").forEach((button) => button.remove());\n''' + x[end:]
d.write_text(x)
