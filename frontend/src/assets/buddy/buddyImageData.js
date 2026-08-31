// Bundle homepage mascot artwork with the app so production never depends on local-only image paths.
import pizza0 from "./pizzaBuddyChunk0";
import pizza1 from "./pizzaBuddyChunk1";
import pizza2 from "./pizzaBuddyChunk2";
import pizza3 from "./pizzaBuddyChunk3";
import pizza4 from "./pizzaBuddyChunk4";
import pizza5 from "./pizzaBuddyChunk5";

import tacos0 from "./tacosBuddyChunk0";
import tacos1 from "./tacosBuddyChunk1";
import tacos2 from "./tacosBuddyChunk2";
import tacos3 from "./tacosBuddyChunk3";
import tacos4 from "./tacosBuddyChunk4";

const WEBP_DATA_PREFIX = "data:image/webp;base64,";

export const PIZZA_BUDDY_IMAGE =
  `${WEBP_DATA_PREFIX}${pizza0}${pizza1}${pizza2}${pizza3}${pizza4}${pizza5}`;

export const TACOS_BUDDY_IMAGE =
  `${WEBP_DATA_PREFIX}${tacos0}${tacos1}${tacos2}${tacos3}${tacos4}`;
