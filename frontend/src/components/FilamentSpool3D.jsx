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
  Float,
} from "@react-three/drei";

import * as THREE from "three";

import "./FilamentSpool3D.css";

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
  const colors = new Uint8Array([
    25, 25, 35, 255,
    65, 90, 145, 255,
    85, 150, 240, 255,
    215, 235, 255, 255,
  ]);

  const texture =
    new THREE.DataTexture(
      colors,
      4,
      1,
      THREE.RGBAFormat
    );

  texture.minFilter =
    THREE.NearestFilter;

  texture.magFilter =
    THREE.NearestFilter;

  texture.generateMipmaps =
    false;

  texture.needsUpdate =
    true;

  return texture;
}

function ComicCylinder({
  args,
  position,
  rotation,
  material,
  outlineScale = 1.025,
  castShadow = false,
}) {
  return (
    <group
      position={position}
      rotation={rotation}
    >
      <mesh
        scale={[
          outlineScale,
          outlineScale,
          outlineScale,
        ]}
      >
        <cylinderGeometry
          args={args}
        />

        <meshBasicMaterial
          color="#020307"
          side={
            THREE.BackSide
          }
        />
      </mesh>

      <mesh
        castShadow={
          castShadow
        }
        material={
          material
        }
      >
        <cylinderGeometry
          args={args}
        />
      </mesh>
    </group>
  );
}

function ComicTorus({
  radius,
  tube,
  position,
  material,
}) {
  return (
    <group
      position={position}
    >
      <mesh
        scale={[
          1.025,
          1.025,
          1.025,
        ]}
      >
        <torusGeometry
          args={[
            radius,
            tube + 0.012,
            10,
            96,
          ]}
        />

        <meshBasicMaterial
          color="#030409"
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
        <torusGeometry
          args={[
            radius,
            tube,
            10,
            96,
          ]}
        />
      </mesh>
    </group>
  );
}

function FilamentStrand({
  material,
}) {
  const geometry =
    useMemo(() => {
      const curve =
        new THREE.CatmullRomCurve3(
          [
            new THREE.Vector3(
              1.46,
              -0.12,
              0.08
            ),

            new THREE.Vector3(
              1.72,
              -0.55,
              0.08
            ),

            new THREE.Vector3(
              1.66,
              -1.05,
              0.05
            ),

            new THREE.Vector3(
              1.5,
              -1.62,
              0.03
            ),

            new THREE.Vector3(
              1.32,
              -2.22,
              0
            ),

            new THREE.Vector3(
              1.18,
              -2.95,
              0
            ),

            new THREE.Vector3(
              1.12,
              -3.45,
              0
            ),
          ]
        );

      return new THREE
        .TubeGeometry(
          curve,
          110,
          0.038,
          10,
          false
        );
    }, []);

  return (
    <group>
      <mesh
        geometry={
          geometry
        }
        scale={[
          1.08,
          1.02,
          1.08,
        ]}
      >
        <meshBasicMaterial
          color="#020309"
          side={
            THREE.BackSide
          }
        />
      </mesh>

      <mesh
        geometry={
          geometry
        }
        material={
          material
        }
      />
    </group>
  );
}

