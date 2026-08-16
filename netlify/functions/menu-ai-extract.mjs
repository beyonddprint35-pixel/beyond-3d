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
      type: "string"
    },

    detected_language: {
      type: "string",
      enum: ["he", "en", "mixed", "unknown"]
    },

    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,

        properties: {
          name_en: {
            type: "string"
          },

          name_he: {
            type: "string"
          },

          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,

              properties: {
                name_en: {
                  type: "string"
                },

                name_he: {
                  type: "string"
                },

                description: {
                  type: "string"
                },

                price: {
                  type: "string"
                },

                type: {
                  type: "string",
                  enum: ["item", "wine"]
                },

                category: {
                  type: "string"
                },

                origin: {
                  type: "string"
                },

                wine_bottle: {
                  type: "string"
                },

                wine_glass: {
                  type: "string"
                }
              },

              required: [
                "name_en",
                "name_he",
                "description",
                "price",
                "type",
                "category",
                "origin",
                "wine_bottle",
                "wine_glass"
              ]
            }
          }
        },

        required: [
          "name_en",
          "name_he",
          "items"
        ]
      }
    },

    warnings: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },

  required: [
    "restaurant_name",
    "detected_language",
    "sections",
    "warnings"
  ]
};

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({
      ok: true,
      function: "menu-ai-extract",
      message: "Beyond Menu AI is ready. Send a menu using POST."
    });
  }

  try {
    const OPENAI_API_KEY = getEnv("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      return jsonResponse(
        {
          error: "OPENAI_API_KEY is missing in Netlify."
        },
        500
      );
    }

    const body = await request.json();

    const {
      fileName,
      mimeType,
      fileSize,
      base64
    } = body || {};

    if (!fileName || !mimeType || !base64) {
      return jsonResponse(
        {
          error: "Menu file data is missing."
        },
        400
      );
    }

    const allowedTypes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png"
    ]);

    if (!allowedTypes.has(mimeType)) {
      return jsonResponse(
        {
          error: "Please upload PDF, JPG or PNG."
        },
        400
      );
    }

    if (Number(fileSize || 0) > 4 * 1024 * 1024) {
      return jsonResponse(
        {
          error: "Menu file must currently be under 4 MB."
        },
        400
      );
    }

    const content = [
      {
        type: "input_text",
        text:
          "You are Beyond Menu AI. " +
          "Read this restaurant or bar menu carefully and convert it into structured menu data. " +

          "RULES: " +
          "Do not invent products. " +
          "Do not invent prices. " +
          "Preserve every printed price exactly as shown. " +
          "Preserve currency symbols. " +
          "Detect menu sections such as Food, Cocktails, Beer, Wine, Whiskey, Soft Drinks and similar categories. " +

          "If the menu contains Hebrew and English, capture both languages. " +
          "If only Hebrew exists, preserve the Hebrew and provide a concise English translation. " +
          "If only English exists, preserve the English and provide a natural Hebrew translation. " +

          "For normal products use type item. " +
          "Use type wine only when a wine clearly has separate bottle and glass pricing. " +

          "Put unclear or unreadable information in warnings. " +
          "Never guess unreadable prices."
      }
    ];

    if (mimeType === "application/pdf") {
      content.push({
        type: "input_file",
        filename: fileName,
        file_data: base64
      });
    } else {
      content.push({
        type: "input_image",
        image_url: `data:${mimeType};base64,${base64}`,
        detail: "high"
      });
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          model: "gpt-5",

          store: false,

          input: [
            {
              role: "user",
              content
            }
          ],

          text: {
            format: {
              type: "json_schema",
              name: "beyond_restaurant_menu",
              strict: true,
              schema: MENU_SCHEMA
            }
          }
        })
      }
    );

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI error:", data);

      return jsonResponse(
        {
          error:
            data?.error?.message ||
            "OpenAI could not analyze the menu."
        },
        500
      );
    }

    const outputText = extractOutputText(data);

    if (!outputText) {
      return jsonResponse(
        {
          error: "OpenAI returned no menu data."
        },
        500
      );
    }

    let menu;

    try {
      menu = JSON.parse(outputText);
    } catch {
      console.error("Invalid menu JSON:", outputText);

      return jsonResponse(
        {
          error: "The AI menu result could not be parsed."
        },
        500
      );
    }

    return jsonResponse({
      ok: true,
      menu
    });

  } catch (error) {
    console.error("Beyond Menu AI error:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Menu AI failed."
      },
      500
    );
  }
};
