import {
  Suspense,
  useMemo,
  useRef,
} from "react";

import {
  Canvas,
  useFrame,
} from "@react-three/fiber";

import {
  ContactShadows,
} from "@react-three/drei";

import * as THREE from "three";

import "./PrintedObject3D.css";

function clamp(
  value,
  min = 0,
  max = 1
) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function createToonGradient() {
  const data =
    new Uint8Array([
      20, 25, 35, 255,
      50, 82, 145, 255,
      62, 139, 245, 255,
      220, 239, 255, 255,
    ]);

  const texture =
    new THREE.DataTexture(
      data,
      4,
      1,
      THREE.RGBAFormat
    );

  texture.minFilter =
    THREE.NearestFilter;

  texture.magFilter =
    THREE.NearestFilter;

  texture.needsUpdate =
    true;

  return texture;
}

function BLayer({
  index,
  count,
  material,
  gradientMap,
}) {
  const yNormalized =
    index /
      (count - 1) *
      2 -
    1;

  const y =
    yNormalized *
    1.05;

  const nearBoundary =
    Math.abs(
      yNormalized
    ) > 0.84;

  const nearMiddle =
    Math.abs(
      yNormalized
    ) < 0.12;

  const rightExtent =
    yNormalized >= 0
      ? 0.56 +
        Math.sin(
          (1 -
            Math.abs(
              yNormalized
            )) *
            Math.PI
        ) *
          0.18
      : 0.61 +
        Math.sin(
          (1 -
            Math.abs(
              yNormalized
            )) *
            Math.PI
        ) *
          0.2;

  const fullLayer =
    nearBoundary ||
    nearMiddle;

  return (
    <group
      position={[
        0,
        y,
        0,
      ]}
    >
      {/* LEFT SPINE */}

      <group
        position={[
          -0.49,
          0,
          0,
        ]}
      >
        <mesh
          scale={[
            1.08,
            1.16,
            1.13,
          ]}
        >
          <boxGeometry
            args={[
              0.3,
              0.075,
              0.5,
            ]}
          />

          <meshBasicMaterial
            color="#020309"
            side={
              THREE.BackSide
            }
          />
        </mesh>

        <mesh
          material={
            material
          }
        >
          <boxGeometry
            args={[
              0.3,
              0.075,
              0.5,
            ]}
          />
        </mesh>
      </group>

      {fullLayer ? (
        <group
          position={[
            0.04,
            0,
            0,
          ]}
        >
          <mesh
            scale={[
              1.04,
              1.16,
              1.13,
            ]}
          >
            <boxGeometry
              args={[
                1.25,
                0.075,
                0.5,
              ]}
            />

            <meshBasicMaterial
              color="#020309"
              side={
                THREE.BackSide
              }
            />
          </mesh>

          <mesh
            material={
              material
            }
          >
            <boxGeometry
              args={[
                1.25,
                0.075,
                0.5,
              ]}
            />
          </mesh>
        </group>
      ) : (
        <group
          position={[
            rightExtent -
              0.12,
            0,
            0,
          ]}
        >
          <mesh
            scale={[
              1.11,
              1.16,
              1.13,
            ]}
          >
            <boxGeometry
              args={[
                0.24,
                0.075,
                0.5,
              ]}
            />

            <meshBasicMaterial
              color="#020309"
              side={
                THREE.BackSide
              }
            />
          </mesh>

          <mesh
            material={
              material
            }
          >
            <boxGeometry
              args={[
                0.24,
                0.075,
                0.5,
              ]}
            />
          </mesh>
        </group>
      )}

      {/* print-line highlight */}

      <mesh
        position={[
          0,
          0.043,
          0.27,
        ]}
      >
        <boxGeometry
          args={[
            1.45,
            0.008,
            0.012,
          ]}
        />

        <meshBasicMaterial
          color={
            index %
              4 ===
            0
              ? "#ff3e82"
              : "#8fc8ff"
          }
          transparent
          opacity={0.25}
        />
      </mesh>
    </group>
  );
}

function PrintedB({
  buildProgress,
}) {
  const groupRef =
    useRef(null);

  const layerRefs =
    useRef([]);

  const gradientMap =
    useMemo(
      () =>
        createToonGradient(),
      []
    );

  const material =
    useMemo(
      () =>
        new THREE.MeshToonMaterial({
          color:
            "#2778ff",

          emissive:
            new THREE.Color(
              "#071e56"
            ),

          emissiveIntensity:
            0.6,

          gradientMap,
        }),
      [gradientMap]
    );

  const layerCount =
    30;

  useFrame(
    (state) => {
      if (
        groupRef.current
      ) {
        groupRef.current.rotation.y =
          Math.sin(
            state.clock
              .elapsedTime *
              0.45
          ) *
          0.12 -
          0.15;
      }

      layerRefs.current
        .forEach(
          (
            layer,
            index
          ) => {
            if (!layer) {
              return;
            }

            const threshold =
              index /
              layerCount;

            const local =
              clamp(
                (
                  buildProgress -
                  threshold
                ) *
                  layerCount *
                  1.5
              );

            const scale =
              THREE.MathUtils
                .lerp(
                  layer.scale.x,
                  local,
                  0.13
                );

            layer.scale.set(
              scale,
              scale,
              scale
            );
          }
        );
    }
  );

  return (
    <group
      ref={groupRef}
      position={[
        0,
        -0.15,
        0,
      ]}
    >
      {Array.from({
        length:
          layerCount,
      }).map(
        (
          _,
          index
        ) => (
          <group
            ref={(element) => {
              layerRefs.current[
                index
              ] =
                element;
            }}
            key={
              index
            }
            scale={[
              0,
              0,
              0,
            ]}
          >
            <BLayer
              index={
                index
              }
              count={
                layerCount
              }
              material={
                material
              }
              gradientMap={
                gradientMap
              }
            />
          </group>
        )
      )}

      <pointLight
        position={[
          1.5,
          1,
          2,
        ]}
        intensity={5}
        color="#3d91ff"
      />

      <pointLight
        position={[
          -1.4,
          -0.5,
          1.5,
        ]}
        intensity={2.6}
        color="#ff3b80"
      />
    </group>
  );
}

