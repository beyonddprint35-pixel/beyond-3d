const crypto = require("crypto");

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

  if (
    !expected ||
    getAccessCode(
      event
    ) !== expected
  ) {
    return false;
  }

  return true;
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
    return null;
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
    return null;
  }

  return data;
}

async function getOwnedGeneration(
  supabaseUrl,
  serviceKey,
  taskId,
  userId
) {
  const response =
    await fetch(
      `${supabaseUrl}/rest/v1/ai_generations?meshy_task_id=eq.${encodeURIComponent(
        taskId
      )}&user_id=eq.${encodeURIComponent(
        userId
      )}&select=id,user_id,meshy_task_id,status&limit=1`,
      {
        headers: {
          apikey:
            serviceKey,

          Authorization:
            `Bearer ${serviceKey}`,
        },
      }
    );

  const data =
    await response.json();

  if (
    !response.ok
  ) {
    console.error(
      "AI generation ownership lookup failed:",
      data
    );

    return null;
  }

  return data?.[0] ||
    null;
}

async function updateGeneration(
  supabaseUrl,
  serviceKey,
  generationId,
  updates
) {
  const response =
    await fetch(
      `${supabaseUrl}/rest/v1/ai_generations?id=eq.${encodeURIComponent(
        generationId
      )}`,
      {
        method:
          "PATCH",

        headers: {
          apikey:
            serviceKey,

          Authorization:
            `Bearer ${serviceKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            ...updates,
            updated_at:
              new Date()
                .toISOString(),
          }),
      }
    );

  if (
    !response.ok
  ) {
    const errorData =
      await response.text();

    console.error(
      "Unable to update AI generation:",
      errorData
    );
  }
}

function createFileToken(
  taskId,
  taskType,
  secret
) {
  return crypto
    .createHmac(
      "sha256",
      secret
    )
    .update(
      `${taskType}:${taskId}`
    )
    .digest(
      "hex"
    );
}

async function readJson(
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

exports.handler =
async function (event) {
  if (
    event.httpMethod !==
    "GET"
  ) {
    return jsonResponse(
      405,
      {
        error:
          "Method not allowed",
      }
    );
  }

  if (
    !checkAccess(
      event
    )
  ) {
    return jsonResponse(
      401,
      {
        error:
          "Invalid AI Studio access code.",
      }
    );
  }

  const apiKey =
    process.env
      .MESHY_API_KEY;

  const tokenSecret =
    process.env
      .AI_STUDIO_ACCESS_CODE;

  const {
    url:
      supabaseUrl,
    serviceKey,
  } =
    getSupabaseConfig();

  if (
    !apiKey ||
    !tokenSecret ||
    !supabaseUrl ||
    !serviceKey
  ) {
    return jsonResponse(
      500,
      {
        error:
          "AI Studio server configuration is incomplete.",
      }
    );
  }

  const user =
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
          "Please log in again before checking this AI model.",
      }
    );
  }

  const taskId =
    event
      .queryStringParameters
      ?.id;

  const taskType =
    event
      .queryStringParameters
      ?.type;

  if (
    !taskId ||
    !taskType
  ) {
    return jsonResponse(
      400,
      {
        error:
          "Missing task id or type.",
      }
    );
  }

  const generation =
    await getOwnedGeneration(
      supabaseUrl,
      serviceKey,
      taskId,
      user.id
    );

  if (!generation) {
    return jsonResponse(
      404,
      {
        error:
          "This AI generation does not belong to the logged-in customer.",
      }
    );
  }

  let endpoint;

  if (
    taskType ===
    "text"
  ) {
    endpoint =
      `/openapi/v2/text-to-3d/${encodeURIComponent(
        taskId
      )}`;
  } else if (
    taskType ===
    "photos"
  ) {
    endpoint =
      `/openapi/v1/multi-image-to-3d/${encodeURIComponent(
        taskId
      )}`;
  } else {
    return jsonResponse(
      400,
      {
        error:
          "Invalid task type.",
      }
    );
  }

  try {
    const response =
      await fetch(
        `${MESHY_BASE_URL}${endpoint}`,
        {
          headers: {
            Authorization:
              `Bearer ${apiKey}`,
          },
        }
      );

    const data =
      await readJson(
        response
      );

    if (
      !response.ok
    ) {
      console.error(
        "Meshy status error:",
        response.status,
        data
      );

      return jsonResponse(
        response.status,
        {
          error:
            data?.message ||
            data?.error ||
            "Unable to retrieve Meshy task.",
        }
      );
    }

    const status =
      data.status ||
      "PENDING";

    const progress =
      Number.isFinite(
        Number(
          data.progress
        )
      )
        ? Number(
            data.progress
          )
        : 0;

    const taskError =
      data?.task_error
        ?.message ||
      "";

    const glbUrl =
      data?.model_urls
        ?.glb ||
      null;

    const model3mfUrl =
      data?.model_urls
        ?.[
          "3mf"
        ] ||
      null;

    const thumbnailUrl =
      data
        ?.thumbnail_url ||
      null;

    const consumedCredits =
      data
        ?.consumed_credits ??
      null;

    await updateGeneration(
      supabaseUrl,
      serviceKey,
      generation.id,
      {
        status,
        glb_url:
          glbUrl,
        model_3mf_url:
          model3mfUrl,
        thumbnail_url:
          thumbnailUrl,
        credits_used:
          consumedCredits,
      }
    );

    const fileToken =
      status ===
      "SUCCEEDED"
        ? createFileToken(
            taskId,
            taskType,
            tokenSecret
          )
        : null;

    const viewerUrl =
      fileToken
        ? `/.netlify/functions/get-ai-model-file?id=${encodeURIComponent(
            taskId
          )}&type=${encodeURIComponent(
            taskType
          )}&token=${encodeURIComponent(
            fileToken
          )}`
        : null;

    return jsonResponse(
      200,
      {
        success: true,
        generationId:
          generation.id,
        id:
          data.id ||
          taskId,
        status,
        progress,
        error:
          taskError ||
          null,
        viewerUrl,
        model3mfUrl,
        thumbnailUrl,
        consumedCredits,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Get AI model status error:",
      error
    );

    return jsonResponse(
      500,
      {
        error:
          "Unable to check AI generation status.",
      }
    );
  }
};