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

  if (
    !apiKey ||
    !tokenSecret
  ) {
    return jsonResponse(
      500,
      {
        error:
          "AI Studio server configuration is incomplete.",
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
        id:
          data.id ||
          taskId,
        status,
        progress,
        error:
          taskError ||
          null,
        viewerUrl,
        model3mfUrl:
          data?.model_urls
            ?.[
              "3mf"
            ] ||
          null,
        thumbnailUrl:
          data
            ?.thumbnail_url ||
          null,
        consumedCredits:
          data
            ?.consumed_credits ??
          null,
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