function PrinterHead({
  buildProgress,
}) {
  const groupRef =
    useRef(null);

  useFrame(
    (state) => {
      if (
        !groupRef.current
      ) {
        return;
      }

      const time =
        state.clock
          .elapsedTime;

      groupRef.current.position.x =
        Math.sin(
          time * 4.4
        ) *
        0.78;

      groupRef.current.position.y =
        THREE.MathUtils.lerp(
          1.45,
          -0.78,
          buildProgress
        );
    }
  );

  return (
    <group
      ref={groupRef}
      position={[
        0,
        1.4,
        0.1,
      ]}
    >
      <mesh
        scale={[
          1.07,
          1.07,
          1.07,
        ]}
      >
        <boxGeometry
          args={[
            0.62,
            0.25,
            0.4,
          ]}
        />

        <meshBasicMaterial
          color="#020309"
          side={
            THREE.BackSide
          }
        />
      </mesh>

      <mesh>
        <boxGeometry
          args={[
            0.62,
            0.25,
            0.4,
          ]}
        />

        <meshToonMaterial
          color="#6e7e94"
        />
      </mesh>

      <mesh
        position={[
          0,
          -0.2,
          0,
        ]}
      >
        <coneGeometry
          args={[
            0.11,
            0.32,
            12,
          ]}
        />

        <meshToonMaterial
          color="#d5a44e"
        />
      </mesh>

      <pointLight
        position={[
          0,
          -0.35,
          0.45,
        ]}
        intensity={4}
        distance={2}
        color="#4ca0ff"
      />
    </group>
  );
}

function PrintedScene({
  scrollProgress,
}) {
  const buildProgress =
    clamp(
      (
        scrollProgress -
        0.55
      ) /
        0.3
    );

  return (
    <>
      <color
        attach="background"
        args={[
          "#02050a",
        ]}
      />

      <ambientLight
        intensity={1.15}
      />

      <directionalLight
        position={[
          4,
          6,
          5,
        ]}
        intensity={4}
        color="#dceaff"
      />

      <directionalLight
        position={[
          -4,
          0,
          4,
        ]}
        intensity={2.5}
        color="#2878ff"
      />

      <PrintedB
        buildProgress={
          buildProgress
        }
      />

      <PrinterHead
        buildProgress={
          buildProgress
        }
      />

      <mesh
        position={[
          0,
          -1.25,
          0,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <planeGeometry
          args={[
            4.5,
            3.3,
          ]}
        />

        <meshStandardMaterial
          color="#07101b"
          roughness={0.8}
        />
      </mesh>

      <gridHelper
        args={[
          4.5,
          18,
          "#234b83",
          "#10233d",
        ]}
        position={[
          0,
          -1.24,
          0,
        ]}
      />

      <ContactShadows
        position={[
          0,
          -1.22,
          0,
        ]}
        opacity={0.65}
        scale={5}
        blur={1.6}
      />
    </>
  );
}

function PrintedObject3D({
  scrollProgress = 0,
}) {
  const buildProgress =
    clamp(
      (
        scrollProgress -
        0.55
      ) /
        0.3
    );

  const percent =
    Math.round(
      buildProgress *
        100
    );

  return (
    <div className="printed-object-wrapper">
      <div className="printed-halftone printed-halftone-one" />

      <div className="printed-halftone printed-halftone-two" />

      <div className="printed-comic-word">
        PRINT!
      </div>

      <Canvas
        camera={{
          position: [
            0,
            0.25,
            5,
          ],

          fov: 40,
        }}
        dpr={[
          1,
          1.7,
        ]}
        className="printed-object-canvas"
      >
        <Suspense
          fallback={
            null
          }
        >
          <PrintedScene
            scrollProgress={
              scrollProgress
            }
          />
        </Suspense>
      </Canvas>

      <div className="printed-progress">
        <div>
          <span>
            OBJECT BUILD
          </span>

          <strong>
            {percent}%
          </strong>
        </div>

        <div className="printed-progress-track">
          <span
            style={{
              width:
                `${percent}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default PrintedObject3D;