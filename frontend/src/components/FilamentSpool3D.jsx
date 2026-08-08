import {
  Suspense,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import {
  Canvas,
  useFrame,
  useThree,
} from "@react-three/fiber";

import {
  ContactShadows,
  Environment,
} from "@react-three/drei";

import * as THREE from "three";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import "./FilamentSpool3D.css";

gsap.registerPlugin(ScrollTrigger);

function clamp(value, min = 0, max = 1) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

/* =========================================================
   MATERIALS
========================================================= */

function useFilamentMaterial() {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(
          "#285f8d"
        ),

        roughness: 0.52,

        metalness: 0,

        clearcoat: 0.18,

        clearcoatRoughness: 0.5,

        sheen: 0.08,

        sheenColor:
          new THREE.Color(
            "#789bb8"
          ),

        emissive:
          new THREE.Color(
            "#020810"
          ),

        emissiveIntensity: 0.025,
      }),
    []
  );
}

function useFlangeMaterial() {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(
          "#111820"
        ),

        roughness: 0.45,

        metalness: 0.15,

        clearcoat: 0.28,

        clearcoatRoughness: 0.4,
      }),
    []
  );
}

/* =========================================================
   FILAMENT ROLL
========================================================= */

function FilamentRoll({
  progressRef,
}) {
  const rollRef =
    useRef(null);

  const material =
    useFilamentMaterial();

  const windings =
    useMemo(() => {
      const result = [];

      const depthLayers = 20;
      const radialLayers = 9;

      for (
        let depthIndex = 0;
        depthIndex < depthLayers;
        depthIndex++
      ) {
        const z =
          -0.58 +
          depthIndex * 0.061;

        const stagger =
          depthIndex % 2 === 0
            ? 0
            : 0.017;

        for (
          let radialIndex = 0;
          radialIndex < radialLayers;
          radialIndex++
        ) {
          result.push({
            key:
              `${depthIndex}-${radialIndex}`,

            radius:
              1.02 +
              radialIndex *
                0.079 +
              stagger,

            z,
          });
        }
      }

      return result;
    }, []);

  useFrame(
    (
      _state,
      delta
    ) => {
      if (!rollRef.current) {
        return;
      }

      const progress =
        clamp(
          progressRef.current
        );

      const targetScale =
        1 -
        progress * 0.07;

      rollRef.current.scale.x =
        THREE.MathUtils.damp(
          rollRef.current
            .scale.x,
          targetScale,
          5,
          delta
        );

      rollRef.current.scale.y =
        THREE.MathUtils.damp(
          rollRef.current
            .scale.y,
          targetScale,
          5,
          delta
        );
    }
  );

  return (
    <group ref={rollRef}>
      <mesh
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
        material={material}
        castShadow
      >
        <cylinderGeometry
          args={[
            1.72,
            1.72,
            1.18,
            128,
          ]}
        />
      </mesh>

      {windings.map(
        (winding) => (
          <mesh
            key={winding.key}
            position={[
              0,
              0,
              winding.z,
            ]}
            material={material}
          >
            <torusGeometry
              args={[
                winding.radius,
                0.03,
                10,
                128,
              ]}
            />
          </mesh>
        )
      )}
    </group>
  );
}

/* =========================================================
   LOOSE FILAMENT
========================================================= */

