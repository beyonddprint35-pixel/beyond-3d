import { useState } from "react";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function UploadProject() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
      setStatus("Supabase configuration is missing.");
      setSubmitting(false);
      return;
    }

    const orderId = crypto.randomUUID();

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
                `Bearer ${publishableKey}`,

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

          <div
            className={`drop-zone ${
              file ? "has-file" : ""
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

              {file ? (
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
  );
}

export default UploadProject;