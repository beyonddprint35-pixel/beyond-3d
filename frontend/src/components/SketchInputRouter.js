/* ======================================================================
   BEYOND CREATOR — SKETCH INPUT ROUTER
   ----------------------------------------------------------------------
   Browser-native dual-input router.

   INPUT OWNERSHIP

   Apple Pencil / stylus
     -> sketch
     -> select
     -> push / pull
     -> direct modeling

   Mouse
     -> precise desktop modeling

   Finger
     -> camera navigation
     -> tap selection when no navigation drag occurs

   Coalesced PointerEvents are real historical input samples and may be
   committed to sketch geometry.

   Predicted PointerEvents must remain visual-only and must never be
   committed to CAD geometry or history.
   ====================================================================== */


function nativePointerEvent(event) {
  return (
    event?.nativeEvent ||
    event ||
    null
  );
}


export function pointerTypeOf(event) {
  const native =
    nativePointerEvent(event);

  const type =
    String(
      native?.pointerType ||
      event?.pointerType ||
      "mouse"
    ).toLowerCase();

  if (
    type === "pen" ||
    type === "touch" ||
    type === "mouse"
  ) {
    return type;
  }

  return "mouse";
}


export function isTouchPointer(event) {
  return (
    pointerTypeOf(event) === "touch"
  );
}


export function isPencilPointer(event) {
  return (
    pointerTypeOf(event) === "pen"
  );
}


export function isDirectModelPointer(event) {
  return !isTouchPointer(event);
}


export function pointerClientPoint(event) {
  const native =
    nativePointerEvent(event);

  return {
    x: Number(
      native?.clientX ??
      event?.clientX ??
      0
    ),

    y: Number(
      native?.clientY ??
      event?.clientY ??
      0
    ),
  };
}


export function pointerTravelPx(
  start,
  event
) {
  if (!start) {
    return Infinity;
  }

  const point =
    pointerClientPoint(event);

  return Math.hypot(
    point.x - Number(start.x || 0),
    point.y - Number(start.y || 0)
  );
}


function safeEventList(
  event,
  methodName
) {
  const native =
    nativePointerEvent(event);

  const method =
    native?.[methodName];

  if (
    typeof method !== "function"
  ) {
    return [];
  }

  try {
    const values =
      method.call(native);

    return Array.isArray(values)
      ? values
      : Array.from(values || []);
  } catch {
    return [];
  }
}


/*
  High-frequency real samples generated between
  browser render frames.

  Particularly useful with Apple Pencil/stylus input.
*/
export function coalescedPointerEvents(
  event
) {
  const native =
    nativePointerEvent(event);

  const values =
    safeEventList(
      event,
      "getCoalescedEvents"
    );

  if (!values.length) {
    return native
      ? [native]
      : [event].filter(Boolean);
  }

  return values;
}


/*
  Browser-provided prediction.

  IMPORTANT:
  These points are visual hints only.
  Never put these into CAD history.
*/
export function predictedPointerEvents(
  event
) {
  return safeEventList(
    event,
    "getPredictedEvents"
  );
}


/*
  Pencil telemetry foundation.

  Browser support varies, so every value
  safely falls back to zero.
*/
export function pointerTelemetry(event) {
  const native =
    nativePointerEvent(event);

  return {
    pointerId:
      Number(
        native?.pointerId ??
        event?.pointerId ??
        -1
      ),

    pointerType:
      pointerTypeOf(event),

    pressure:
      Number(
        native?.pressure ?? 0
      ),

    tangentialPressure:
      Number(
        native?.tangentialPressure ??
        0
      ),

    tiltX:
      Number(
        native?.tiltX ?? 0
      ),

    tiltY:
      Number(
        native?.tiltY ?? 0
      ),

    twist:
      Number(
        native?.twist ?? 0
      ),

    width:
      Number(
        native?.width ?? 0
      ),

    height:
      Number(
        native?.height ?? 0
      ),

    isPrimary:
      Boolean(
        native?.isPrimary ??
        true
      ),

    timeStamp:
      Number(
        native?.timeStamp ??
        performance.now()
      ),
  };
}


export function createPointerSession(
  event,
  extra = {}
) {
  const point =
    pointerClientPoint(event);

  return {
    ...extra,

    pointerId:
      Number(
        event?.pointerId ??
        event?.nativeEvent?.pointerId ??
        -1
      ),

    pointerType:
      pointerTypeOf(event),

    x:
      point.x,

    y:
      point.y,

    at:
      performance.now(),

    moved:
      false,

    telemetry:
      pointerTelemetry(event),
  };
}
