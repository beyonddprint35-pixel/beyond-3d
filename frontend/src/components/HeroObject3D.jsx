import {
  Suspense,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Canvas,
  useFrame,
  useThree,
} from "@react-three/fiber";

import {
  ContactShadows,
} from "@react-three/drei";

import * as THREE from "three";

import gsap from "gsap";

import {
  ScrollTrigger,
} from "gsap/ScrollTrigger";

import "./HeroObject3D.css";

gsap.registerPlugin(
  ScrollTrigger
);

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

/* =========================================================
   TECHNICAL WIREFRAME CUBE
========================================================= */

function ProductModel({
  progressRef,
}) {
  const rootRef =
    useRef(null);

  const wireRef =
    useRef(null);

  const solidRef =
    useRef(null);

  const edgesRef =
    useRef(null);

  const cubeSize = 2.72;

  const solidMaterial =
    useMemo(
      () =>
        new THREE.MeshPhysicalMaterial({
          color:
            new THREE.Color(
              "#12365d"
            ),

          roughness: 0.78,

          metalness: 0,

          clearcoat: 0.04,

          clearcoatRoughness:
            0.9,

          transparent: true,

          opacity: 0,
        }),
      []
    );

  const edgeGeometry =
    useMemo(() => {
      const geometry =
        new THREE.BoxGeometry(
          cubeSize,
          cubeSize,
          cubeSize
        );

      return new THREE.EdgesGeometry(
        geometry
      );
    }, []);

  useFrame(
    (
      state,
      delta
    ) => {
      if (
        !rootRef.current ||
        !wireRef.current ||
        !solidRef.current ||
        !edgesRef.current
      ) {
        return;
      }

      const p =
        clamp(
          progressRef.current
        );

      const mobile =
        state.size.width <
        700;

      /* =========================================
         SCROLL + POINTER ROTATION
      ========================================= */

      rootRef.current.rotation.x =
        THREE.MathUtils.damp(
          rootRef.current
            .rotation.x,

          THREE.MathUtils.lerp(
            0.24,
            -0.02,
            p
          ) -
            state.pointer.y *
              (
                mobile
                  ? 0.012
                  : 0.028
              ),

          4,
          delta
        );

      rootRef.current.rotation.y =
        THREE.MathUtils.damp(
          rootRef.current
            .rotation.y,

          THREE.MathUtils.lerp(
            -0.62,
            0.18,
            p
          ) +
            state.pointer.x *
              (
                mobile
                  ? 0.018
                  : 0.045
              ),

          4,
          delta
        );

      rootRef.current.rotation.z =
        THREE.MathUtils.damp(
          rootRef.current
            .rotation.z,

          THREE.MathUtils.lerp(
            -0.035,
            0.02,
            p
          ),

          4,
          delta
        );

      /* =========================================
         SMALL PREMIUM "BREATHING" MOTION
      ========================================= */

      const idlePulse =
        Math.sin(
          state.clock.elapsedTime *
            0.75
        ) *
        (
          mobile
            ? 0.008
            : 0.012
        );

      const targetScale =
        THREE.MathUtils.lerp(
          1,
          1.055,
          p
        ) +
        idlePulse;

      const dampedScale =
        THREE.MathUtils.damp(
          rootRef.current
            .scale.x,

          targetScale,

          4,
          delta
        );

      rootRef.current.scale.setScalar(
        dampedScale
      );

      /* =========================================
         WIREFRAME → SUBTLE SOLID TRANSITION
      ========================================= */

      const solidProgress =
        clamp(
          (
            p -
            0.26
          ) /
            0.62
        );

      solidRef.current.traverse(
        (
          child
        ) => {
          if (
            child.material &&
            "opacity" in
              child.material
          ) {
            child.material.transparent =
              true;

            child.material.opacity =
              THREE.MathUtils.damp(
                child.material
                  .opacity,

                solidProgress *
                  0.18,

                5,
                delta
              );
          }
        }
      );

      wireRef.current.traverse(
        (
          child
        ) => {
          if (
            child.material &&
            "opacity" in
              child.material
          ) {
            child.material.transparent =
              true;

            child.material.opacity =
              THREE.MathUtils.damp(
                child.material
                  .opacity,

                THREE.MathUtils.lerp(
                  0.84,
                  0.56,
                  solidProgress
                ),

                5,
                delta
              );
          }
        }
      );

      edgesRef.current.traverse(
        (
          child
        ) => {
          if (
            child.material &&
            "opacity" in
              child.material
          ) {
            child.material.opacity =
              THREE.MathUtils.damp(
                child.material
                  .opacity,

                THREE.MathUtils.lerp(
                  0.92,
                  0.72,
                  solidProgress
                ),

                5,
                delta
              );
          }
        }
      );
    }
  );

  return (
    <group
      ref={rootRef}
      position={[
        0.18,
        0.05,
        0,
      ]}
    >
      {/* SUBTLE SOLID CORE */}

      <group ref={solidRef}>
        <mesh
          material={
            solidMaterial
          }
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[
              cubeSize,
              cubeSize,
              cubeSize,
              1,
              1,
              1,
            ]}
          />
        </mesh>
      </group>

      {/* DENSE TECHNICAL WIREFRAME */}

      <group ref={wireRef}>
        <mesh>
          <boxGeometry
            args={[
              cubeSize,
              cubeSize,
              cubeSize,
              8,
              8,
              8,
            ]}
          />

          <meshBasicMaterial
            color="#83acd0"
            wireframe
            transparent
            opacity={0.84}
            depthWrite={false}
          />
        </mesh>

        {/* SECONDARY FINER GRID */}

        <mesh
          scale={[
            1.002,
            1.002,
            1.002,
          ]}
        >
          <boxGeometry
            args={[
              cubeSize,
              cubeSize,
              cubeSize,
              4,
              4,
              4,
            ]}
          />

          <meshBasicMaterial
            color="#496f94"
            wireframe
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* CLEAN OUTER CUBE EDGES */}

      <group ref={edgesRef}>
        <lineSegments
          geometry={
            edgeGeometry
          }
        >
          <lineBasicMaterial
            color="#a9c9e5"
            transparent
            opacity={0.92}
          />
        </lineSegments>
      </group>

      {/* SUBTLE FLOOR REFLECTION */}

      <group
        position={[
          0,
          -3.18,
          0,
        ]}
        scale={[
          1,
          -0.34,
          1,
        ]}
      >
        <mesh>
          <boxGeometry
            args={[
              cubeSize,
              cubeSize,
              cubeSize,
              8,
              8,
              8,
            ]}
          />

          <meshBasicMaterial
            color="#4d83b1"
            wireframe
            transparent
            opacity={0.055}
            depthWrite={false}
          />
        </mesh>

        <lineSegments
          geometry={
            edgeGeometry
          }
        >
          <lineBasicMaterial
            color="#78a8d0"
            transparent
            opacity={0.09}
          />
        </lineSegments>
      </group>
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
      const p =
        clamp(
          progressRef.current
        );

      const mobile =
        size.width <
        700;

      const start =
        mobile
          ? {
              x: 0.05,
              y: 0.24,
              z: 7.75,
            }
          : {
              x: 0.42,
              y: 0.34,
              z: 7.05,
            };

      const end =
        mobile
          ? {
              x: -0.02,
              y: 0.08,
              z: 7.05,
            }
          : {
              x: -0.22,
              y: 0.08,
              z: 6.35,
            };

      camera.position.x =
        THREE.MathUtils.damp(
          camera.position.x,

          THREE.MathUtils.lerp(
            start.x,
            end.x,
            p
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
            p
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
            p
          ),

          4,
          delta
        );

      camera.lookAt(
        0.15,
        0,
        0
      );

      camera.updateProjectionMatrix();
    }
  );

  return null;
}

