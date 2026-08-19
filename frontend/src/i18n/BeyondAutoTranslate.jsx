import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  useBeyondLanguage,
} from "./BeyondLanguage";

import {
  BEYOND_HE,
} from "./beyondUiTranslations";


const SKIP_SELECTOR = [
  "script",
  "style",
  "code",
  "pre",
  "svg",
  "canvas",

  /* Restaurant public menus control their own language */
  ".bm-public",

  /* Explicit opt-out */
  "[data-no-beyond-translate]",
].join(",");


const ATTRIBUTE_NAMES = [
  "placeholder",
  "title",
  "aria-label",
];


function normalizeText(value) {
  return String(
    value || ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function shouldSkip(element) {
  if (!element) {
    return true;
  }

  return Boolean(
    element.closest(
      SKIP_SELECTOR
    )
  );
}


export default function BeyondAutoTranslate() {
  const {
    language,
  } = useBeyondLanguage();

  const observerRef =
    useRef(null);

  const frameRef =
    useRef(null);

  const applyingRef =
    useRef(false);


  /*
    Reverse dictionary:

    Hebrew displayed text
    -> original English text

    This is the important part of V2.
    We no longer depend on remembering
    old DOM nodes.
  */

  const englishByHebrew =
    useMemo(() => {
      const map =
        new Map();

      Object.entries(
        BEYOND_HE
      ).forEach(
        ([
          english,
          hebrew,
        ]) => {
          if (
            !hebrew ||
            map.has(
              normalizeText(
                hebrew
              )
            )
          ) {
            return;
          }

          map.set(
            normalizeText(
              hebrew
            ),
            english
          );
        }
      );

      return map;
    }, []);


  useEffect(() => {

    function convertText(
      value
    ) {
      const normalized =
        normalizeText(
          value
        );

      if (!normalized) {
        return null;
      }


      /*
        HEBREW MODE

        If text is already Hebrew,
        leave it alone.

        If it matches an English key,
        translate it.
      */

      if (
        language === "he"
      ) {
        if (
          BEYOND_HE[
            normalized
          ]
        ) {
          return BEYOND_HE[
            normalized
          ];
        }

        return null;
      }


      /*
        ENGLISH MODE

        If currently displayed text
        matches one of our Hebrew
        translations, force it back
        to its original English key.
      */

      if (
        englishByHebrew.has(
          normalized
        )
      ) {
        return englishByHebrew.get(
          normalized
        );
      }


      return null;
    }


    function convertTextNode(
      node
    ) {
      const parent =
        node.parentElement;

      if (
        shouldSkip(
          parent
        )
      ) {
        return;
      }


      const current =
        node.nodeValue;

      if (
        !current ||
        !current.trim()
      ) {
        return;
      }


      const converted =
        convertText(
          current
        );

      if (
        !converted ||
        normalizeText(current) ===
          normalizeText(converted)
      ) {
        return;
      }


      const leading =
        current.match(
          /^\s*/
        )?.[0] || "";

      const trailing =
        current.match(
          /\s*$/
        )?.[0] || "";


      node.nodeValue =
        `${leading}${converted}${trailing}`;
    }


    function convertAttributes(
      element
    ) {
      if (
        shouldSkip(
          element
        )
      ) {
        return;
      }


      ATTRIBUTE_NAMES.forEach(
        (attribute) => {
          if (
            !element.hasAttribute(
              attribute
            )
          ) {
            return;
          }


          const current =
            element.getAttribute(
              attribute
            );

          const converted =
            convertText(
              current
            );

          if (
            converted &&
            converted !== current
          ) {
            element.setAttribute(
              attribute,
              converted
            );
          }
        }
      );
    }


    function applyLanguage() {
      const root =
        document.getElementById(
          "root"
        );

      if (
        !root ||
        applyingRef.current
      ) {
        return;
      }


      applyingRef.current =
        true;

      observerRef.current
        ?.disconnect();


      try {

        /*
          TEXT NODES
        */

        const walker =
          document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT
          );

        let node =
          walker.nextNode();

        while (node) {
          convertTextNode(
            node
          );

          node =
            walker.nextNode();
        }


        /*
          PLACEHOLDER / TITLE / ARIA
        */

        root
          .querySelectorAll("*")
          .forEach(
            convertAttributes
          );

      } finally {

        applyingRef.current =
          false;


        observerRef.current
          ?.observe(
            root,
            {
              subtree: true,
              childList: true,
              characterData: true,
            }
          );
      }
    }


    function scheduleLanguageApply() {
      if (
        applyingRef.current
      ) {
        return;
      }


      if (
        frameRef.current
      ) {
        cancelAnimationFrame(
          frameRef.current
        );
      }


      frameRef.current =
        requestAnimationFrame(
          () => {
            frameRef.current =
              null;

            applyLanguage();
          }
        );
    }


    const root =
      document.getElementById(
        "root"
      );

    if (!root) {
      return undefined;
    }


    observerRef.current =
      new MutationObserver(
        () => {
          scheduleLanguageApply();
        }
      );


    /*
      Apply immediately whenever
      EN / HE changes.
    */

    applyLanguage();


    return () => {

      observerRef.current
        ?.disconnect();

      observerRef.current =
        null;


      if (
        frameRef.current
      ) {
        cancelAnimationFrame(
          frameRef.current
        );

        frameRef.current =
          null;
      }
    };

  }, [
    language,
    englishByHebrew,
  ]);


  return null;
}
