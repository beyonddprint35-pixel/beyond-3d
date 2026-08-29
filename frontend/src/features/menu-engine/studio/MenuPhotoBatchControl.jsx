import { useEffect, useMemo, useState } from "react";
import AuthModal from "../../../components/AuthModal";
import { supabase } from "../../../lib/supabaseClient";
import { MENU_PHOTO_AUTH_REQUIRED, retuneMenuItemImage } from "./menuItemImageStorage";
import { menuPhotoProfileDescription, menuPhotoProfileLabel, resolveMenuPhotoProfile } from "../domain/menuPhotoProfiles";
import "./MenuPhotoBatchControl.css";

const PRO_FINISH_PROFILE = "dish-safe-pro-v1";

const COPY = {
  en:{eyebrow:"BEYOND PRO FINISH",title:"Professional photo finish",photos:"photos",matched:"ready",needs:"need finishing",empty:"Add item photos to use professional menu-wide finishing.",ready:"Every menu photo is professionally finished for this design.",button:"Finish all photos",working:"Finishing photos",safe:"Each unique photo is analyzed once. Theme changes reuse the saved recipe locally · Dish Integrity Lock stays on.",done:"Professional photo finish complete",aiDone:"AI analysis was reused from the photo asset cache",localDone:"Beyond local vision completed the professional finish",partial:"Some photos could not be finished",auth:"Sign in to finish menu photos.",failed:"Photo finishing failed",audit:"PHOTO REGULATION",consistency:"Menu photo consistency",coverage:"Finish coverage",quality:"Average quality",attention:"Need attention",replace:"Replace low-quality originals rather than over-processing them.",qualityMissing:"Upload or re-process photos to calculate quality.",local:"Local vision",ai:"AI cached",analysis:"Need first analysis",cached:"Reusable assets"},
  he:{eyebrow:"BEYOND PRO FINISH",title:"גימור מקצועי לתמונות",photos:"תמונות",matched:"מוכנות",needs:"דורשות גימור",empty:"הוסיפו תמונות לפריטים כדי להשתמש בגימור מקצועי לכל התפריט.",ready:"כל תמונות התפריט עברו גימור מקצועי לעיצוב הזה.",button:"גימור לכל התמונות",working:"מבצע גימור לתמונות",safe:"כל תמונה ייחודית מנותחת פעם אחת. החלפת עיצוב משתמשת במתכון השמור מקומית · נעילת שלמות המנה נשארת פעילה.",done:"הגימור המקצועי הושלם",aiDone:"נעשה שימוש חוזר בניתוח ה-AI השמור של התמונה",localDone:"מנוע הראייה המקומי של Beyond השלים את הגימור המקצועי",partial:"חלק מהתמונות לא עברו גימור",auth:"יש להתחבר כדי לבצע גימור לתמונות התפריט.",failed:"גימור התמונות נכשל",audit:"תקן תמונות",consistency:"אחידות תמונות התפריט",coverage:"כיסוי גימור",quality:"איכות ממוצעת",attention:"דורשות תשומת לב",replace:"מומלץ להחליף תמונות מקור באיכות נמוכה במקום לעבד אותן יתר על המידה.",qualityMissing:"העלו או עבדו מחדש תמונות כדי לחשב איכות.",local:"ראייה מקומית",ai:"AI שמור",analysis:"דורשות ניתוח ראשון",cached:"נכסים לשימוש חוזר"},
  ar:{eyebrow:"BEYOND PRO FINISH",title:"تشطيب احترافي للصور",photos:"صور",matched:"جاهزة",needs:"تحتاج تشطيباً",empty:"أضف صور العناصر لاستخدام التشطيب الاحترافي على مستوى القائمة.",ready:"تم تشطيب كل صور القائمة احترافياً لهذا التصميم.",button:"تشطيب كل الصور",working:"جارٍ تشطيب الصور",safe:"يتم تحليل كل صورة فريدة مرة واحدة. تغييرات التصميم تعيد استخدام الوصفة المحفوظة محلياً · يبقى قفل سلامة الطبق فعالاً.",done:"اكتمل التشطيب الاحترافي للصور",aiDone:"تمت إعادة استخدام تحليل AI المحفوظ للصورة",localDone:"أكمل محرك الرؤية المحلي في Beyond التشطيب الاحترافي",partial:"تعذر تشطيب بعض الصور",auth:"سجّل الدخول لتشطيب صور القائمة.",failed:"فشل تشطيب الصور",audit:"تنظيم الصور",consistency:"اتساق صور القائمة",coverage:"تغطية التشطيب",quality:"متوسط الجودة",attention:"تحتاج انتباهاً",replace:"استبدل الصور الأصلية منخفضة الجودة بدلاً من الإفراط في معالجتها.",qualityMissing:"ارفع الصور أو أعد معالجتها لحساب الجودة.",local:"رؤية محلية",ai:"AI محفوظ",analysis:"تحتاج أول تحليل",cached:"أصول قابلة لإعادة الاستخدام"},
};

