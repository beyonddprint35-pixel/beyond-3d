function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function getEnv(name) {
  try {
    if (globalThis.Netlify?.env?.get) {
      const value = globalThis.Netlify.env.get(name);
      if (value) return value;
    }
  } catch {}

  return process.env[name] || "";
}

function decodeJwtPayload(token) {
  try {
    const payload =
      token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalized =
      payload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const padded =
      normalized.padEnd(
        Math.ceil(
          normalized.length / 4
        ) * 4,
        "="
      );

    return JSON.parse(
      Buffer.from(
        padded,
        "base64"
      ).toString("utf8")
    );
  } catch {
    return null;
  }
}


function getServerHeaders(
  serviceKey
) {
  /*
    New Supabase sb_secret_... keys are
    NOT JWTs and must not be used as
    Authorization Bearer tokens.

    Legacy service_role JWT keys can
    still be supplied as Bearer tokens.
  */

  const headers = {
    apikey: serviceKey,
    "Content-Type":
      "application/json",
  };

  if (
    serviceKey?.startsWith(
      "eyJ"
    )
  ) {
    headers.Authorization =
      `Bearer ${serviceKey}`;
  }

  return headers;
}


function getBearerToken(request) {
  const header =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    "";

  if (!header.startsWith("Bearer ")) {
    return "";
  }

  return header.slice(7).trim();
}

async function verifyUser({
  token,
  supabaseUrl,
  publicKey,
}) {
  if (!token) {
    throw new Error(
      "AUTH_NO_TOKEN: Log in again before building your menu."
    );
  }

  /*
    Check the JWT issuer locally first.
    This does NOT verify the signature;
    Supabase still performs the actual
    authentication below.
  */
  const payload =
    decodeJwtPayload(
      token
    );

  const expectedIssuer =
    `${supabaseUrl}/auth/v1`;

  if (
    payload?.iss &&
    payload.iss !==
      expectedIssuer
  ) {
    console.error(
      "Menu AI JWT issuer mismatch:",
      {
        received:
          payload.iss,
        expected:
          expectedIssuer,
      }
    );

    throw new Error(
      "AUTH_WRONG_ISSUER: Your local login session belongs to a different Supabase project. Log out and log in again."
    );
  }

  const response =
    await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          apikey:
            publicKey,

          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  let data = null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (
    !response.ok ||
    !data?.id
  ) {
    console.error(
      "Menu AI user verification failed:",
      {
        status:
          response.status,

        error:
          data?.message ||
          data?.error ||
          null,

        issuer:
          payload?.iss ||
          null,
      }
    );

    throw new Error(
      data?.message ||
        data?.error ||
        "AUTH_VERIFY_FAILED: Your BEYOND login session could not be verified."
    );
  }

  return data;
}


async function callUserRpc({
  name,
  payload,
  token,
  supabaseUrl,
  publicKey,
}) {
  const response =
    await fetch(
      `${supabaseUrl}/rest/v1/rpc/${name}`,
      {
        method:
          "POST",

        headers: {
          /*
            User-context database calls:

            PUBLIC KEY
              +
            USER JWT

            This allows auth.uid() and
            Supabase RLS/RPC security to
            identify the actual customer.
          */
          apikey:
            publicKey,

          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            payload || {}
          ),
      }
    );

  let data = null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    console.error(
      `Menu AI RPC ${name} failed:`,
      {
        status:
          response.status,

        error:
          data?.message ||
          data?.error ||
          null,
      }
    );

    throw new Error(
      data?.message ||
        data?.error ||
        `Supabase RPC ${name} failed.`
    );
  }

  return data;
}


async function updateMenuProject({
  projectId,
  updates,
  supabaseUrl,
  serviceKey,
}) {
  const headers =
    getServerHeaders(
      serviceKey
    );

  headers.Prefer =
    "return=minimal";

  const response =
    await fetch(
      `${supabaseUrl}/rest/v1/menu_projects?id=eq.${encodeURIComponent(
        projectId
      )}`,
      {
        method:
          "PATCH",

        headers,

        body:
          JSON.stringify(
            updates
          ),
      }
    );

  if (!response.ok) {
    const detail =
      await response.text();

    console.error(
      "Menu project update failed:",
      {
        status:
          response.status,

        detail,
      }
    );

    throw new Error(
      "Could not save the generated menu draft."
    );
  }
}


