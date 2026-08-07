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
    Math.max(
      value,
      min
    ),
    max
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

  const filamentMaterial =
    useMemo(
      () =>
        new THREE.MeshPhysicalMaterial({
          color:
            new THREE.Color(
              "#2878ff"
            ),

          metalness: 0.08,

          roughness: 0.28,

          clearcoat: 0.95,

          clearcoatRoughness:
            0.13,

          emissive:
            new THREE.Color(
              "#062159"
            ),

          emissiveIntensity:
            0.85,
        }),
      []
    );

  const darkPlastic =
    useMemo(
      () =>
        new THREE.MeshPhysicalMaterial({
          color:
            new THREE.Color(
              "#111925"
            ),

          roughness: 0.29,

          metalness: 0.32,

          clearcoat: 0.7,

          clearcoatRoughness:
            0.2,
        }),
      []
    );

  const sidePlastic =
    useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          color:
            new THREE.Color(
              "#05090f"
            ),

          roughness: 0.42,

          metalness: 0.25,
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

      /*
        =========================
        MOUSE PARALLAX
        =========================
      */

      const pointerX =
        state.pointer.x;

      const pointerY =
        state.pointer.y;

      groupRef.current.rotation.y =
        THREE.MathUtils.lerp(
          groupRef.current
            .rotation.y,

          pointerX * 0.19,

          0.04
        );

      groupRef.current.rotation.x =
        THREE.MathUtils.lerp(
          groupRef.current
            .rotation.x,

          -pointerY * 0.1 +
            0.035,

          0.04
        );

      /*
        =========================
        SCROLL ROTATION
        =========================
      */

      const targetRotation =
        scrollProgress *
        Math.PI *
        10;

      rotatingRef.current.rotation.z =
        THREE.MathUtils.lerp(
          rotatingRef.current
            .rotation.z,

          targetRotation,

          0.08
        );

      /*
        =========================
        FILAMENT CONSUMPTION

        0% scroll:
        full spool

        100% scroll:
        visibly reduced spool
        =========================
      */

      const consumption =
        clamp(
          scrollProgress *
            1.15
        );

      const targetScale =
        1 -
        consumption *
          0.24;

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

      /*
        Make the filament roll
        move very slightly while
        feeding.
      */

      rotatingRef.current.position.y =
        Math.sin(
          state.clock.elapsedTime *
            0.8
        ) *
        0.018;

      /*
        =========================
        STRAND FEED

        As the user scrolls,
        more filament visually
        leaves the spool.
        =========================
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

            0.18 +
              strandProgress *
                0.82,

            0.06
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
      <group
        ref={rotatingRef}
      >
        {/* =====================
            BACK FLANGE
        ====================== */}

        <mesh
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
          castShadow
          receiveShadow
          material={
            sidePlastic
          }
        >
          <cylinderGeometry
            args={[
              2.05,
              2.05,
              0.16,
              96,
            ]}
          />
        </mesh>

        {/* =====================
            FILAMENT MATERIAL
        ====================== */}

        <group
          ref={
            filamentGroupRef
          }
        >
          <mesh
            rotation={[
              Math.PI / 2,
              0,
              0,
            ]}
            castShadow
            material={
              filamentMaterial
            }
          >
            <cylinderGeometry
              args={[
                1.68,
                1.68,
                0.84,
                128,
              ]}
            />
          </mesh>

          {[
            {
              radius: 1.18,
              z: -0.38,
            },
            {
              radius: 1.24,
              z: -0.3,
            },
            {
              radius: 1.3,
              z: -0.22,
            },
            {
              radius: 1.36,
              z: -0.14,
            },
            {
              radius: 1.42,
              z: -0.06,
            },
            {
              radius: 1.48,
              z: 0.02,
            },
            {
              radius: 1.54,
              z: 0.1,
            },
            {
              radius: 1.6,
              z: 0.18,
            },
            {
              radius: 1.65,
              z: 0.26,
            },
            {
              radius: 1.68,
              z: 0.34,
            },
          ].map(
            (
              ring,
              index
            ) => (
              <mesh
                key={
                  `${ring.radius}-${index}`
                }
                position={[
                  0,
                  0,
                  ring.z,
                ]}
                material={
                  filamentMaterial
                }
              >
                <torusGeometry
                  args={[
                    ring.radius,
                    0.028,
                    10,
                    128,
                  ]}
                />
              </mesh>
            )
          )}

          {/* highlight ring */}

          <mesh
            position={[
              0,
              0,
              0.37,
            ]}
            material={
              filamentMaterial
            }
          >
            <torusGeometry
              args={[
                1.63,
                0.045,
                12,
                128,
              ]}
            />
          </mesh>
        </group>

        {/* =====================
            FRONT FLANGE
        ====================== */}

        <mesh
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
          castShadow
          receiveShadow
          material={
            darkPlastic
          }
        >
          <cylinderGeometry
            args={[
              2.08,
              2.08,
              0.18,
              128,
            ]}
          />
        </mesh>

        {/* =====================
            FRONT RECESS
        ====================== */}

        <mesh
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
            sidePlastic
          }
        >
          <cylinderGeometry
            args={[
              1.15,
              1.15,
              0.08,
              96,
            ]}
          />
        </mesh>

        {/* =====================
            HUB
        ====================== */}

        <mesh
          position={[
            0,
            0,
            0.68,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          castShadow
          material={
            darkPlastic
          }
        >
          <cylinderGeometry
            args={[
              0.68,
              0.68,
              0.27,
              96,
            ]}
          />
        </mesh>

        <mesh
          position={[
            0,
            0,
            0.83,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.4,
              0.4,
              0.04,
              64,
            ]}
          />

          <meshStandardMaterial
            color="#172234"
            roughness={0.25}
            metalness={0.4}
          />
        </mesh>

        {/* =====================
            FRONT CUTOUTS
        ====================== */}

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
              <mesh
                key={
                  `cutout-${index}`
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
                <sphereGeometry
                  args={[
                    0.55,
                    48,
                    48,
                  ]}
                />

                <meshStandardMaterial
                  color="#02060b"
                  roughness={
                    0.62
                  }
                />
              </mesh>
            );
          }
        )}

        {/* =====================
            BOLTS
        ====================== */}

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
              1.9;

            return (
              <mesh
                key={
                  `bolt-${index}`
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

                  0.61,
                ]}
              >
                <sphereGeometry
                  args={[
                    0.045,
                    24,
                    24,
                  ]}
                />

                <meshStandardMaterial
                  color="#8492a5"
                  roughness={
                    0.22
                  }
                  metalness={
                    0.85
                  }
                />
              </mesh>
            );
          }
        )}
      </group>

      {/* =====================
          FILAMENT STRAND
      ====================== */}

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
            filamentMaterial
          }
        />
      </group>

      {/* =====================
          INNER BLUE LIGHT
      ====================== */}

      <pointLight
        position={[
          0.3,
          0,
          1.5,
        ]}
        color="#397fff"
        intensity={7}
        distance={6}
        decay={2}
      />
    </group>
  );
}