/* =========================================================
   LIGHTING
========================================================= */

function Lighting() {
  return (
    <>
      <ambientLight
        intensity={0.24}
      />

      <hemisphereLight
        color="#d9e8f5"
        groundColor="#020407"
        intensity={0.46}
      />

      <directionalLight
        position={[
          5,
          7,
          6,
        ]}
        intensity={1.85}
        color="#dceaf6"
        castShadow
      />

      <spotLight
        position={[
          -4,
          2,
          4,
        ]}
        intensity={1.15}
        color="#35658e"
        angle={0.72}
        penumbra={1}
      />

      <pointLight
        position={[
          2.4,
          -1.5,
          3.4,
        ]}
        intensity={0.55}
        color="#3b79ad"
      />
    </>
  );
}

/* =========================================================
   SCENE
========================================================= */

function Scene({
  progressRef,
}) {
  return (
    <>
      <CameraRig
        progressRef={
          progressRef
        }
      />

      <Lighting />

      <ProductModel
        progressRef={
          progressRef
        }
      />

      <ContactShadows
        position={[
          0.15,
          -1.78,
          0,
        ]}
        opacity={0.20}
        scale={6.4}
        blur={4.2}
        far={5}
      />

      
    </>
  );
}

/* =========================================================
   HERO OBJECT
========================================================= */

