const MESHY_BASE_URL =
  "https://api.meshy.ai";

function jsonResponse(
  statusCode,
  body
) {
  return {
    statusCode,
    headers: {
      "Content-Type":
        "application/json",
      "Cache-Control":
        "no-store",
    },
    body:
      JSON.stringify(body),
  };
}

function getAccessCode(
  event
) {
  return (
    event.headers[
      "x-ai-access-code"
    ] ||
    event.headers[
      "X-AI-ACCESS-CODE"
    ] ||
    ""
  );
}

function getBearerToken(
  event
) {
  const header =
    event.headers
      .authorization ||
    event.headers
      .Authorization ||
    "";

  if (
    !header.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  return header
    .slice(7)
    .trim();
}

function checkAccess(
  event
) {
  const expected =
    process.env
      .AI_STUDIO_ACCESS_CODE;

  if (!expected) {
    return {
      ok: false,
      response:
        jsonResponse(
          503,
          {
            error:
              "AI Studio is not enabled yet. Add AI_STUDIO_ACCESS_CODE in Netlify.",
          }
        ),
    };
  }

  if (
    getAccessCode(
      event
    ) !== expected
  ) {
    return {
      ok: false,
      response:
        jsonResponse(
          401,
          {
            error:
              "Invalid AI Studio access code.",
          }
        ),
    };
  }

  return {
    ok: true,
  };
}

function getSupabaseConfig() {
  const url =
    process.env
      .SUPABASE_URL ||
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const serviceKey =
    process.env
      .SUPABASE_SECRET_KEY;

  return {
    url,
    serviceKey,
  };
}

async function verifyUser(
  event,
  supabaseUrl,
  serviceKey
) {
  const token =
    getBearerToken(
      event
    );

  if (!token) {
    return {
      user: null,
      error:
        "Please log in before using AI Studio.",
    };
  }

  const response =
    await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          apikey:
            serviceKey,

          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data?.id
  ) {
    return {
      user: null,
      error:
        "Your login session is invalid or has expired. Please log in again.",
    };
  }

  return {
    user: data,
    error: null,
  };
}

async function saveGeneration(
  supabaseUrl,
  serviceKey,
  row
) {
  const response =
    await fetch(
      `${supabaseUrl}/rest/v1/ai_generations`,
      {
        method:
          "POST",

        headers: {
          apikey:
            serviceKey,

          Authorization:
            `Bearer ${serviceKey}`,

          "Content-Type":
            "application/json",

          Prefer:
            "return=representation",
        },

        body:
          JSON.stringify(
            row
          ),
      }
    );

  const data =
    await response.json();

  if (
    !response.ok
  ) {
    console.error(
      "Unable to save AI generation:",
      data
    );

    throw new Error(
      "The model started, but BEYOND could not save it to your account."
    );
  }

  return data?.[0] ||
    null;
}

async function readMeshyResponse(
  response
) {
  const text =
    await response.text();

  try {
    return JSON.parse(
      text
    );
  } catch {
    return {
      message:
        text ||
        "Unknown Meshy response",
    };
  }
}

function normalizeMeshyError(
  status,
  data
) {
  const message =
    data?.message ||
    data?.error ||
    data?.detail ||
    data?.task_error
      ?.message ||
    "Meshy request failed.";

  if (status === 402) {
    return "Meshy credits are insufficient.";
  }

  if (status === 429) {
    return "Meshy rate limit reached. Please try again shortly.";
  }

  if (status === 401) {
    return "Meshy authentication failed. Check MESHY_API_KEY in Netlify.";
  }

  return message;
}