function sourceFor(item) {
  return String(item?.image_original_url || item?.image_processed_url || item?.image_url || "");
}

function sourcePathFor(item) {
  return String(item?.image_original_path || item?.image_processed_path || item?.image_path || "");
}

function hasPhoto(item) {
  return Boolean(sourceFor(item));
}

function hasReusableAsset(item) {
  return Boolean(item?.photo_asset_id && item?.image_hash && item?.image_analysis_profile);
}

function isProfessionallyFinished(item, profileId) {
  return Boolean(
    hasReusableAsset(item) &&
    item?.image_theme_url &&
    item?.image_theme_profile === profileId &&
    item?.image_finish_profile === PRO_FINISH_PROFILE &&
    item?.image_finish_safety === "dish-integrity-locked"
  );
}

function patchForExistingTheme(item) {
  return {
    id:item.id,
    patch:{
      image_url:item.image_theme_url,
      image_path:item.image_theme_path || item.image_path || "",
      image_variant:"theme",
      image_status:"ready",
    },
  };
}

function finishPatch(finish) {
  return {
    image_finish_profile:finish?.profile || PRO_FINISH_PROFILE,
    image_finish_source:finish?.source || "local-vision",
    image_finish_safety:finish?.safety || "dish-integrity-locked",
    image_finish_confidence:Number.isFinite(Number(finish?.confidence)) ? Number(finish.confidence) : null,
    image_finish_model:finish?.model || "",
    image_finish_recipe:finish?.recipe || null,
  };
}

function assetPatch(result) {
  const asset = result?.asset;
  if (!asset) return {};
  return {
    photo_asset_id:asset.id,
    image_hash:result.imageHash || asset.image_hash || "",
    image_analysis_profile:result.analysisProfile || asset.analysis_profile || "",
    image_original_url:asset.original_url || "",
    image_original_path:asset.original_path || "",
    image_processed_url:asset.processed_url || asset.original_url || "",
    image_processed_path:asset.processed_path || asset.original_path || "",
    image_quality_score:Number.isFinite(Number(asset.quality_score)) ? Number(asset.quality_score) : null,
    image_quality_level:asset.quality_level || "",
    image_quality_notes:Array.isArray(asset.quality_notes) ? asset.quality_notes : [],
    image_focus_x:Number.isFinite(Number(asset.focus_x)) ? Number(asset.focus_x) : 50,
    image_focus_y:Number.isFinite(Number(asset.focus_y)) ? Number(asset.focus_y) : 50,
    image_processing_profile:asset.analysis?.processingProfile || "natural-auto-v2",
    image_processed_at:asset.analyzed_at || result.processedAt || null,
  };
}

async function mapWithConcurrency(items, concurrency, worker, onProgress) {
  const results = new Array(items.length);
  let cursor = 0;
  let completed = 0;
  const count = Math.max(1, Math.min(concurrency, items.length || 1));

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { ok:true, value:await worker(items[index], index) };
      } catch (error) {
        results[index] = { ok:false, error, item:items[index] };
      } finally {
        completed += 1;
        onProgress?.(completed, items.length);
      }
    }
  }

  await Promise.all(Array.from({ length:count }, run));
  return results;
}

