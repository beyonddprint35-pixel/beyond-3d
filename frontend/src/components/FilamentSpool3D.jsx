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

function SpoolModel({
  scrollProgress,
}) {
  const groupRef =
    useRef();

  const rotatingRef =
    useRef();

  const filamentMaterial =
    useMemo(
      () =>
        new THREE.MeshPhysicalMaterial({
          color:
            new THREE.Color(
              "#2878ff"
            ),

          metalness: 0.08,

          roughness: 0.3,

          clearcoat: 0.8,

          clearcoatRoughness:
            0.18,

          emissive:
            new THREE.Color(
              "#071f52"
            ),

          emissiveIntensity:
            0.75,
        }),
      []
    );

  const darkPlastic =
    useMemo(
      () =>
        new THREE.MeshPhysicalMaterial({
          color:
            new THREE.Color(
              "#101722"
            ),

          roughness: 0.3,

          metalness: 0.32,

          clearcoat: 0.65,

          clearcoatRoughness:
            0.22,
        }),
      []
    );

  const sidePlastic =
    useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          color:
            new THREE.Color(
              "#070b11"
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
        !rotatingRef.current
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
          pointerX * 0.17,
          0.035
        );

      groupRef.current.rotation.x =
        THREE.MathUtils.lerp(
          groupRef.current
            .rotation.x,
          -pointerY * 0.1 +
            0.04,
          0.035
        );

      const targetRotation =
        scrollProgress *
        Math.PI *
        7;

      rotatingRef.current.rotation.z =
        THREE.MathUtils.lerp(
          rotatingRef.current
            .rotation.z,
          targetRotation,
          0.075
        );

      rotatingRef.current.position.y =
        Math.sin(
          state.clock.elapsedTime *
            0.7
        ) * 0.025;
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
        {/* BACK FLANGE */}

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

        {/* FILAMENT CORE */}

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
              0.85,
              128,
            ]}
          />
        </mesh>

        {/* FILAMENT RINGS */}

        {[
          1.22,
          1.29,
          1.36,
          1.43,
          1.5,
          1.57,
          1.64,
        ].map(
          (
            radius,
            index
          ) => (
            <mesh
              key={
                radius
              }
              position={[
                0,
                0,
                -0.43 +
                  index *
                    0.14,
              ]}
              material={
                filamentMaterial
              }
            >
              <torusGeometry
                args={[
                  radius,
                  0.035,
                  10,
                  128,
                ]}
              />
            </mesh>
          )
        )}

        {/* FRONT FLANGE */}

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

        {/* FRONT INNER RECESS */}

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

        {/* CENTER HUB */}

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

        {/* CENTER INNER HUB */}

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

        {/* FRONT DESIGN CUTOUTS */}

        {[
          0,
          Math.PI / 2,
          Math.PI,
          Math.PI * 1.5,
        ].map(
          (
            angle,
            index
          ) => {
            const radius =
              1.48;

            const x =
              Math.cos(
                angle
              ) * radius;

            const y =
              Math.sin(
                angle
              ) * radius;

            return (
              <mesh
                key={
                  index
                }
                position={[
                  x,
                  y,
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
                  color="#03070c"
                  roughness={
                    0.6
                  }
                />
              </mesh>
            );
          }
        )}

        {/* SMALL BOLTS */}

        {[
          0,
          Math.PI / 2,
          Math.PI,
          Math.PI * 1.5,
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
                    0.25
                  }
                  metalness={
                    0.8
                  }
                />
              </mesh>
            );
          }
        )}
      </group>

      {/* FILAMENT STRAND LEAVING SPOOL */}

      <FilamentStrand
        material={
          filamentMaterial
        }
      />

      {/* BLUE INNER LIGHT */}

      <pointLight
        position={[
          0.2,
          0.1,
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
    useMemo(() => {
      return new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(
            1.48,
            -0.2,
            0.05
          ),

          new THREE.Vector3(
            1.65,
            -0.7,
            0.1
          ),

          new THREE.Vector3(
            1.5,
            -1.35,
            0.05
          ),

          new THREE.Vector3(
            1.25,
            -2.0,
            0
          ),

          new THREE.Vector3(
            1.15,
            -2.8,
            0
          ),
        ]
      );
    }, []);

  const geometry =
    useMemo(
      () =>
        new THREE.TubeGeometry(
          curve,
          80,
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
        intensity={1.2}
        color="#bcd8ff"
        groundColor="#02040a"
      />

      <directionalLight
        position={[
          5,
          6,
          7,
        ]}
        intensity={4}
        color="#d9e9ff"
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
        speed={1.2}
        rotationIntensity={
          0.05
        }
        floatIntensity={
          0.12
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
        opacity={0.5}
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