function LooseFilament({
  progressRef,
}) {
  const strandRef =
    useRef(null);

  const material =
    useFilamentMaterial();

  const geometry =
    useMemo(() => {
      const curve =
        new THREE.CatmullRomCurve3(
          [
            new THREE.Vector3(
              1.52,
              -0.5,
              0.12
            ),

            new THREE.Vector3(
              1.67,
              -0.78,
              0.11
            ),

            new THREE.Vector3(
              1.62,
              -1.06,
              0.1
            ),

            new THREE.Vector3(
              1.43,
              -1.34,
              0.08
            ),

            new THREE.Vector3(
              1.18,
              -1.61,
              0.06
            ),

            new THREE.Vector3(
              1.1,
              -1.9,
              0.04
            ),

            new THREE.Vector3(
              1.22,
              -2.18,
              0.02
            ),

            new THREE.Vector3(
              1.26,
              -2.48,
              0
            ),

            new THREE.Vector3(
              1.16,
              -2.83,
              -0.02
            ),

            new THREE.Vector3(
              1.05,
              -3.25,
              -0.04
            ),
          ]
        );

      return new THREE
        .TubeGeometry(
          curve,
          180,
          0.058,
          14,
          false
        );
    }, []);

  useFrame(
    (
      _state,
      delta
    ) => {
      if (!strandRef.current) {
        return;
      }

      const progress =
        clamp(
          progressRef.current
        );

      const tension =
        Math.sin(
          progress *
            Math.PI *
            2.2
        );

      const sideways =
        Math.sin(
          progress *
            Math.PI *
            3.5
        );

      strandRef.current.rotation.z =
        THREE.MathUtils.damp(
          strandRef.current
            .rotation.z,

          tension * 0.03,

          5,

          delta
        );

      strandRef.current.position.x =
        THREE.MathUtils.damp(
          strandRef.current
            .position.x,

          sideways * 0.03,

          5,

          delta
        );

      strandRef.current.scale.y =
        THREE.MathUtils.damp(
          strandRef.current
            .scale.y,

          0.98 +
            progress * 0.04,

          5,

          delta
        );
    }
  );

  return (
    <group ref={strandRef}>
      <mesh
        geometry={geometry}
        scale={[
          1.045,
          1.015,
          1.045,
        ]}
      >
        <meshBasicMaterial
          color="#020407"
          side={THREE.BackSide}
        />
      </mesh>

      <mesh
        geometry={geometry}
        material={material}
        castShadow
      />
    </group>
  );
}

/* =========================================================
   SPOOL
========================================================= */

