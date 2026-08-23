import {
  useEffect,
  useRef,
  useState,
} from "react";

import ReactCrop, {
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
} from "react-image-crop";

import {
  Check,
  Crop,
  X,
} from "lucide-react";

import "react-image-crop/dist/ReactCrop.css";
import "./LogoCropper.css";


const MODES = [
  {
    id: "square",
    label: "Square",
    aspect: 1,
  },

  {
    id: "rectangle",
    label: "Rectangle",
    aspect: 16 / 9,
  },

  {
    id: "circle",
    label: "Circle",
    aspect: 1,
  },

  {
    id: "free",
    label: "Free",
    aspect: undefined,
  },
];


function createInitialCrop(
  imageWidth,
  imageHeight,
  mode
) {
  const config =
    MODES.find(
      item =>
        item.id === mode
    ) || MODES[0];

  if (
    config.aspect
  ) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 82,
        },
        config.aspect,
        imageWidth,
        imageHeight
      ),
      imageWidth,
      imageHeight
    );
  }

  return {
    unit: "%",
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  };
}


async function makeCroppedLogo({
  image,
  crop,
  shape,
}) {
  if (
    !image ||
    !crop?.width ||
    !crop?.height
  ) {
    throw new Error(
      "Choose a crop area first."
    );
  }

  const pixelCrop =
    convertToPixelCrop(
      crop,
      image.width,
      image.height
    );

  const scaleX =
    image.naturalWidth /
    image.width;

  const scaleY =
    image.naturalHeight /
    image.height;

  const sourceX =
    pixelCrop.x *
    scaleX;

  const sourceY =
    pixelCrop.y *
    scaleY;

  const sourceWidth =
    pixelCrop.width *
    scaleX;

  const sourceHeight =
    pixelCrop.height *
    scaleY;

  /*
    Keep stored logos reasonably small.
    This is important because the draft
    is saved to Supabase automatically.
  */
  const MAX_SIZE = 720;

  const resizeRatio =
    Math.min(
      1,
      MAX_SIZE /
        Math.max(
          sourceWidth,
          sourceHeight
        )
    );

  const outputWidth =
    Math.max(
      1,
      Math.round(
        sourceWidth *
          resizeRatio
      )
    );

  const outputHeight =
    Math.max(
      1,
      Math.round(
        sourceHeight *
          resizeRatio
      )
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    outputWidth;

  canvas.height =
    outputHeight;

  const context =
    canvas.getContext(
      "2d"
    );

  if (!context) {
    throw new Error(
      "Could not prepare the logo crop."
    );
  }

  context.imageSmoothingEnabled =
    true;

  context.imageSmoothingQuality =
    "high";


  /*
    Circle mode creates an actual
    transparent circular output,
    not only a circular CSS preview.
  */
  if (
    shape ===
    "circle"
  ) {
    context.save();

    context.beginPath();

    const radius =
      Math.min(
        outputWidth,
        outputHeight
      ) / 2;

    context.arc(
      outputWidth / 2,
      outputHeight / 2,
      radius,
      0,
      Math.PI * 2
    );

    context.closePath();
    context.clip();
  }


  context.drawImage(
    image,

    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,

    0,
    0,
    outputWidth,
    outputHeight
  );


  if (
    shape ===
    "circle"
  ) {
    context.restore();
  }


  /*
    WEBP keeps the stored draft much
    smaller while preserving transparency.
  */
  return canvas.toDataURL(
    "image/webp",
    0.92
  );
}


export default function LogoCropper({
  imageSource,
  onCancel,
  onApply,
}) {
  const imageRef =
    useRef(null);

  const [
    mode,
    setMode,
  ] =
    useState("square");

  const [
    crop,
    setCrop,
  ] =
    useState();

  const [
    processing,
    setProcessing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");


  const currentMode =
    MODES.find(
      item =>
        item.id === mode
    ) ||
    MODES[0];


  useEffect(() => {
    if (
      !imageRef.current
    ) {
      return;
    }

    setCrop(
      createInitialCrop(
        imageRef.current
          .width,

        imageRef.current
          .height,

        mode
      )
    );
  }, [
    mode,
  ]);


  function handleImageLoad(
    event
  ) {
    imageRef.current =
      event.currentTarget;

    setCrop(
      createInitialCrop(
        event.currentTarget
          .width,

        event.currentTarget
          .height,

        mode
      )
    );
  }


  async function handleApply() {
    setProcessing(true);
    setError("");

    try {
      const dataUrl =
        await makeCroppedLogo({
          image:
            imageRef.current,

          crop,

          shape:
            mode,
        });

      onApply?.(
        dataUrl,
        mode
      );
    } catch (
      cropError
    ) {
      setError(
        cropError?.message ||
        "Could not crop the logo."
      );
    } finally {
      setProcessing(false);
    }
  }


  return (
    <div
      className="logo-cropper-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Crop restaurant logo"
    >
      <div className="logo-cropper-modal">
        <header className="logo-cropper-header">
          <div>
            <span>
              LOGO EDITOR
            </span>

            <h3>
              Crop your logo.
            </h3>

            <p>
              Choose the shape that fits your brand.
            </p>
          </div>

          <button
            type="button"
            className="logo-cropper-close"
            onClick={
              onCancel
            }
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>


        <div className="logo-cropper-shapes">
          {MODES.map(
            option => (
              <button
                key={
                  option.id
                }
                type="button"
                className={
                  mode ===
                  option.id
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setMode(
                    option.id
                  )
                }
              >
                <Crop
                  size={15}
                />

                {
                  option.label
                }
              </button>
            )
          )}
        </div>


        <div className="logo-cropper-stage">
          <ReactCrop
            crop={crop}
            onChange={(
              _pixelCrop,
              percentCrop
            ) =>
              setCrop(
                percentCrop
              )
            }
            aspect={
              currentMode
                .aspect
            }
            circularCrop={
              mode ===
              "circle"
            }
            keepSelection
          >
            <img
              ref={
                imageRef
              }
              src={
                imageSource
              }
              alt="Logo crop"
              onLoad={
                handleImageLoad
              }
            />
          </ReactCrop>
        </div>


        {error && (
          <div className="logo-cropper-error">
            {error}
          </div>
        )}


        <footer className="logo-cropper-footer">
          <button
            type="button"
            className="logo-cropper-cancel"
            onClick={
              onCancel
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className="logo-cropper-apply"
            onClick={
              handleApply
            }
            disabled={
              processing
            }
          >
            <Check
              size={16}
            />

            {processing
              ? "Preparing..."
              : "Use This Crop"}
          </button>
        </footer>
      </div>
    </div>
  );
}