function HeroObject3D() {
  const wrapperRef =
    useRef(null);

  const progressRef =
    useRef(0);

  const [
    stage,
    setStage,
  ] = useState(
    "IDEA"
  );

  const [
    percentage,
    setPercentage,
  ] = useState(0);

  useLayoutEffect(() => {
    if (
      !wrapperRef.current
    ) {
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
        gsap.to(
          proxy,
          {
            value: 1,

            ease: "none",

            scrollTrigger: {
              trigger:
                hero,

              start:
                "top top",

              end:
                "bottom top",

              scrub: 1,

              invalidateOnRefresh:
                true,

              onUpdate:
                () => {
                  progressRef.current =
                    proxy.value;

                  const p =
                    proxy.value;

                  setPercentage(
                    Math.round(
                      p * 100
                    )
                  );

                  if (
                    p < 0.2
                  ) {
                    setStage(
                      "IDEA"
                    );
                  } else if (
                    p < 0.5
                  ) {
                    setStage(
                      "ANALYZING"
                    );
                  } else if (
                    p < 0.78
                  ) {
                    setStage(
                      "PREPARING"
                    );
                  } else {
                    setStage(
                      "READY"
                    );
                  }
                },
            },
          }
        );
      }, wrapperRef);

    ScrollTrigger.refresh();

    return () =>
      context.revert();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="hero-object-wrapper"
    >
      <div className="hero-object-aura" />

      <div className="hero-object-grid" />

      <Canvas
        className="hero-object-canvas"
        camera={{
          position: [
            0.42,
            0.34,
            7.05,
          ],

          fov: 43,

          near: 0.1,

          far: 100,
        }}
        dpr={[
          1,
          1.6,
        ]}
        gl={{
          antialias:
            true,

          alpha:
            true,

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
          <Scene
            progressRef={
              progressRef
            }
          />
        </Suspense>
      </Canvas>

      <div className="hero-data-panel hero-data-top">
        <span>
          DIGITAL MODEL
        </span>

        <strong>
          CUSTOM_OBJECT.3MF
        </strong>
      </div>

      <div className="hero-analysis-panel">
        <div className="hero-analysis-head">
          <span>
            MODEL STATUS
          </span>

          <i
            className={
              stage ===
              "READY"
                ? "ready"
                : ""
            }
          />
        </div>

        <strong>
          {stage}
        </strong>

        <div className="hero-analysis-progress">
          <span
            style={{
              width:
                `${percentage}%`,
            }}
          />
        </div>

        <small>
          {percentage}%
        </small>
      </div>

      <div className="hero-specs">
        <div>
          <span>
            MATERIAL
          </span>

          <strong>
            PLA+
          </strong>
        </div>

        <div>
          <span>
            LAYER
          </span>

          <strong>
            0.20 MM
          </strong>
        </div>

        <div>
          <span>
            PROCESS
          </span>

          <strong>
            FDM
          </strong>
        </div>
      </div>
    </div>
  );
}

export default HeroObject3D;
