import {
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabaseClient";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function UploadProject() {
  const [file, setFile] = useState(null);

  const [
    selectedAiModel,
    setSelectedAiModel,
  ] = useState(null);

  const [
    selectedCreatorModel,
    setSelectedCreatorModel,
  ] = useState(null);

  const [
    session,
    setSession,
  ] = useState(null);

  const [status, setStatus] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) {
          return;
        }

        setSession(
          data.session || null
        );
      });

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          (
            _event,
            nextSession
          ) => {
            if (!mounted) {
              return;
            }

            setSession(
              nextSession
            );
          }
        );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function loadSelectedAiModel() {
      const saved =
        sessionStorage.getItem(
          "beyondSelectedAiModel"
        );

      if (!saved) {
        setSelectedAiModel(
          null
        );

        return;
      }

      try {
        const parsed =
          JSON.parse(
            saved
          );

        setSelectedAiModel(
          parsed
        );
      } catch {
        sessionStorage.removeItem(
          "beyondSelectedAiModel"
        );

        setSelectedAiModel(
          null
        );
      }
    }

    function handleAiModelSelected(
      event
    ) {
      if (
        event.detail
      ) {
        setSelectedAiModel(
          event.detail
        );

        setFile(null);

        setSelectedCreatorModel(
          null
        );

        return;
      }

      loadSelectedAiModel();
    }

    loadSelectedAiModel();

    window.addEventListener(
      "focus",
      loadSelectedAiModel
    );

    window.addEventListener(
      "beyond-ai-model-selected",
      handleAiModelSelected
    );

    return () => {
      window.removeEventListener(
        "focus",
        loadSelectedAiModel
      );

      window.removeEventListener(
        "beyond-ai-model-selected",
        handleAiModelSelected
      );
    };
  }, []);

  useEffect(() => {
    function handleCreatorModelSelected(
      event
    ) {
      const detail =
        event.detail;

      const creatorFile =
        detail?.file;

      if (!creatorFile) {
        return;
      }

      if (
        creatorFile.size >
        MAX_FILE_SIZE
      ) {
        alert(
          "Creator model is larger than the 50 MB upload limit."
        );

        return;
      }

      sessionStorage.removeItem(
        "beyondSelectedAiModel"
      );

      setSelectedAiModel(
        null
      );

      setFile(
        creatorFile
      );

      setSelectedCreatorModel({
        name:
          creatorFile.name,
        format:
          detail.format ||
          "3MF",
        objectCount:
          detail.objectCount ||
          1,
        holeCount:
          detail.holeCount ||
          0,
        bounds:
          detail.bounds ||
          null,
        summary:
          detail.summary ||
          "",
      });

      setStatus(
        "BEYOND Creator model attached. Complete the project details and submit."
      );
    }

    window.addEventListener(
      "beyond-creator-model-selected",
      handleCreatorModelSelected
    );

    return () => {
      window.removeEventListener(
        "beyond-creator-model-selected",
        handleCreatorModelSelected
      );
    };
  }, []);

  function removeSelectedCreatorModel() {
    setSelectedCreatorModel(
      null
    );

    setFile(null);

    setStatus("");
  }

  function removeSelectedAiModel() {
    sessionStorage.removeItem(
      "beyondSelectedAiModel"
    );

    setSelectedAiModel(null);
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      alert("Maximum file size is 50 MB.");

      event.target.value = "";
      setFile(null);

      return;
    }

    setFile(selectedFile);

    setSelectedCreatorModel(
      null
    );

    if (selectedAiModel) {
      removeSelectedAiModel();
    }
  }

  function handleDrop(event) {
    event.preventDefault();

    const droppedFile = event.dataTransfer.files?.[0];

    if (!droppedFile) {
      return;
    }

    if (droppedFile.size > MAX_FILE_SIZE) {
      alert("Maximum file size is 50 MB.");
      return;
    }

    setFile(droppedFile);

    setSelectedCreatorModel(
      null
    );

    if (selectedAiModel) {
      removeSelectedAiModel();
    }
  }

  async function handleSubmit(event) {
  event.preventDefault();

  const formElement = event.currentTarget;

  setSubmitting(true);
  setStatus("");

  const form = new FormData(formElement);

    const supabaseUrl =
      import.meta.env.VITE_SUPABASE_URL;

    const publishableKey =
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
      setStatus("Supabase configuration is missing.");
      setSubmitting(false);
      return;
    }

    const orderId = crypto.randomUUID();

    const accessToken =
      session?.access_token ||
      null;

    let storagePath = null;

    try {
      // 1. Upload file to Supabase Storage

      if (file) {
        const cleanName = file.name
          .normalize("NFKD")
          .replace(/[^a-zA-Z0-9._-]/g, "-")
          .replace(/-+/g, "-");

        storagePath =
          `${orderId}/${Date.now()}-${cleanName}`;

        const encodedPath = storagePath
          .split("/")
          .map(encodeURIComponent)
          .join("/");

        const uploadResponse = await fetch(
          `${supabaseUrl}/storage/v1/object/order-files/${encodedPath}`,
          {
            method: "POST",

            headers: {
              apikey: publishableKey,

              Authorization:
                `Bearer ${
                  accessToken ||
                  publishableKey
                }`,

              "Content-Type":
                file.type ||
                "application/octet-stream",

              "x-upsert": "false",
            },

            body: file,
          }
        );

        if (!uploadResponse.ok) {
          const error =
            await uploadResponse.text();

          throw new Error(
            error || "File upload failed."
          );
        }
      }

      // 2. Build order object

      const order = {
        id: orderId,

        customer_name: String(
          form.get("name") || ""
        ).trim(),

        email: String(
          form.get("email") || ""
        ).trim(),

        phone: String(
          form.get("phone") || ""
        ).trim(),

        project_type: String(
          form.get("project_type") || ""
        ),

        material: String(
          form.get("material") || ""
        ),

        color: String(
          form.get("color") || ""
        ).trim(),

        quantity: Number(
          form.get("quantity") || 1
        ),

        needed_by:
          form.get("needed_by") || null,

        description: String(
          form.get("description") || ""
        ).trim(),

        status: "Submitted",

        file_name: file?.name || null,

        storage_path: storagePath,

        file_size: file?.size || null,

        user_id:
          session?.user?.id ||
          null,

        ai_generation_id:
          selectedAiModel
            ?.generationId ||
          null,

        ai_meshy_task_id:
          selectedAiModel
            ?.meshyTaskId ||
          null,

        ai_model_3mf_url:
          selectedAiModel
            ?.model3mfUrl ||
          null,

        ai_model_glb_storage_path:
          selectedAiModel
            ?.glbStoragePath ||
          null,

        ai_model_3mf_storage_path:
          selectedAiModel
            ?.model3mfStoragePath ||
          null,

        ai_model_thumbnail_storage_path:
          selectedAiModel
            ?.thumbnailStoragePath ||
          null,

        ai_model_thumbnail_url:
          selectedAiModel
            ?.thumbnailUrl ||
          null,

        source_type:
          selectedAiModel
            ? "AI_MODEL"
            : file
              ? "UPLOADED_FILE"
              : "NO_FILE",
      };

      // 3. Save order in Supabase database

      const orderResponse = await fetch(
        `${supabaseUrl}/rest/v1/orders`,
        {
          method: "POST",

          headers: {
            apikey: publishableKey,

            Authorization:
              `Bearer ${publishableKey}`,

            "Content-Type":
              "application/json",

            Prefer:
              "return=minimal",
          },

          body: JSON.stringify(order),
        }
      );

      if (!orderResponse.ok) {
        const error =
          await orderResponse.text();

        throw new Error(
          error || "Order submission failed."
        );
      }

      // 4. Try to send confirmation email
      // This will work once React is deployed on Netlify.

      try {
        const emailResponse = await fetch(
          "/.netlify/functions/send-confirmation",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              customerName:
                order.customer_name,

              customerEmail:
                order.email,

              orderNumber:
                `B3D-${orderId
                  .slice(0, 8)
                  .toUpperCase()}`,

              material:
                order.material,

              quantity:
                order.quantity,
            }),
          }
        );

        if (!emailResponse.ok) {
          console.warn(
            "Confirmation email could not be sent."
          );
        }
      } catch (emailError) {
        console.warn(
          "Confirmation email unavailable in local preview:",
          emailError
        );
      }

      const shortOrderNumber =
        `B3D-${orderId
          .slice(0, 8)
          .toUpperCase()}`;

      setStatus(
        `Request submitted successfully. Order ${shortOrderNumber}`
      );

      formElement.reset();
      setFile(null);
      setSelectedCreatorModel(
        null
      );
    } catch (error) {
      console.error(error);

      setStatus(
        "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>

      <style>{`
        .selected-ai-model-card {
          margin-bottom: 18px;
          padding: 16px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 14px;
          border: 1px solid rgba(86, 146, 200, 0.2);
          border-radius: 16px;
          background: rgba(47, 92, 132, 0.07);
        }

        .selected-ai-model-main {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .selected-ai-model-badge {
          flex-shrink: 0;
          padding: 7px 9px;
          border-radius: 999px;
          color: #8fb8d9;
          background: rgba(68, 123, 169, 0.14);
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 1.2px;
        }

        .selected-ai-model-copy {
          min-width: 0;
          display: grid;
          gap: 5px;
        }

        .selected-ai-model-copy strong {
          overflow: hidden;
          color: #c6d5e2;
          font-size: 11px;
          font-weight: 600;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .selected-ai-model-copy span {
          color: #667c90;
          font-size: 8px;
        }

        .selected-ai-model-thumbnail {
          width: 54px;
          height: 54px;
          object-fit: cover;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.07);
        }

        .selected-ai-model-remove {
          min-height: 34px;
          padding: 0 12px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 999px;
          color: #8094a7;
          background: rgba(255,255,255,0.02);
          font-size: 8px;
          cursor: pointer;
        }

        .drop-zone.has-ai-model {
          border-color: rgba(92, 150, 201, 0.16);
          background: rgba(45, 89, 128, 0.035);
        }

        .selected-creator-model-card {
          margin-bottom: 18px;
          padding: 16px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          border: 1px solid rgba(66, 151, 215, 0.22);
          border-radius: 16px;
          background: rgba(35, 104, 158, 0.075);
        }

        .selected-creator-model-badge {
          flex-shrink: 0;
          padding: 7px 9px;
          border-radius: 999px;
          color: #a8d4f2;
          background: rgba(55, 133, 194, 0.15);
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 1.2px;
        }

        .selected-creator-model-meta {
          color: #5f7c93;
          font-size: 8px;
        }

        .drop-zone.has-creator-model {
          border-color: rgba(73, 151, 210, 0.2);
          background: rgba(35, 101, 153, 0.05);
        }

        @media (max-width: 700px) {
          .selected-creator-model-card {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .selected-ai-model-card {
            grid-template-columns: 1fr;
          }

          .selected-ai-model-thumbnail {
            width: 100%;
            height: 120px;
          }

          .selected-ai-model-remove {
            width: 100%;
          }
        }
      `}</style>

    <section
      className="upload-section"
      id="upload"
    >
      <div className="upload-heading">
        <div className="section-kicker">
          START YOUR PROJECT
        </div>

        <h2>
          Upload your idea.
          <span> We’ll make it real.</span>
        </h2>

        <p>
          Send us your model and project
          requirements. We'll review the
          print and prepare your quotation.
        </p>
      </div>

      <div className="upload-layout">
        <div className="upload-visual">
          <div className="upload-visual-glow" />

          <div className="upload-icon">
            ↑
          </div>

          <h3>
            Built for makers.
          </h3>

          <p>
            STL, 3MF, OBJ, STEP and
            reference files supported.
          </p>

          <div className="upload-benefits">
            <span>
              ✓ Secure upload
            </span>

            <span>
              ✓ Human review
            </span>

            <span>
              ✓ Clear quotation
            </span>
          </div>
        </div>

        <form
          className="project-form"
          onSubmit={handleSubmit}
        >
          <div className="form-grid">
            <label>
              <span>Name</span>

              <input
                name="name"
                type="text"
                placeholder="Your name"
                required
              />
            </label>

            <label>
              <span>Email</span>

              <input
                name="email"
                type="email"
                placeholder="you@email.com"
                required
              />
            </label>

            <label>
              <span>Phone</span>

              <input
                name="phone"
                type="tel"
                placeholder="Phone number"
              />
            </label>

            <label>
              <span>Project type</span>

              <select
                name="project_type"
                defaultValue="Print ready"
              >
                <option value="Print ready">
                  Print ready
                </option>

                <option value="Custom design">
                  Custom design
                </option>

                <option value="Business / bulk order">
                  Business / bulk order
                </option>
              </select>
            </label>

            <label>
              <span>Material</span>

              <select
                name="material"
                defaultValue="PLA"
              >
                <option value="PLA">
                  PLA
                </option>

                <option value="PETG">
                  PETG
                </option>

                <option value="TPU">
                  TPU
                </option>

                <option value="Not sure">
                  Not sure
                </option>
              </select>
            </label>

            <label>
              <span>Color</span>

              <input
                name="color"
                type="text"
                placeholder="Black, white..."
              />
            </label>

            <label>
              <span>Quantity</span>

              <input
                name="quantity"
                type="number"
                min="1"
                defaultValue="1"
                required
              />
            </label>

            <label>
              <span>Needed by</span>

              <input
                name="needed_by"
                type="date"
              />
            </label>
          </div>

          <label className="full-field">
            <span>
              Tell us about your project
            </span>

            <textarea
              name="description"
              rows="5"
              placeholder="What would you like us to print?"
              required
            />
          </label>

          {selectedAiModel && (
            <div className="selected-ai-model-card">
              <div className="selected-ai-model-main">
                <div className="selected-ai-model-badge">
                  AI MODEL
                </div>

                <div className="selected-ai-model-copy">
                  <strong>
                    {selectedAiModel.prompt ||
                      "AI-generated 3D model"}
                  </strong>

                  <span>
                    Meshy task{" "}
                    {selectedAiModel.meshyTaskId
                      ? selectedAiModel.meshyTaskId.slice(
                          0,
                          8
                        )
                      : "—"}
                  </span>
                </div>
              </div>

              {selectedAiModel.thumbnailUrl && (
                <img
                  src={
                    selectedAiModel.thumbnailUrl
                  }
                  alt=""
                  className="selected-ai-model-thumbnail"
                />
              )}

              <button
                type="button"
                className="selected-ai-model-remove"
                onClick={
                  removeSelectedAiModel
                }
              >
                Remove
              </button>
            </div>
          )}

          {selectedCreatorModel && (
            <div className="selected-creator-model-card">
              <div className="selected-ai-model-main">
                <div className="selected-creator-model-badge">
                  CREATOR MODEL
                </div>

                <div className="selected-ai-model-copy">
                  <strong>
                    {
                      selectedCreatorModel.name
                    }
                  </strong>

                  <span className="selected-creator-model-meta">
                    {
                      selectedCreatorModel.format
                    } · {
                      selectedCreatorModel.objectCount
                    } solid object{
                      selectedCreatorModel.objectCount ===
                      1
                        ? ""
                        : "s"
                    }
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="selected-ai-model-remove"
                onClick={
                  removeSelectedCreatorModel
                }
              >
                Remove
              </button>
            </div>
          )}

          <div
            className={`drop-zone ${
              file ? "has-file" : ""
            } ${
              selectedAiModel
                ? "has-ai-model"
                : ""
            } ${
              selectedCreatorModel
                ? "has-creator-model"
                : ""
            }`}
            onDragOver={(event) =>
              event.preventDefault()
            }
            onDrop={handleDrop}
          >
            <input
              id="model-upload"
              type="file"
              onChange={handleFileChange}
              hidden
            />

            <label
              htmlFor="model-upload"
              className="drop-zone-content"
            >
              <div className="drop-icon">
                +
              </div>

              {selectedCreatorModel ? (
                <>
                  <strong>
                    BEYOND Creator model attached
                  </strong>

                  <span>
                    {
                      selectedCreatorModel.name
                    }
                  </span>

                  <small>
                    Uploading another file here will replace it
                  </small>
                </>
              ) : selectedAiModel ? (
                <>
                  <strong>
                    AI model attached
                  </strong>

                  <span>
                    Uploading a file here will replace it
                  </span>

                  <small>
                    You can still choose your own model instead
                  </small>
                </>
              ) : file ? (
                <>
                  <strong>
                    {file.name}
                  </strong>

                  <span>
                    {(
                      file.size /
                      1024 /
                      1024
                    ).toFixed(2)}
                    {" MB"}
                  </span>
                </>
              ) : (
                <>
                  <strong>
                    Drop your model here
                  </strong>

                  <span>
                    or click to browse
                  </span>

                  <small>
                    Maximum 50 MB
                  </small>
                </>
              )}
            </label>
          </div>

          <button
            type="submit"
            className="submit-project-button"
            disabled={submitting}
          >
            {submitting
              ? "Submitting..."
              : "Submit Project →"}
          </button>

          {status && (
            <div className="form-status">
              {status}
            </div>
          )}
        </form>
      </div>
    </section>
    </>
  );
}

export default UploadProject;