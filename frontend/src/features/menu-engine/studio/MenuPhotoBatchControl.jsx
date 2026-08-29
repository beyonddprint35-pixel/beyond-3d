import { useEffect, useMemo, useState } from "react";
import AuthModal from "../../../components/AuthModal";
import { supabase } from "../../../lib/supabaseClient";
import { MENU_PHOTO_AUTH_REQUIRED, retuneMenuItemImage } from "./menuItemImageStorage";
import { menuPhotoProfileDescription, menuPhotoProfileLabel, resolveMenuPhotoProfile } from "../domain/menuPhotoProfiles";
import "./MenuPhotoBatchControl.css";

const COPY = {
  en:{eyebrow:"BEYOND PRO FINISH",title:"Professional photo finish",photos:"photos",matched:"finished",needs:"need finishing",empty:"Add item photos to use professional menu-wide finishing.",ready:"Every menu photo is professionally finished for this design.",button:"Finish all photos",working:"Finishing photos",safe:"Dish Integrity Lock · adaptive light, white balance, shadows, highlights and contrast only. No generative food edits.",done:"Professional photo finish complete",aiDone:"AI vision directed the finish inside Beyond's local safety guardrails",localDone:"Beyond local vision completed the professional finish",partial:"Some photos could not be finished",auth:"Sign in to finish menu photos.",failed:"Photo finishing failed"},
  he:{eyebrow:"BEYOND PRO FINISH",title:"גימור מקצועי לתמונות",photos:"תמונות",matched:"הושלמו",needs:"דורשות גימור",empty:"הוסיפו תמונות לפריטים כדי להשתמש בגימור מקצועי לכל התפריט.",ready:"כל תמונות התפריט עברו גימור מקצועי לעיצוב הזה.",button:"גימור לכל התמונות",working:"מבצע גימור לתמונות",safe:"נעילת שלמות המנה · התאמות אור, איזון לבן, צללים, אזורים בהירים וניגודיות בלבד. ללא עריכה גנרטיבית של האוכל.",done:"הגימור המקצועי הושלם",aiDone:"ראיית AI כיוונה את הגימור בתוך מגבלות הבטיחות המקומיות של Beyond",localDone:"מנוע הראייה המקומי של Beyond השלים את הגימור המקצועי",partial:"חלק מהתמונות לא עברו גימור",auth:"יש להתחבר כדי לבצע גימור לתמונות התפריט.",failed:"גימור התמונות נכשל"},
  ar:{eyebrow:"BEYOND PRO FINISH",title:"تشطيب احترافي للصور",photos:"صور",matched:"مكتملة",needs:"تحتاج تشطيباً",empty:"أضف صور العناصر لاستخدام التشطيب الاحترافي على مستوى القائمة.",ready:"تم تشطيب كل صور القائمة احترافياً لهذا التصميم.",button:"تشطيب كل الصور",working:"جارٍ تشطيب الصور",safe:"قفل سلامة الطبق · تعديلات الإضاءة وتوازن الأبيض والظلال والإضاءات العالية والتباين فقط. بدون تعديلات توليدية للطعام.",done:"اكتمل التشطيب الاحترافي للصور",aiDone:"وجّهت رؤية AI التشطيب داخل ضوابط الأمان المحلية في Beyond",localDone:"أكمل محرك الرؤية المحلي في Beyond التشطيب الاحترافي",partial:"تعذر تشطيب بعض الصور",auth:"سجّل الدخول لتشطيب صور القائمة.",failed:"فشل تشطيب الصور"},
};

function sourceFor(item) {
  return String(item?.image_original_url || item?.image_processed_url || item?.image_url || "");
}

function hasPhoto(item) {
  return Boolean(sourceFor(item));
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
    image_finish_profile:finish?.profile || "dish-safe-pro-v1",
    image_finish_source:finish?.source || "local-vision",
    image_finish_safety:finish?.safety || "dish-integrity-locked",
    image_finish_confidence:Number.isFinite(Number(finish?.confidence)) ? Number(finish.confidence) : null,
    image_finish_model:finish?.model || "",
    image_finish_recipe:finish?.recipe || null,
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
  const currentThemeItems = useMemo(() => photoItems.filter(item => item.image_theme_url && item.image_theme_profile === profile.id), [photoItems, profile.id]);
  const activationItems = useMemo(() => currentThemeItems.filter(item => item.image_variant !== "theme" || item.image_url !== item.image_theme_url), [currentThemeItems]);
  const retuneItems = useMemo(() => photoItems.filter(item => !(item.image_theme_url && item.image_theme_profile === profile.id)), [photoItems, profile.id]);
  const needsAction = retuneItems.length + activationItems.length;
  const matchedCount = Math.max(0, photoItems.length - needsAction);

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
          siteId,
          slug,
          itemId:item.id,
          themeProfile:profile,
          previousThemePath:item.image_theme_path || "",
        });
        return {
          id:item.id,
          patch:{
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
        const aiUsed = successful.some(result => String(result.patch?.image_finish_source || "").includes("ai-vision"));
        setMessage(`${copy.done} · ${aiUsed ? copy.aiDone : copy.localDone}`);
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
      {photoItems.length ? <b>{matchedCount}/{photoItems.length}</b> : null}
    </div>

    <div className="studio-v3-photo-batch-profile">
      <span className="studio-v3-photo-batch-swatch" aria-hidden="true"/>
      <div><strong>{profileLabel}</strong><small>{profileDescription}</small></div>
    </div>

    {!photoItems.length ? <p className="studio-v3-photo-batch-empty">{copy.empty}</p> : <>
      <div className="studio-v3-photo-batch-status">
        <span>{photoItems.length} {copy.photos}</span>
        <span>{matchedCount} {copy.matched}</span>
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