function FilamentStrand({
  material,
}) {
  const curve =
    useMemo(
      () =>
        new THREE.CatmullRomCurve3(
          [
            new THREE.Vector3(
              1.48,
              -0.15,
              0.08
            ),

            new THREE.Vector3(
              1.72,
              -0.65,
              0.1
            ),

            new THREE.Vector3(
              1.61,
              -1.2,
              0.06
            ),

            new THREE.Vector3(
              1.42,
              -1.85,
              0.03
            ),

            new THREE.Vector3(
              1.25,
              -2.55,
              0
            ),

            new THREE.Vector3(
              1.2,
              -3.3,
              0
            ),
          ]
        ),
      []
    );

  const geometry =
    useMemo(
      () =>
        new THREE.TubeGeometry(
          curve,
          110,
          0.035,
          12,
          false
        ),
      [curve]
    );

  return (
    <mesh
      geometry={
        geometry
      }
      material={
        material
      }
    />
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

      <fog
        attach="fog"
        args={[
          "#02050a",
          8,
          18,
        ]}
      />

      <ambientLight
        intensity={0.65}
      />

      <hemisphereLight
        intensity={1.25}
        color="#c4dcff"
        groundColor="#02040a"
      />

      <directionalLight
        position={[
          5,
          6,
          7,
        ]}
        intensity={4}
        color="#dcecff"
        castShadow
      />

      <directionalLight
        position={[
          -5,
          2,
          4,
        ]}
        intensity={2.5}
        color="#2f7cff"
      />

      <spotLight
        position={[
          0,
          6,
          5,
        ]}
        angle={0.45}
        penumbra={0.8}
        intensity={7}
        color="#ffffff"
        castShadow
      />

      <spotLight
        position={[
          -4,
          -1,
          4,
        ]}
        angle={0.6}
        penumbra={1}
        intensity={5}
        color="#236eff"
      />

      <Float
        speed={1.1}
        rotationIntensity={
          0.04
        }
        floatIntensity={
          0.1
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
        opacity={0.52}
        scale={7}
        blur={2.5}
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
        24
    );

  return (
    <div className="spool-webgl-wrapper">
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
          1.8,
        ]}
        gl={{
          antialias: true,

          alpha: true,

          powerPreference:
            "high-performance",
        }}
        shadows
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