export default function MenuPhotoBatchControl({ menu, design, siteId, slug, language="en", onApplyItemPatches }) {
  const copy = COPY[language] || COPY.en;
  const [authUser,setAuthUser] = useState(undefined);
  const [authOpen,setAuthOpen] = useState(false);
  const [running,setRunning] = useState(false);
  const [progress,setProgress] = useState({done:0,total:0});
  const [message,setMessage] = useState("");
  const [messageType,setMessageType] = useState("");
  const profile = useMemo(() => resolveMenuPhotoProfile(design || {}), [design]);
  const profileLabel = menuPhotoProfileLabel(profile, language);
  const profileDescription = menuPhotoProfileDescription(profile, language);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession()
      .then(({ data }) => { if (active) setAuthUser(data?.session?.user || null); })
      .catch(() => { if (active) setAuthUser(null); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setAuthUser(nextSession?.user || null);
    });
    return () => {
      active = false;
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (messageType === "success") {
      const timer = window.setTimeout(() => { setMessage(""); setMessageType(""); }, 4200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [messageType, message]);

  const photoItems = useMemo(() => (menu?.items || []).filter(hasPhoto), [menu?.items]);
  const finishedItems = useMemo(() => photoItems.filter(item => isProfessionallyFinished(item, profile.id)), [photoItems, profile.id]);
  const activationItems = useMemo(() => finishedItems.filter(item => item.image_variant !== "theme" || item.image_url !== item.image_theme_url), [finishedItems]);
  const retuneItems = useMemo(() => photoItems.filter(item => !isProfessionallyFinished(item, profile.id)), [photoItems, profile.id]);
  const needsAction = retuneItems.length + activationItems.length;
  const readyCount = Math.max(0, photoItems.length - needsAction);
  const reusableCount = useMemo(() => photoItems.filter(hasReusableAsset).length, [photoItems]);
  const firstAnalysisCount = useMemo(() => retuneItems.filter(item => !hasReusableAsset(item)).length, [retuneItems]);

  const qualityScores = useMemo(() => photoItems.map(item => Number(item.image_quality_score)).filter(Number.isFinite), [photoItems]);
  const averageQuality = qualityScores.length ? Math.round(qualityScores.reduce((sum,value) => sum + value, 0) / qualityScores.length) : null;
  const attentionItems = useMemo(() => photoItems.filter(item => {
    const score = Number(item.image_quality_score);
    return Number.isFinite(score) && score < 72;
  }), [photoItems]);
  const lowQualityItems = useMemo(() => photoItems.filter(item => {
    const score = Number(item.image_quality_score);
    return Number.isFinite(score) && score < 52;
  }), [photoItems]);
  const aiFinished = useMemo(() => photoItems.filter(item => String(item.image_finish_source || "").includes("ai-vision")).length, [photoItems]);
  const localFinished = Math.max(0, photoItems.length - aiFinished);
  const coverage = photoItems.length ? Math.round((finishedItems.length / photoItems.length) * 100) : 0;

  async function matchAll() {
    if (running || !photoItems.length || !needsAction) return;
    setMessage("");
    setMessageType("");

    if (retuneItems.length && !authUser) {
      setMessage(copy.auth);
      setMessageType("error");
      setAuthOpen(true);
      return;
    }

    setRunning(true);
    const direct = activationItems.map(patchForExistingTheme);
    setProgress({done:direct.length,total:needsAction});

    try {
      const results = await mapWithConcurrency(retuneItems, 2, async item => {
        const tuned = await retuneMenuItemImage({
          sourceUrl:sourceFor(item),
          sourcePath:sourcePathFor(item),
          siteId,
          slug,
          itemId:item.id,
          themeProfile:profile,
          photoAssetId:item.photo_asset_id || "",
        });
        if (!tuned.theme?.url) throw new Error("Beyond could not create the current theme photo.");
        return {
          id:item.id,
          patch:{
            ...assetPatch(tuned),
            image_url:tuned.theme.url,
            image_path:tuned.theme.path,
            image_theme_url:tuned.theme.url,
            image_theme_path:tuned.theme.path,
            image_theme_profile:tuned.themeProfile,
            image_theme_processed_at:tuned.processedAt,
            image_width:tuned.theme.width,
            image_height:tuned.theme.height,
            image_variant:"theme",
            image_status:"ready",
            ...finishPatch(tuned.finish),
          },
        };
      }, done => setProgress({done:direct.length + done,total:needsAction}));

      const successful = results.filter(result => result?.ok).map(result => result.value);
      const failed = results.filter(result => result && !result.ok);
      const patches = [...direct, ...successful];
      if (patches.length) onApplyItemPatches?.(patches);

      if (failed.length) {
        const authFailure = failed.find(result => result.error?.code === MENU_PHOTO_AUTH_REQUIRED);
        if (authFailure) {
          setAuthUser(null);
          setAuthOpen(true);
          setMessage(copy.auth);
        } else {
          setMessage(`${copy.partial} · ${failed.length}/${retuneItems.length}`);
        }
        setMessageType("error");
      } else {
        const reused = successful.some(result => result.patch?.photo_asset_id);
        setMessage(`${copy.done}${successful.length ? ` · ${reused ? copy.aiDone : copy.localDone}` : ""}`);
        setMessageType("success");
      }
    } catch (error) {
      if (error?.code === MENU_PHOTO_AUTH_REQUIRED) {
        setAuthUser(null);
        setAuthOpen(true);
        setMessage(copy.auth);
      } else {
        setMessage(error?.message || copy.failed);
      }
      setMessageType("error");
    } finally {
      setRunning(false);
    }
  }

  return <section className="studio-v3-photo-batch">
    <div className="studio-v3-photo-batch-head">
      <div>
        <span>{copy.eyebrow}</span>
        <strong>{copy.title}</strong>
      </div>
      {photoItems.length ? <b>{readyCount}/{photoItems.length}</b> : null}
    </div>

    <div className="studio-v3-photo-batch-profile">
      <span className="studio-v3-photo-batch-swatch" aria-hidden="true"/>
      <div><strong>{profileLabel}</strong><small>{profileDescription}</small></div>
    </div>

    {photoItems.length ? <div className="studio-v3-photo-regulation">
      <div className="studio-v3-photo-regulation-head"><span>{copy.audit}</span><strong>{copy.consistency}</strong></div>
      <div className="studio-v3-photo-regulation-grid">
        <div className={coverage === 100 ? "ok" : "warn"}><span>{copy.coverage}</span><strong>{coverage}%</strong><small>{finishedItems.length}/{photoItems.length}</small></div>
        <div className={averageQuality === null ? "neutral" : averageQuality >= 72 ? "ok" : "warn"}><span>{copy.quality}</span><strong>{averageQuality === null ? "—" : `${averageQuality}/100`}</strong><small>{averageQuality === null ? copy.qualityMissing : `${qualityScores.length}/${photoItems.length}`}</small></div>
        <div className={attentionItems.length ? "warn" : "ok"}><span>{copy.attention}</span><strong>{attentionItems.length}</strong><small>{lowQualityItems.length ? `${lowQualityItems.length} low quality` : "✓"}</small></div>
      </div>
      <div className="studio-v3-photo-regulation-engine"><span>{copy.cached} {reusableCount}/{photoItems.length}</span><span>{copy.analysis} {firstAnalysisCount}</span><span>{copy.local} {localFinished}</span>{aiFinished ? <span>{copy.ai} {aiFinished}</span> : null}<b>Dish Integrity Lock</b></div>
      {lowQualityItems.length ? <p className="studio-v3-photo-regulation-warning">{copy.replace}</p> : null}
    </div> : null}

    {!photoItems.length ? <p className="studio-v3-photo-batch-empty">{copy.empty}</p> : <>
      <div className="studio-v3-photo-batch-status">
        <span>{photoItems.length} {copy.photos}</span>
        <span>{readyCount} {copy.matched}</span>
        <span className={needsAction ? "needs" : "ready"}>{needsAction} {copy.needs}</span>
      </div>
      {running ? <div className="studio-v3-photo-batch-progress" aria-live="polite">
        <div><span>{copy.working}</span><strong>{progress.done}/{progress.total}</strong></div>
        <i><span style={{width:`${progress.total ? Math.round((progress.done / progress.total) * 100) : 100}%`}}/></i>
      </div> : null}
      {!running && !needsAction ? <div className="studio-v3-photo-batch-ready">✓ {copy.ready}</div> : null}
      <button type="button" className="studio-v3-photo-batch-button" disabled={running || !needsAction} onClick={matchAll}>
        {running ? `${copy.working} ${progress.done}/${progress.total}` : copy.button}
      </button>
      <small className="studio-v3-photo-batch-safe">{copy.safe}</small>
    </>}

    {message ? <div className={`studio-v3-photo-batch-message ${messageType}`} role="status">{message}</div> : null}
    <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="login"/>
  </section>;
}