function Spool({
  progressRef,
}) {
  const rootRef =
    useRef(null);

  const spoolRef =
    useRef(null);

  const flangeMaterial =
    useFlangeMaterial();

  const rearMaterial =
    useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          color: "#06090d",
          roughness: 0.64,
          metalness: 0.12,
        }),
      []
    );

  const rimMaterial =
    useMemo(
      () =>
        new THREE.MeshPhysicalMaterial({
          color: "#28323e",
          roughness: 0.36,
          metalness: 0.27,
          clearcoat: 0.18,
        }),
      []
    );

  const hubMaterial =
    useMemo(
      () =>
        new THREE.MeshPhysicalMaterial({
          color: "#172a42",
          roughness: 0.4,
          metalness: 0.12,
          clearcoat: 0.24,
        }),
      []
    );

  useFrame(
    (
      state,
      delta
    ) => {
      if (
        !rootRef.current ||
        !spoolRef.current
      ) {
        return;
      }

      const progress =
        clamp(
          progressRef.current
        );

      const mobile =
        state.size.width < 700;

      const startX =
        mobile
          ? 0.16
          : 0.2;

      const endX =
        mobile
          ? 0.23
          : 0.3;

      const startY =
        mobile
          ? -0.32
          : -0.48;

      const endY =
        mobile
          ? -0.18
          : -0.18;

      const startZ =
        mobile
          ? -0.04
          : -0.08;

      const endZ =
        mobile
          ? 0.02
          : 0.05;

      const pointerX =
        state.pointer.x *
        (mobile
          ? 0.02
          : 0.045);

      const pointerY =
        state.pointer.y *
        (mobile
          ? 0.01
          : 0.03);

      rootRef.current.rotation.x =
        THREE.MathUtils.damp(
          rootRef.current
            .rotation.x,

          THREE.MathUtils.lerp(
            startX,
            endX,
            progress
          ) -
            pointerY,

          5,
          delta
        );

      rootRef.current.rotation.y =
        THREE.MathUtils.damp(
          rootRef.current
            .rotation.y,

          THREE.MathUtils.lerp(
            startY,
            endY,
            progress
          ) +
            pointerX,

          5,
          delta
        );

      rootRef.current.rotation.z =
        THREE.MathUtils.damp(
          rootRef.current
            .rotation.z,

          THREE.MathUtils.lerp(
            startZ,
            endZ,
            progress
          ),

          5,
          delta
        );

      const turns =
        mobile
          ? 1.05
          : 1.45;

      spoolRef.current.rotation.z =
        THREE.MathUtils.damp(
          spoolRef.current
            .rotation.z,

          progress *
            Math.PI *
            2 *
            turns,

          7,
          delta
        );

      spoolRef.current.position.y =
        THREE.MathUtils.damp(
          spoolRef.current
            .position.y,

          THREE.MathUtils.lerp(
            0.05,
            -0.08,
            progress
          ),

          5,
          delta
        );

      const targetScale =
        mobile
          ? THREE.MathUtils.lerp(
              0.76,
              0.81,
              progress
            )
          : THREE.MathUtils.lerp(
              0.94,
              1.02,
              progress
            );

      const scale =
        THREE.MathUtils.damp(
          rootRef.current
            .scale.x,

          targetScale,

          5,
          delta
        );

      rootRef.current.scale.setScalar(
        scale
      );
    }
  );

  return (
    <group ref={rootRef}>
      <group ref={spoolRef}>
        <mesh
          position={[
            0,
            0,
            -0.72,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          material={rearMaterial}
          castShadow
        >
          <cylinderGeometry
            args={[
              2.16,
              2.16,
              0.26,
              128,
            ]}
          />
        </mesh>

        <mesh
          position={[
            0,
            0,
            -0.55,
          ]}
          material={rimMaterial}
        >
          <torusGeometry
            args={[
              2.04,
              0.12,
              20,
              128,
            ]}
          />
        </mesh>

        <FilamentRoll
          progressRef={
            progressRef
          }
        />

        <mesh
          position={[
            0,
            0,
            0.72,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          material={
            flangeMaterial
          }
          castShadow
        >
          <cylinderGeometry
            args={[
              2.16,
              2.16,
              0.26,
              128,
            ]}
          />
        </mesh>

        <mesh
          position={[
            0,
            0,
            0.9,
          ]}
          material={rimMaterial}
        >
          <torusGeometry
            args={[
              2.03,
              0.115,
              20,
              128,
            ]}
          />
        </mesh>

        {[
          0,
          Math.PI / 2,
          Math.PI,
          Math.PI * 1.5,
        ].map(
          (
            angle,
            index
          ) => (
            <group
              key={index}
              position={[
                Math.cos(angle) *
                  1.48,

                Math.sin(angle) *
                  1.48,

                0.88,
              ]}
              rotation={[
                0,
                0,
                angle,
              ]}
              scale={[
                0.62,
                0.94,
                0.18,
              ]}
            >
              <mesh>
                <sphereGeometry
                  args={[
                    0.52,
                    48,
                    48,
                  ]}
                />

                <meshStandardMaterial
                  color="#010204"
                  roughness={0.9}
                />
              </mesh>
            </group>
          )
        )}

        <mesh
          position={[
            0,
            0,
            0.92,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          material={
            flangeMaterial
          }
        >
          <cylinderGeometry
            args={[
              0.86,
              0.86,
              0.29,
              96,
            ]}
          />
        </mesh>

        <mesh
          position={[
            0,
            0,
            1.1,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          material={hubMaterial}
        >
          <cylinderGeometry
            args={[
              0.52,
              0.52,
              0.12,
              96,
            ]}
          />
        </mesh>

        <mesh
          position={[
            0,
            0,
            1.17,
          ]}
        >
          <circleGeometry
            args={[
              0.255,
              64,
            ]}
          />

          <meshStandardMaterial
            color="#010204"
          />
        </mesh>

        {[
          0,
          Math.PI / 2,
          Math.PI,
          Math.PI * 1.5,
        ].map(
          (
            angle,
            index
          ) => (
            <mesh
              key={
                `fastener-${index}`
              }
              position={[
                Math.cos(angle) *
                  1.92,

                Math.sin(angle) *
                  1.92,

                0.94,
              ]}
            >
              <sphereGeometry
                args={[
                  0.043,
                  20,
                  20,
                ]}
              />

              <meshStandardMaterial
                color="#8d959e"
                metalness={0.68}
                roughness={0.32}
              />
            </mesh>
          )
        )}
      </group>

      <LooseFilament
        progressRef={
          progressRef
        }
      />
    </group>
  );
}

/* =========================================================
   CAMERA
========================================================= */

function CameraRig({
  progressRef,
}) {
  const {
    camera,
    size,
  } = useThree();

  useFrame(
    (
      _state,
      delta
    ) => {
      const progress =
        clamp(
          progressRef.current
        );

      const mobile =
        size.width < 700;

      const start =
        mobile
          ? {
              x: 0,
              y: 0.18,
              z: 8.5,
            }
          : {
              x: 0.15,
              y: 0.35,
              z: 7.8,
            };

      const end =
        mobile
          ? {
              x: 0.02,
              y: 0.1,
              z: 7.95,
            }
          : {
              x: -0.16,
              y: 0.15,
              z: 7.08,
            };

      camera.position.x =
        THREE.MathUtils.damp(
          camera.position.x,

          THREE.MathUtils.lerp(
            start.x,
            end.x,
            progress
          ),

          4,
          delta
        );

      camera.position.y =
        THREE.MathUtils.damp(
          camera.position.y,

          THREE.MathUtils.lerp(
            start.y,
            end.y,
            progress
          ),

          4,
          delta
        );

      camera.position.z =
        THREE.MathUtils.damp(
          camera.position.z,

          THREE.MathUtils.lerp(
            start.z,
            end.z,
            progress
          ),

          4,
          delta
        );

      camera.lookAt(
        0,
        THREE.MathUtils.lerp(
          0,
          -0.12,
          progress
        ),
        0
      );

      camera.fov =
        THREE.MathUtils.damp(
          camera.fov,

          mobile
            ? 45
            : THREE.MathUtils.lerp(
                42,
                39,
                progress
              ),

          4,
          delta
        );

      camera.updateProjectionMatrix();
    }
  );

  return null;
}

/* =========================================================
   LIGHTING
========================================================= */

function HeroLighting() {
  return (
    <>
      <ambientLight
        intensity={0.28}
      />

      <hemisphereLight
        color="#d8e1ea"
        groundColor="#020305"
        intensity={0.5}
      />

      <directionalLight
        position={[
          5,
          7,
          6,
        ]}
        color="#dce5ed"
        intensity={2.5}
        castShadow
      />

      <spotLight
        position={[
          -5,
          2.5,
          4,
        ]}
        color="#376794"
        intensity={1.7}
        angle={0.7}
        penumbra={0.95}
      />

      <spotLight
        position={[
          5,
          -3,
          3,
        ]}
        color="#73879a"
        intensity={0.6}
        angle={0.65}
        penumbra={1}
      />
    </>
  );
}

/* =========================================================
   SCENE
========================================================= */

function FilamentScene({
  progressRef,
}) {
  return (
    <>
      <CameraRig
        progressRef={
          progressRef
        }
      />

      <HeroLighting />

      <Spool
        progressRef={
          progressRef
        }
      />

      <ContactShadows
        position={[
          0,
          -2.55,
          0,
        ]}
        opacity={0.22}
        scale={7}
        blur={3.5}
        far={5}
      />

      <Environment
        preset="city"
        environmentIntensity={
          0.1
        }
      />
    </>
  );
}

/* =========================================================
   MAIN
========================================================= */

function FilamentSpool3D() {
  const wrapperRef =
    useRef(null);

  const progressRef =
    useRef(0);

  useLayoutEffect(() => {
    if (!wrapperRef.current) {
      return;
    }

    const hero =
      wrapperRef.current.closest(
        ".home-hero"
      );

    if (!hero) {
      return;
    }

    const proxy = {
      value: 0,
    };

    const context =
      gsap.context(() => {
        gsap.to(proxy, {
          value: 1,

          ease: "none",

          scrollTrigger: {
            trigger: hero,

            start: "top top",

            end: "+=120%",

            scrub: 1.1,

            invalidateOnRefresh:
              true,

            onUpdate: () => {
              progressRef.current =
                proxy.value;
            },
          },
        });
      }, wrapperRef);

    ScrollTrigger.refresh();

    return () => {
      context.revert();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="spool-cinematic-wrapper"
    >
      <div className="spool-cinematic-aura" />

      <div className="spool-cinematic-vignette" />

      <Canvas
        className="spool-cinematic-canvas"
        camera={{
          position: [
            0.15,
            0.35,
            7.8,
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
        shadows
        onCreated={({
          gl,
        }) => {
          gl.setClearColor(
            0x000000,
            0
          );

          gl.outputColorSpace =
            THREE.SRGBColorSpace;

          gl.toneMapping =
            THREE.ACESFilmicToneMapping;

          gl.toneMappingExposure =
            0.9;
        }}
      >
        <Suspense
          fallback={null}
        >
          <FilamentScene
            progressRef={
              progressRef
            }
          />
        </Suspense>
      </Canvas>

      {/*
        HOME.JSX measures this
        exact element.

        The page filament begins
        here.
      */}

      <div
        className="filament-page-anchor"
        aria-hidden="true"
      />

      <div className="cinematic-material-tag">
        <span>
          MATERIAL
        </span>

        <strong>
          PLA / 1.75 MM
        </strong>
      </div>

      <div className="cinematic-scroll-tag">
        <span className="cinematic-scroll-dot" />

        SCROLL TO FEED
      </div>
    </div>
  );
}

export default FilamentSpool3D;