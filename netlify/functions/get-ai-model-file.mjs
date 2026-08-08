import crypto from "node:crypto";

const BUCKET = "ai-models";
const MESHY_BASE_URL = "https://api.meshy.ai";

function createFileToken(taskId, taskType, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${taskType}:${taskId}`)
    .digest("hex");
}

function safeCompare(received, expected) {
  try {
    const a = Buffer.from(String(received), "utf8");
    const b = Buffer.from(String(expected), "utf8");

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function encodeStoragePath(path) {
  return String(path)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

function getStatusEndpoint(taskId, taskType) {
  if (taskType === "text") {
    return `/openapi/v2/text-to-3d/${encodeURIComponent(
      taskId
    )}`;
  }

  if (taskType === "photos") {
    return `/openapi/v1/multi-image-to-3d/${encodeURIComponent(
      taskId
    )}`;
  }

  return null;
}

async function loadGeneration(
  supabaseUrl,
  serviceKey,
  taskId
) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/ai_generations?meshy_task_id=eq.${encodeURIComponent(
      taskId
    )}&select=id,glb_storage_path&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data?.[0] || null;
}

async function streamFromSupabase(
  supabaseUrl,
  serviceKey,
  storagePath
) {
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/authenticated/${BUCKET}/${encodeStoragePath(
      storagePath
    )}`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );

  if (!response.ok || !response.body) {
    return null;
  }

  return response;
}

export default async (request) => {
  if (request.method !== "GET") {
    return jsonResponse(
      { error: "Method not allowed" },
      405
    );
  }

  const apiKey = process.env.MESHY_API_KEY;
  const tokenSecret =
    process.env.AI_STUDIO_ACCESS_CODE;
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY;

  if (
    !tokenSecret ||
    !supabaseUrl ||
    !serviceKey
  ) {
    return jsonResponse(
      {
        error:
          "AI Studio server configuration is incomplete.",
      },
      500
    );
  }

  const url = new URL(request.url);
  const taskId = url.searchParams.get("id");
  const taskType = url.searchParams.get("type");
  const token = url.searchParams.get("token");

  if (!taskId || !taskType || !token) {
    return jsonResponse(
      {
        error:
          "Missing task id, type or token.",
      },
      400
    );
  }

  const expectedToken = createFileToken(
    taskId,
    taskType,
    tokenSecret
  );

  if (!safeCompare(token, expectedToken)) {
    return jsonResponse(
      { error: "Invalid model file token." },
      403
    );
  }

  try {
    // Prefer BEYOND permanent Supabase Storage.
    const generation = await loadGeneration(
      supabaseUrl,
      serviceKey,
      taskId
    );

    if (generation?.glb_storage_path) {
      const storedResponse = await streamFromSupabase(
        supabaseUrl,
        serviceKey,
        generation.glb_storage_path
      );

      if (storedResponse) {
        return new Response(storedResponse.body, {
          status: 200,
          headers: {
            "Content-Type":
              storedResponse.headers.get(
                "content-type"
              ) || "model/gltf-binary",
            "Content-Disposition":
              `inline; filename="beyond-ai-${taskId}.glb"`,
            "Cache-Control":
              "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    // Fallback for older generations that have not yet been archived.
    if (!apiKey) {
      return jsonResponse(
        { error: "Generated model is not archived yet." },
        404
      );
    }

    const endpoint = getStatusEndpoint(taskId, taskType);

    if (!endpoint) {
      return jsonResponse(
        { error: "Invalid task type." },
        400
      );
    }

    const taskResponse = await fetch(
      `${MESHY_BASE_URL}${endpoint}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!taskResponse.ok) {
      return jsonResponse(
        { error: "Unable to retrieve generated model." },
        taskResponse.status
      );
    }

    const taskData = await taskResponse.json();
    const modelUrl = taskData?.model_urls?.glb;

    if (
      taskData.status !== "SUCCEEDED" ||
      !modelUrl
    ) {
      return jsonResponse(
        { error: "Generated model is not ready." },
        409
      );
    }

    const modelResponse = await fetch(modelUrl);

    if (!modelResponse.ok || !modelResponse.body) {
      return jsonResponse(
        { error: "Unable to retrieve generated GLB." },
        502
      );
    }

    return new Response(modelResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "model/gltf-binary",
        "Content-Disposition":
          `inline; filename="beyond-ai-${taskId}.glb"`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("AI model file error:", error);

    return jsonResponse(
      { error: "Unable to stream generated model." },
      500
    );
  }
};