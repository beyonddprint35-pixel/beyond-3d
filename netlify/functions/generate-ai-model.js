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

  if (!apiKey) {
    return jsonResponse(
      500,
      {
        error:
          "Missing MESHY_API_KEY.",
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

    return jsonResponse(
      200,
      {
        success: true,
        taskId:
          data.result,
        taskType,
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
          "Unable to start AI generation.",
      }
    );
  }
};