function SpoolModel({
  scrollProgress,
}) {
  const groupRef =
    useRef(null);

  const rotatingRef =
    useRef(null);

  const filamentGroupRef =
    useRef(null);

  const strandRef =
    useRef(null);

  const gradientMap =
    useMemo(
      () =>
        createToonGradient(),
      []
    );

  const blueToonMaterial =
    useMemo(
      () =>
        new THREE.MeshToonMaterial({
          color:
            new THREE.Color(
              "#276dff"
            ),

          emissive:
            new THREE.Color(
              "#061b51"
            ),

          emissiveIntensity:
            0.7,

          gradientMap,
        }),
      [gradientMap]
    );

  const darkToonMaterial =
    useMemo(
      () =>
        new THREE.MeshToonMaterial({
          color:
            new THREE.Color(
              "#151d2b"
            ),

          emissive:
            new THREE.Color(
              "#02040a"
            ),

          emissiveIntensity:
            0.25,

          gradientMap,
        }),
      [gradientMap]
    );

  const deepMaterial =
    useMemo(
      () =>
        new THREE.MeshToonMaterial({
          color:
            new THREE.Color(
              "#050811"
            ),

          gradientMap,
        }),
      [gradientMap]
    );

  const magentaMaterial =
    useMemo(
      () =>
        new THREE.MeshBasicMaterial({
          color:
            "#ff397c",

          transparent:
            true,

          opacity:
            0.22,
        }),
      []
    );

  useFrame(
    (state) => {
      if (
        !groupRef.current ||
        !rotatingRef.current ||
        !filamentGroupRef.current
      ) {
        return;
      }

      const pointerX =
        state.pointer.x;

      const pointerY =
        state.pointer.y;

      groupRef.current.rotation.y =
        THREE.MathUtils.lerp(
          groupRef.current
            .rotation.y,

          pointerX * 0.22,

          0.045
        );

      groupRef.current.rotation.x =
        THREE.MathUtils.lerp(
          groupRef.current
            .rotation.x,

          -pointerY * 0.13 +
            0.04,

          0.045
        );

      /*
        Slight comic-book snap
        instead of completely
        smooth rotation.
      */

      const rawRotation =
        scrollProgress *
        Math.PI *
        10;

      const steppedRotation =
        Math.round(
          rawRotation * 10
        ) / 10;

      rotatingRef.current.rotation.z =
        THREE.MathUtils.lerp(
          rotatingRef.current
            .rotation.z,

          steppedRotation,

          0.09
        );

      /*
        Filament consumption
      */

      const consumption =
        clamp(
          scrollProgress *
            1.15
        );

      const targetScale =
        1 -
        consumption *
          0.27;

      filamentGroupRef.current.scale.x =
        THREE.MathUtils.lerp(
          filamentGroupRef.current
            .scale.x,

          targetScale,

          0.055
        );

      filamentGroupRef.current.scale.y =
        THREE.MathUtils.lerp(
          filamentGroupRef.current
            .scale.y,

          targetScale,

          0.055
        );

      rotatingRef.current.position.y =
        Math.sin(
          state.clock.elapsedTime *
            0.9
        ) *
        0.02;

      /*
        Filament feed
      */

      if (
        strandRef.current
      ) {
        const strandProgress =
          clamp(
            scrollProgress *
              4
          );

        strandRef.current.scale.y =
          THREE.MathUtils.lerp(
            strandRef.current
              .scale.y,

            0.15 +
              strandProgress *
                0.85,

            0.065
          );
      }
    }
  );

  return (
    <group
      ref={groupRef}
      rotation={[
        0.03,
        -0.1,
        0,
      ]}
    >
      {/* COMIC SHADOW OFFSET */}

      <mesh
        position={[
          0.17,
          -0.08,
          -0.7,
        ]}
        material={
          magentaMaterial
        }
      >
        <circleGeometry
          args={[
            2.08,
            96,
          ]}
        />
      </mesh>

      <group
        ref={rotatingRef}
      >
        {/* BACK DISC */}

        <ComicCylinder
          args={[
            2.05,
            2.05,
            0.16,
            96,
          ]}
          position={[
            0,
            0,
            -0.48,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          material={
            deepMaterial
          }
          outlineScale={
            1.02
          }
        />

        {/* FILAMENT */}

        <group
          ref={
            filamentGroupRef
          }
        >
          <ComicCylinder
            args={[
              1.68,
              1.68,
              0.84,
              96,
            ]}
            rotation={[
              Math.PI / 2,
              0,
              0,
            ]}
            material={
              blueToonMaterial
            }
            outlineScale={
              1.012
            }
          />

          {[
            {
              radius: 1.2,
              z: -0.36,
            },
            {
              radius: 1.26,
              z: -0.28,
            },
            {
              radius: 1.32,
              z: -0.2,
            },
            {
              radius: 1.38,
              z: -0.12,
            },
            {
              radius: 1.44,
              z: -0.04,
            },
            {
              radius: 1.5,
              z: 0.04,
            },
            {
              radius: 1.56,
              z: 0.12,
            },
            {
              radius: 1.61,
              z: 0.2,
            },
            {
              radius: 1.65,
              z: 0.28,
            },
            {
              radius: 1.68,
              z: 0.35,
            },
          ].map(
            (
              ring,
              index
            ) => (
              <ComicTorus
                key={
                  index
                }
                radius={
                  ring.radius
                }
                tube={
                  0.025
                }
                position={[
                  0,
                  0,
                  ring.z,
                ]}
                material={
                  blueToonMaterial
                }
              />
            )
          )}
        </group>

        {/* FRONT DISC */}

        <ComicCylinder
          args={[
            2.08,
            2.08,
            0.18,
            96,
          ]}
          position={[
            0,
            0,
            0.49,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          material={
            darkToonMaterial
          }
          outlineScale={
            1.025
          }
          castShadow
        />

        {/* INNER RECESS */}

        <ComicCylinder
          args={[
            1.15,
            1.15,
            0.08,
            72,
          ]}
          position={[
            0,
            0,
            0.6,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          material={
            deepMaterial
          }
          outlineScale={
            1.01
          }
        />

        {/* HUB */}

        <ComicCylinder
          args={[
            0.68,
            0.68,
            0.27,
            72,
          ]}
          position={[
            0,
            0,
            0.69,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          material={
            darkToonMaterial
          }
          outlineScale={
            1.035
          }
        />

        <ComicCylinder
          args={[
            0.4,
            0.4,
            0.05,
            64,
          ]}
          position={[
            0,
            0,
            0.84,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          material={
            blueToonMaterial
          }
          outlineScale={
            1.04
          }
        />

        {/* FRONT CUTOUTS */}

        {[
          0,
          Math.PI / 2,
          Math.PI,
          Math.PI *
            1.5,
        ].map(
          (
            angle,
            index
          ) => {
            const radius =
              1.48;

            return (
              <group
                key={
                  index
                }
                position={[
                  Math.cos(
                    angle
                  ) *
                    radius,

                  Math.sin(
                    angle
                  ) *
                    radius,

                  0.6,
                ]}
                scale={[
                  0.48,
                  0.76,
                  0.08,
                ]}
              >
                <mesh
                  scale={[
                    1.07,
                    1.07,
                    1.07,
                  ]}
                >
                  <sphereGeometry
                    args={[
                      0.55,
                      32,
                      32,
                    ]}
                  />

                  <meshBasicMaterial
                    color="#010207"
                  />
                </mesh>

                <mesh>
                  <sphereGeometry
                    args={[
                      0.55,
                      32,
                      32,
                    ]}
                  />

                  <meshToonMaterial
                    color="#060b14"
                    gradientMap={
                      gradientMap
                    }
                  />
                </mesh>
              </group>
            );
          }
        )}

        {/* BOLTS */}

        {[
          0,
          Math.PI / 2,
          Math.PI,
          Math.PI *
            1.5,
        ].map(
          (
            angle,
            index
          ) => (
            <mesh
              key={
                index
              }
              position={[
                Math.cos(
                  angle
                ) *
                  1.9,

                Math.sin(
                  angle
                ) *
                  1.9,

                0.61,
              ]}
            >
              <sphereGeometry
                args={[
                  0.048,
                  16,
                  16,
                ]}
              />

              <meshToonMaterial
                color="#b0c4de"
                gradientMap={
                  gradientMap
                }
              />
            </mesh>
          )
        )}
      </group>

      {/* FILAMENT EXIT */}

      <group
        ref={
          strandRef
        }
        scale={[
          1,
          0.2,
          1,
        ]}
      >
        <FilamentStrand
          material={
            blueToonMaterial
          }
        />
      </group>

      {/* COMIC LIGHTS */}

      <pointLight
        position={[
          2.6,
          2,
          2,
        ]}
        color="#40a2ff"
        intensity={7}
        distance={7}
      />

      <pointLight
        position={[
          -3,
          -1,
          1,
        ]}
        color="#ff347c"
        intensity={3.2}
        distance={7}
      />
    </group>
  );
}

function SpoolScene({
  scrollProgress,
}) {
  return (
    <>
      <color
        attach="background"
        args={[
          "#02050a",
        ]}
      />

      <ambientLight
        intensity={1.2}
      />

      <directionalLight
        position={[
          4,
          6,
          6,
        ]}
        intensity={5}
        color="#d8e9ff"
      />

      <directionalLight
        position={[
          -5,
          2,
          3,
        ]}
        intensity={2.8}
        color="#4088ff"
      />

      <directionalLight
        position={[
          3,
          -4,
          3,
        ]}
        intensity={2}
        color="#ff3a82"
      />

      <Float
        speed={1.25}
        rotationIntensity={
          0.045
        }
        floatIntensity={
          0.11
        }
      >
        <SpoolModel
          scrollProgress={
            scrollProgress
          }
        />
      </Float>

      <ContactShadows
        position={[
          0,
          -2.55,
          0,
        ]}
        opacity={0.65}
        scale={7}
        blur={1.5}
        far={5}
      />
    </>
  );
}

function FilamentSpool3D({
  scrollProgress = 0,
}) {
  const consumed =
    Math.round(
      clamp(
        scrollProgress
      ) *
        100
    );

  const remaining =
    100 -
    Math.round(
      clamp(
        scrollProgress
      ) *
        27
    );

  return (
    <div className="spool-webgl-wrapper">
      <div className="comic-halftone comic-halftone-one" />

      <div className="comic-halftone comic-halftone-two" />

      <div className="comic-speed-line speed-line-one" />

      <div className="comic-speed-line speed-line-two" />

      <div className="comic-speed-line speed-line-three" />

      <div className="spool-webgl-glow spool-webgl-glow-one" />

      <div className="spool-webgl-glow spool-webgl-glow-two" />

      <div className="spool-webgl-ring spool-webgl-ring-one" />

      <div className="spool-webgl-ring spool-webgl-ring-two" />

      <Canvas
        className="spool-webgl-canvas"
        camera={{
          position: [
            0,
            0,
            7.3,
          ],

          fov: 42,

          near: 0.1,

          far: 100,
        }}
        dpr={[
          1,
          1.7,
        ]}
        gl={{
          antialias: true,

          alpha: true,

          powerPreference:
            "high-performance",
        }}
      >
        <Suspense
          fallback={
            null
          }
        >
          <SpoolScene
            scrollProgress={
              scrollProgress
            }
          />
        </Suspense>
      </Canvas>

      <div className="comic-caption">
        <span>
          MATERIAL FEED
        </span>

        <strong>
          WHRRR—
        </strong>
      </div>

      <div className="spool-webgl-label spool-label-left">
        <span>
          MATERIAL
        </span>

        <strong>
          PLA+
        </strong>
      </div>

      <div className="spool-webgl-label spool-label-right">
        <span>
          FEED
        </span>

        <strong>
          ACTIVE
        </strong>

        <i />
      </div>

      <div className="spool-consumption-panel">
        <div>
          <span>
            SPOOL
          </span>

          <strong>
            {remaining}%
          </strong>
        </div>

        <div className="spool-consumption-track">
          <span
            style={{
              width:
                `${remaining}%`,
            }}
          />
        </div>

        <small>
          {consumed}%
          journey complete
        </small>
      </div>

      <div className="spool-webgl-bottom-label">
        <span>
          INTERACTIVE MATERIAL SYSTEM
        </span>

        <div>
          MOVE CURSOR
          <strong>
            +
          </strong>
          SCROLL
        </div>
      </div>
    </div>
  );
}

export default FilamentSpool3D;