function extractOutputText(response) {
  const parts = [];

  for (const output of response?.output || []) {
    if (output?.type !== "message") continue;

    for (const content of output?.content || []) {
      if (
        content?.type === "output_text" &&
        typeof content.text === "string"
      ) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("").trim();
}

const MENU_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    restaurant_name: {
      type: "string",
    },
    detected_language: {
      type: "string",
      enum: ["he", "en", "mixed", "unknown"],
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name_en: {
            type: "string",
          },
          name_he: {
            type: "string",
          },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name_en: {
                  type: "string",
                },
                name_he: {
                  type: "string",
                },
                description_en: {
                  type: "string",
                },
                description_he: {
                  type: "string",
                },
                price: {
                  type: "string",
                },
                price_options: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      label_en: {
                        type: "string",
                      },
                      label_he: {
                        type: "string",
                      },
                      price: {
                        type: "string",
                      },
                    },
                    required: [
                      "label_en",
                      "label_he",
                      "price",
                    ],
                  },
                },
                origin_en: {
                  type: "string",
                },
                origin_he: {
                  type: "string",
                },
              },
              required: [
                "name_en",
                "name_he",
                "description_en",
                "description_he",
                "price",
                "price_options",
                "origin_en",
                "origin_he",
              ],
            },
          },
        },
        required: [
          "name_en",
          "name_he",
          "items",
        ],
      },
    },
    warnings: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: [
    "restaurant_name",
    "detected_language",
    "sections",
    "warnings",
  ],
};

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function determineSourceType(files, text) {
  if (text && files.length) return "mixed";
  if (text) return "text";

  const hasPdf = files.some(
    file => file.mimeType === "application/pdf"
  );

  const hasImage = files.some(
    file => file.mimeType !== "application/pdf"
  );

  if (hasPdf && hasImage) return "mixed";
  if (hasPdf) return "pdf";
  return "image";
}

