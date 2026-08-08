import crypto from "node:crypto";

const MESHY_BASE_URL =
  "https://api.meshy.ai";

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
    .digest("hex");
}

function safeCompare(
  received,
  expected
) {
  try {
    const a =
      Buffer.from(
        String(received),
        "utf8"
      );

    const b =
      Buffer.from(
        String(expected),
        "utf8"
      );

    if (
      a.length !==
      b.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      a,
      b
    );
  } catch {
    return false;
  }
}

function getStatusEndpoint(
  taskId,
  taskType
) {
  if (
    taskType === "text"
  ) {
    return `/openapi/v2/text-to-3d/${encodeURIComponent(
      taskId
    )}`;
  }

  if (
    taskType === "photos"
  ) {
    return `/openapi/v1/multi-image-to-3d/${encodeURIComponent(
      taskId
    )}`;
  }

  return null;
}

function jsonResponse(
  body,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        "Content-Type":
          "application/json",

        "Cache-Control":
          "no-store",
      },
    }
  );
}

export default async (
  request
) => {
  if (
    request.method !== "GET"
  ) {
    return jsonResponse(
      {
        error:
          "Method not allowed",
      },
      405
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
      {
        error:
          "AI Studio server configuration is incomplete.",
      },
      500
    );
  }

  const url =
    new URL(
      request.url
    );

  const taskId =
    url.searchParams.get(
      "id"
    );

  const taskType =
    url.searchParams.get(
      "type"
    );

  const token =
    url.searchParams.get(
      "token"
    );

  if (
    !taskId ||
    !taskType ||
    !token
  ) {
    return jsonResponse(
      {
        error:
          "Missing task id, type or token.",
      },
      400
    );
  }

  const expectedToken =
    createFileToken(
      taskId,
      taskType,
      tokenSecret
    );

  if (
    !safeCompare(
      token,
      expectedToken
    )
  ) {
    return jsonResponse(
      {
        error:
          "Invalid model file token.",
      },
      403
    );
  }

  const endpoint =
    getStatusEndpoint(
      taskId,
      taskType
    );

  if (!endpoint) {
    return jsonResponse(
      {
        error:
          "Invalid task type.",
      },
      400
    );
  }

  try {
    /* =========================================
       GET TASK FROM MESHY
    ========================================= */

    const taskResponse =
      await fetch(
        `${MESHY_BASE_URL}${endpoint}`,
        {
          headers: {
            Authorization:
              `Bearer ${apiKey}`,
          },
        }
      );

    if (
      !taskResponse.ok
    ) {
      const errorText =
        await taskResponse.text();

      console.error(
        "Meshy task lookup failed:",
        taskResponse.status,
        errorText
      );

      return jsonResponse(
        {
          error:
            "Unable to retrieve generated model.",
        },
        taskResponse.status
      );
    }

    const taskData =
      await taskResponse.json();

    if (
      taskData.status !==
      "SUCCEEDED"
    ) {
      return jsonResponse(
        {
          error:
            "Generated model is not ready yet.",
        },
        409
      );
    }

    const modelUrl =
      taskData
        ?.model_urls
        ?.glb;

    if (!modelUrl) {
      return jsonResponse(
        {
          error:
            "Meshy did not return a GLB model.",
        },
        404
      );
    }

    /* =========================================
       STREAM GLB FROM MESHY
       DO NOT CONVERT TO BASE64
    ========================================= */

    const modelResponse =
      await fetch(
        modelUrl
      );

    if (
      !modelResponse.ok ||
      !modelResponse.body
    ) {
      console.error(
        "Meshy GLB download failed:",
        modelResponse.status
      );

      return jsonResponse(
        {
          error:
            "Unable to retrieve the generated GLB.",
        },
        502
      );
    }

    /*
      Important:
      modelResponse.body is streamed
      directly back to the browser.
    */

    return new Response(
      modelResponse.body,
      {
        status: 200,

        headers: {
          "Content-Type":
            "model/gltf-binary",

          "Content-Disposition":
            `inline; filename="beyond-ai-${taskId}.glb"`,

          "Cache-Control":
            "private, max-age=3600",

          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "AI model streaming error:",
      error
    );

    return jsonResponse(
      {
        error:
          "Unable to stream generated model.",
      },
      500
    );
  }
};