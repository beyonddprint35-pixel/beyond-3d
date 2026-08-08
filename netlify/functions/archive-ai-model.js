const BUCKET = "ai-models";

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function getBearerToken(event) {
  const header =
    event.headers.authorization ||
    event.headers.Authorization ||
    "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
}

function getSupabaseConfig() {
  return {
    url:
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey:
      process.env.SUPABASE_SECRET_KEY,
  };
}

function encodeStoragePath(path) {
  return String(path)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

async function verifyUser(event, supabaseUrl, serviceKey) {
  const token = getBearerToken(event);

  if (!token) {
    return null;
  }

  const response = await fetch(
    `${supabaseUrl}/auth/v1/user`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok || !data?.id) {
    return null;
  }

  return data;
}

async function loadGeneration(
  supabaseUrl,
  serviceKey,
  generationId,
  userId
) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/ai_generations?id=eq.${encodeURIComponent(
      generationId
    )}&user_id=eq.${encodeURIComponent(
      userId
    )}&select=*&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Generation lookup failed:", data);
    return null;
  }

  return data?.[0] || null;
}

async function uploadRemoteAsset({
  remoteUrl,
  storagePath,
  contentType,
  supabaseUrl,
  serviceKey,
}) {
  if (!remoteUrl || !storagePath) {
    return null;
  }

  const sourceResponse = await fetch(remoteUrl);

  if (!sourceResponse.ok || !sourceResponse.body) {
    throw new Error(
      `Unable to retrieve generated asset (${sourceResponse.status}).`
    );
  }

  const detectedType =
    sourceResponse.headers.get("content-type") ||
    contentType ||
    "application/octet-stream";

  const uploadResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeStoragePath(
      storagePath
    )}`,
    {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": detectedType,
        "x-upsert": "true",
      },
      body: sourceResponse.body,
      duplex: "half",
    }
  );

  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text();
    console.error("Storage upload failed:", detail);
    throw new Error("Unable to archive generated asset.");
  }

  return storagePath;
}

async function updateGeneration(
  supabaseUrl,
  serviceKey,
  generationId,
  updates
) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/ai_generations?id=eq.${encodeURIComponent(
      generationId
    )}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Generation update failed:", data);
    throw new Error("Unable to save archived model paths.");
  }

  return data?.[0] || null;
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, {
      error: "Method not allowed",
    });
  }

  const { url: supabaseUrl, serviceKey } =
    getSupabaseConfig();

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, {
      error: "Supabase server configuration is incomplete.",
    });
  }

  const user = await verifyUser(
    event,
    supabaseUrl,
    serviceKey
  );

  if (!user) {
    return jsonResponse(401, {
      error: "Please log in again.",
    });
  }

  let body;

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, {
      error: "Invalid request body.",
    });
  }

  const generationId = body.generationId;

  if (!generationId) {
    return jsonResponse(400, {
      error: "Missing generation ID.",
    });
  }

  const generation = await loadGeneration(
    supabaseUrl,
    serviceKey,
    generationId,
    user.id
  );

  if (!generation) {
    return jsonResponse(404, {
      error: "AI model not found for this customer.",
    });
  }

  if (generation.status !== "SUCCEEDED") {
    return jsonResponse(409, {
      error: "This AI model is not ready yet.",
    });
  }

  try {
    const baseFolder =
      `${user.id}/${generation.id}`;

    let glbStoragePath =
      generation.glb_storage_path || null;

    let model3mfStoragePath =
      generation.model_3mf_storage_path || null;

    let thumbnailStoragePath =
      generation.thumbnail_storage_path || null;

    if (!glbStoragePath && generation.glb_url) {
      glbStoragePath = await uploadRemoteAsset({
        remoteUrl: generation.glb_url,
        storagePath: `${baseFolder}/model.glb`,
        contentType: "model/gltf-binary",
        supabaseUrl,
        serviceKey,
      });
    }

    if (
      !model3mfStoragePath &&
      generation.model_3mf_url
    ) {
      model3mfStoragePath = await uploadRemoteAsset({
        remoteUrl: generation.model_3mf_url,
        storagePath: `${baseFolder}/model.3mf`,
        contentType: "application/octet-stream",
        supabaseUrl,
        serviceKey,
      });
    }

    if (
      !thumbnailStoragePath &&
      generation.thumbnail_url
    ) {
      thumbnailStoragePath = await uploadRemoteAsset({
        remoteUrl: generation.thumbnail_url,
        storagePath: `${baseFolder}/thumbnail.png`,
        contentType: "image/png",
        supabaseUrl,
        serviceKey,
      });
    }

    const archived = await updateGeneration(
      supabaseUrl,
      serviceKey,
      generation.id,
      {
        glb_storage_path: glbStoragePath,
        model_3mf_storage_path:
          model3mfStoragePath,
        thumbnail_storage_path:
          thumbnailStoragePath,
        archived_at:
          new Date().toISOString(),
      }
    );

    return jsonResponse(200, {
      success: true,
      generation: archived,
    });
  } catch (error) {
    console.error("Archive AI model error:", error);

    return jsonResponse(500, {
      error:
        error.message ||
        "Unable to archive AI model.",
    });
  }
};