export default async request => {
  if (request.method !== "POST") {
    return jsonResponse({
      ok: true,
      function: "menu-ai-extract",
      message:
        "BEYOND Menu AI is ready. Authentication is required for generation.",
    });
  }

  let attemptId = "";
  let token = "";
  let supabaseUrl = "";
  let publicKey = "";
  let serviceKey = "";

  try {
    const openAiKey = getEnv("OPENAI_API_KEY");

    supabaseUrl =
      getEnv("SUPABASE_URL") ||
      getEnv("NEXT_PUBLIC_SUPABASE_URL") ||
      getEnv("VITE_SUPABASE_URL");

    /*
      Public key:
      used together with the signed-in
      user's JWT.

      Prefer the new publishable key,
      then fall back to the legacy anon
      key already used by the frontend.
    */
    /*
      USER AUTH KEY

      The frontend sends the exact anon/public key
      that its Supabase client is using.

      This removes any possibility of Netlify choosing
      a stale publishable key from another configuration.

      VITE_SUPABASE_ANON_KEY is public and safe to send
      from browser to Function.
    */
    publicKey =
      request.headers.get(
        "x-beyond-supabase-key"
      ) ||
      getEnv(
        "VITE_SUPABASE_ANON_KEY"
      ) ||
      getEnv(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      ) ||
      getEnv(
        "VITE_SUPABASE_PUBLISHABLE_KEY"
      ) ||
      getEnv(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );

    /*
      Server secret:
      used ONLY for privileged server
      writes after AI succeeds.
    */
    serviceKey =
      getEnv(
        "SUPABASE_SECRET_KEY"
      ) ||
      getEnv(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (!openAiKey) {
      return jsonResponse(
        {
          error: "OPENAI_API_KEY is missing in Netlify.",
        },
        500
      );
    }

    if (
      !supabaseUrl ||
      !publicKey ||
      !serviceKey
    ) {
      return jsonResponse(
        {
          error: "Supabase server configuration is missing in Netlify.",
        },
        500
      );
    }

    token = getBearerToken(request);

    const user = await verifyUser({
      token,
      supabaseUrl,
      publicKey,
    });

    if (!user.email_confirmed_at && !user.confirmed_at) {
      return jsonResponse(
        {
          error: "Verify your email before building a menu.",
        },
        403
      );
    }

    const body = await request.json();

    const projectId = String(
      body?.projectId || ""
    ).trim();

    const menuText = String(
      body?.text || ""
    ).trim();

    const files = Array.isArray(body?.files)
      ? body.files
      : body?.fileName &&
          body?.mimeType &&
          body?.base64
        ? [
            {
              fileName: body.fileName,
              mimeType: body.mimeType,
              fileSize: body.fileSize,
              base64: body.base64,
            },
          ]
        : [];

    if (!projectId) {
      return jsonResponse(
        {
          error: "Menu project is missing.",
        },
        400
      );
    }

    if (!menuText && files.length === 0) {
      return jsonResponse(
        {
          error:
            "Upload a PDF or menu photo, or paste/write your menu.",
        },
        400
      );
    }

    if (menuText && menuText.length < 10) {
      return jsonResponse(
        {
          error:
            "Please provide a little more menu text before generating.",
        },
        400
      );
    }

    if (menuText.length > 50000) {
      return jsonResponse(
        {
          error: "Menu text is too long.",
        },
        400
      );
    }

    if (files.length > 6) {
      return jsonResponse(
        {
          error: "Upload up to 6 menu files at a time.",
        },
        400
      );
    }

    let totalFileSize = 0;

    for (const file of files) {
      if (
        !file?.fileName ||
        !file?.mimeType ||
        !file?.base64
      ) {
        return jsonResponse(
          {
            error: "One of the uploaded menu files is incomplete.",
          },
          400
        );
      }

      if (!ALLOWED_TYPES.has(file.mimeType)) {
        return jsonResponse(
          {
            error:
              "Please upload PDF, JPG, PNG or WEBP menu files.",
          },
          400
        );
      }

      const fileSize = Number(
        file.fileSize || 0
      );

      if (fileSize > 4 * 1024 * 1024) {
        return jsonResponse(
          {
            error:
              `${file.fileName} is over the 4 MB per-file limit.`,
          },
          400
        );
      }

      totalFileSize += fileSize;
    }

    if (totalFileSize > 12 * 1024 * 1024) {
      return jsonResponse(
        {
          error:
            "The combined upload must currently be under 12 MB.",
        },
        400
      );
    }

    const sourceType = determineSourceType(
      files,
      menuText
    );

    const reservation = await callUserRpc({
      name: "reserve_menu_generation_attempt",
      payload: {
        p_project_id: projectId,
        p_source_type: sourceType,
      },
      token,
      supabaseUrl,
      publicKey,
    });

    attemptId = reservation?.attempt_id || "";

    if (!attemptId) {
      throw new Error(
        "Could not reserve a menu generation attempt."
      );
    }

    const content = [
      {
        type: "input_text",
        text:
          "You are BEYOND Menu AI. Convert the restaurant/bar menu supplied by the user into clean structured data for the BEYOND digital-menu template. " +
          "Do not invent menu items, prices, sizes or ingredients. Preserve every readable price and currency symbol exactly. " +
          "Create sensible top-level menu sections from the source. Preserve Hebrew and English where present. " +
          "If only Hebrew exists, preserve it and add a concise natural English translation. If only English exists, preserve it and add a natural Hebrew translation. " +
          "Use price_options whenever one item clearly has multiple labeled prices such as glass/bottle, shot/glass, small/large, or size variants. " +
          "If information is unclear, leave the affected field empty and add a warning instead of guessing. " +
          "The output is a draft preview that the customer can edit before subscribing.",
      },
    ];

    if (menuText) {
      content.push({
        type: "input_text",
        text: `MENU TEXT PROVIDED BY USER:\n\n${menuText}`,
      });
    }

    for (const file of files) {
      if (file.mimeType === "application/pdf") {
        content.push({
          type: "input_file",
          filename: file.fileName,
          file_data: file.base64,
        });
      } else {
        content.push({
          type: "input_image",
          image_url:
            `data:${file.mimeType};base64,${file.base64}`,
          detail: "high",
        });
      }
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5",
          store: false,
          input: [
            {
              role: "user",
              content,
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "beyond_restaurant_menu",
              strict: true,
              schema: MENU_SCHEMA,
            },
          },
        }),
      }
    );

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI menu error:", data);
      throw new Error(
        data?.error?.message ||
          "BEYOND AI could not analyze this menu."
      );
    }

    const outputText = extractOutputText(data);

    if (!outputText) {
      throw new Error(
        "BEYOND AI returned no menu data."
      );
    }

    let menu;

    try {
      menu = JSON.parse(outputText);
    } catch {
      console.error(
        "Invalid BEYOND menu JSON:",
        outputText
      );

      throw new Error(
        "The generated menu could not be parsed."
      );
    }

    const projectName =
      String(menu?.restaurant_name || "").trim() ||
      "My Menu";

    await updateMenuProject({
      projectId,
      supabaseUrl,
      serviceKey,
      updates: {
        name: projectName,
        source_type: sourceType,
        status: "ready",
        structured_menu: menu,
        source_metadata: {
          text_length: menuText.length,
          files: files.map(file => ({
            name: file.fileName,
            type: file.mimeType,
            size: Number(file.fileSize || 0),
          })),
        },
        last_error: null,
      },
    });

    const finish = await callUserRpc({
      name: "finish_menu_generation_attempt",
      payload: {
        p_attempt_id: attemptId,
        p_success: true,
        p_error_message: null,
      },
      token,
      supabaseUrl,
      publicKey,
    });

    return jsonResponse({
      ok: true,
      projectId,
      menu,
      remainingAttempts:
        reservation?.remaining_attempts ??
        finish?.remaining_attempts ??
        null,
      unlimited:
        Boolean(reservation?.unlimited),
    });
  } catch (error) {
    console.error(
      "BEYOND Menu AI error:",
      error
    );

    if (
      attemptId &&
      token &&
      supabaseUrl &&
      serviceKey
    ) {
      try {
        await callUserRpc({
          name: "finish_menu_generation_attempt",
          payload: {
            p_attempt_id: attemptId,
            p_success: false,
            p_error_message:
              error instanceof Error
                ? error.message
                : "Menu AI failed.",
          },
          token,
          supabaseUrl,
          publicKey,
        });
      } catch (finishError) {
        console.error(
          "Could not refund menu generation attempt:",
          finishError
        );
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : "Menu AI failed.";

    const status =
      message.includes("all 3 free")
        ? 429
        : 500;

    return jsonResponse(
      {
        error: message,
      },
      status
    );
  }
};