exports.handler =
async function (event) {
  if (
    event.httpMethod !==
    "POST"
  ) {
    return jsonResponse(
      405,
      {
        error:
          "Method not allowed",
      }
    );
  }

  const access =
    checkAccess(event);

  if (!access.ok) {
    return access.response;
  }

  const apiKey =
    process.env
      .MESHY_API_KEY;

  const {
    url:
      supabaseUrl,
    serviceKey,
  } =
    getSupabaseConfig();

  if (!apiKey) {
    return jsonResponse(
      500,
      {
        error:
          "Missing MESHY_API_KEY.",
      }
    );
  }

  if (
    !supabaseUrl ||
    !serviceKey
  ) {
    return jsonResponse(
      500,
      {
        error:
          "Supabase server configuration is incomplete.",
      }
    );
  }

  const {
    user,
    error:
      authError,
  } =
    await verifyUser(
      event,
      supabaseUrl,
      serviceKey
    );

  if (!user) {
    return jsonResponse(
      401,
      {
        error:
          authError,
      }
    );
  }

  let payload;

  try {
    payload =
      JSON.parse(
        event.body ||
          "{}"
      );
  } catch {
    return jsonResponse(
      400,
      {
        error:
          "Invalid JSON body.",
      }
    );
  }

  const mode =
    payload.mode;

  let endpoint;
  let meshyBody;
  let taskType;
  let savedPrompt =
    null;

  if (
    mode === "text"
  ) {
    const prompt =
      String(
        payload.prompt ||
          ""
      ).trim();

    if (
      prompt.length <
      10
    ) {
      return jsonResponse(
        400,
        {
          error:
            "Please provide a more detailed prompt.",
        }
      );
    }

    if (
      prompt.length >
      600
    ) {
      return jsonResponse(
        400,
        {
          error:
            "Prompt must be 600 characters or fewer.",
        }
      );
    }

    endpoint =
      "/openapi/v2/text-to-3d";

    taskType =
      "text";

    savedPrompt =
      prompt;

    meshyBody = {
      mode:
        "preview",

      prompt,

      ai_model:
        "latest",

      model_type:
        "standard",

      should_remesh:
        false,

      moderation:
        true,

      target_formats: [
        "glb",
        "3mf",
      ],
    };
  } else if (
    mode === "photos"
  ) {
    const imageUrls =
      Array.isArray(
        payload.images
      )
        ? payload.images
        : [];

    if (
      imageUrls.length <
        2 ||
      imageUrls.length >
        4
    ) {
      return jsonResponse(
        400,
        {
          error:
            "Upload 2 to 4 photos of the same object.",
        }
      );
    }

    const validImages =
      imageUrls.every(
        (image) =>
          typeof image ===
            "string" &&
          (
            image.startsWith(
              "data:image/jpeg;base64,"
            ) ||
            image.startsWith(
              "data:image/png;base64,"
            )
          )
      );

    if (
      !validImages
    ) {
      return jsonResponse(
        400,
        {
          error:
            "Only JPG and PNG images are supported.",
        }
      );
    }

    endpoint =
      "/openapi/v1/multi-image-to-3d";

    taskType =
      "photos";

    meshyBody = {
      image_urls:
        imageUrls,

      ai_model:
        "latest",

      should_texture:
        false,

      moderation:
        true,

      target_formats: [
        "glb",
        "3mf",
      ],
    };
  } else {
    return jsonResponse(
      400,
      {
        error:
          "Mode must be text or photos.",
      }
    );
  }

  try {
    const response =
      await fetch(
        `${MESHY_BASE_URL}${endpoint}`,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              meshyBody
            ),
        }
      );

    const data =
      await readMeshyResponse(
        response
      );

    if (
      !response.ok
    ) {
      console.error(
        "Meshy create task error:",
        response.status,
        data
      );

      return jsonResponse(
        response.status,
        {
          error:
            normalizeMeshyError(
              response.status,
              data
            ),
        }
      );
    }

    if (
      !data.result
    ) {
      return jsonResponse(
        502,
        {
          error:
            "Meshy did not return a task ID.",
        }
      );
    }

    const generation =
      await saveGeneration(
        supabaseUrl,
        serviceKey,
        {
          user_id:
            user.id,

          meshy_task_id:
            data.result,

          mode:
            taskType,

          prompt:
            savedPrompt,

          status:
            "PENDING",
        }
      );

    return jsonResponse(
      200,
      {
        success: true,
        taskId:
          data.result,
        taskType,
        generationId:
          generation?.id ||
          null,
        userId:
          user.id,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Generate AI model error:",
      error
    );

    return jsonResponse(
      500,
      {
        error:
          error.message ||
          "Unable to start AI generation.",
      }
    );
  }
};