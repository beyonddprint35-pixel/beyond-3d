const BUCKET = "ai-models";
const MESHY_BASE_URL = "https://api.meshy.ai";

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
    return `/openapi/v2/text-to-3d/${encodeURIComponent(taskId)}`;
  }

  if (taskType === "photos") {
    return `/openapi/v1/multi-image-to-3d/${encodeURIComponent(taskId)}`;
  }

  return null;
}

async function loadCommunityItem(
  supabaseUrl,
  serviceKey,
  itemId
) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/community_items?id=eq.${encodeURIComponent(
      itemId
    )}&source_type=eq.ai_model&select=id,source_id,source_payload&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  return data?.[0] || null;
}

async function loadGeneration(
  supabaseUrl,
  serviceKey,
  generationId
) {
  if (!generationId) return null;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/ai_generations?id=eq.${encodeURIComponent(
      generationId
    )}&select=id,meshy_task_id,mode,status,glb_storage_path&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  return data?.[0] || null;
}

async function streamFromSupabase(
  supabaseUrl,
  serviceKey,
  storagePath
) {
  if (!storagePath) return null;

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

  if (!response.ok || !response.body) return null;
  return response;
}

async function streamMeshyFallback(
  apiKey,
  taskId,
  taskType
) {
  if (!apiKey || !taskId || !taskType) return null;

  const endpoint = getStatusEndpoint(taskId, taskType);
  if (!endpoint) return null;

  const taskResponse = await fetch(
    `${MESHY_BASE_URL}${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!taskResponse.ok) return null;

  const taskData = await taskResponse.json();
  const modelUrl = taskData?.model_urls?.glb;

  if (taskData.status !== "SUCCEEDED" || !modelUrl) {
    return null;
  }

  const modelResponse = await fetch(modelUrl);

  if (!modelResponse.ok || !modelResponse.body) {
    return null;
  }

  return modelResponse;
}

export default async (request) => {
  if (request.method !== "GET") {
    return jsonResponse(
      { error: "Method not allowed" },
      405
    );
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY;
  const apiKey =
    process.env.MESHY_API_KEY;

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(
      { error: "Community model service is not configured." },
      500
    );
  }

  const url = new URL(request.url);
  const itemId = url.searchParams.get("id");

  if (!itemId) {
    return jsonResponse(
      { error: "Missing Community item ID." },
      400
    );
  }

  try {
    // Access is granted only when this AI generation has an explicit
    // published row in community_items. The private ai-models bucket
    // itself remains private.
    const communityItem = await loadCommunityItem(
      supabaseUrl,
      serviceKey,
      itemId
    );

    if (!communityItem) {
      return jsonResponse(
        { error: "Published AI creation not found." },
        404
      );
    }

    const sourcePayload =
      communityItem.source_payload || {};

    const generation = await loadGeneration(
      supabaseUrl,
      serviceKey,
      communityItem.source_id ||
        sourcePayload.generationId
    );

    const storagePath =
      generation?.glb_storage_path ||
      sourcePayload.glbStoragePath ||
      null;

    if (storagePath) {
      const storedResponse = await streamFromSupabase(
        supabaseUrl,
        serviceKey,
        storagePath
      );

      if (storedResponse) {
        return new Response(storedResponse.body, {
          status: 200,
          headers: {
            "Content-Type":
              storedResponse.headers.get("content-type") ||
              "model/gltf-binary",
            "Content-Disposition":
              `inline; filename="beyond-community-${itemId}.glb"`,
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    const fallback = await streamMeshyFallback(
      apiKey,
      generation?.meshy_task_id ||
        sourcePayload.meshyTaskId,
      generation?.mode ||
        sourcePayload.mode
    );

    if (fallback) {
      return new Response(fallback.body, {
        status: 200,
        headers: {
          "Content-Type": "model/gltf-binary",
          "Content-Disposition":
            `inline; filename="beyond-community-${itemId}.glb"`,
          "Cache-Control": "public, max-age=900",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return jsonResponse(
      {
        error:
          "The published AI model is not available as a 3D GLB yet.",
      },
      404
    );
  } catch (error) {
    console.error("Community AI model stream error:", error);

    return jsonResponse(
      { error: "Unable to stream this Community AI model." },
      500
    );
  }
};
