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
  Environment,
} from "@react-three/drei";

import * as THREE from "three";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import "./HeroObject3D.css";

gsap.registerPlugin(ScrollTrigger);

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function ProductModel({ progressRef }) {
  const rootRef = useRef(null);
  const wireRef = useRef(null);
  const solidRef = useRef(null);

  const solidMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#356fa8"),
        roughness: 0.5,
        metalness: 0,
        clearcoat: 0.18,
        clearcoatRoughness: 0.5,
      }),
    []
  );

  useFrame((state, delta) => {
    if (!rootRef.current || !wireRef.current || !solidRef.current) {
      return;
    }

    const p = clamp(progressRef.current);
    const mobile = state.size.width < 700;

    rootRef.current.rotation.x = THREE.MathUtils.damp(
      rootRef.current.rotation.x,
      THREE.MathUtils.lerp(0.18, -0.02, p) -
        state.pointer.y * (mobile ? 0.01 : 0.02),
      4,
      delta
    );

    rootRef.current.rotation.y = THREE.MathUtils.damp(
      rootRef.current.rotation.y,
      THREE.MathUtils.lerp(-0.55, 0.2, p) +
        state.pointer.x * (mobile ? 0.015 : 0.035),
      4,
      delta
    );

    rootRef.current.rotation.z = THREE.MathUtils.damp(
      rootRef.current.rotation.z,
      THREE.MathUtils.lerp(-0.08, 0.02, p),
      4,
      delta
    );

    const solidProgress = clamp((p - 0.18) / 0.55);

    solidRef.current.traverse((child) => {
      if (child.material && "opacity" in child.material) {
        child.material.transparent = true;
        child.material.opacity = THREE.MathUtils.damp(
          child.material.opacity,
          solidProgress,
          5,
          delta
        );
      }
    });

    wireRef.current.traverse((child) => {
      if (child.material && "opacity" in child.material) {
        child.material.transparent = true;
        child.material.opacity = THREE.MathUtils.damp(
          child.material.opacity,
          1 - solidProgress * 0.85,
          5,
          delta
        );
      }
    });

    const scale = mobile
      ? THREE.MathUtils.lerp(0.78, 0.86, p)
      : THREE.MathUtils.lerp(0.92, 1.04, p);

    rootRef.current.scale.setScalar(
      THREE.MathUtils.damp(rootRef.current.scale.x, scale, 4, delta)
    );
  });

  return (
    <group ref={rootRef}>
      {/* WIREFRAME */}

      <group ref={wireRef}>
        <mesh>
          <boxGeometry args={[2.5, 2.5, 2.5, 8, 8, 8]} />

          <meshBasicMaterial
            color="#7aa2c5"
            wireframe
            transparent
            opacity={0.8}
          />
        </mesh>

        <mesh position={[0, 0, 1.28]}>
          <torusGeometry args={[0.62, 0.12, 10, 48]} />

          <meshBasicMaterial
            color="#7aa2c5"
            wireframe
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>

      {/* SOLID */}

      <group ref={solidRef}>
        <mesh material={solidMaterial} castShadow>
          <boxGeometry args={[2.5, 2.5, 2.5, 12, 12, 12]} />
        </mesh>

        {/* recessed front circle */}

        <mesh position={[0, 0, 1.27]}>
          <torusGeometry args={[0.62, 0.12, 18, 72]} />

          <meshPhysicalMaterial
            color="#142538"
            roughness={0.58}
            transparent
            opacity={1}
          />
        </mesh>

        {/* printed-layer lines */}

        {Array.from({ length: 18 }).map((_, index) => (
          <mesh
            key={index}
            position={[
              0,
              -1.18 + index * 0.138,
              1.265,
            ]}
          >
            <planeGeometry args={[2.3, 0.01]} />

            <meshBasicMaterial
              color="#8aa7bd"
              transparent
              opacity={0.08}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function ScanPlane({ progressRef }) {
  const ref = useRef(null);

  useFrame((_state, delta) => {
    if (!ref.current) return;

    const p = clamp(progressRef.current);

    ref.current.position.y = THREE.MathUtils.damp(
      ref.current.position.y,
      THREE.MathUtils.lerp(2, -2, clamp(p / 0.62)),
      6,
      delta
    );

    ref.current.visible = p < 0.72;
  });

  return (
    <group ref={ref}>
      <mesh>
        <planeGeometry args={[4.5, 0.16]} />

        <meshBasicMaterial
          color="#6f9ec5"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <planeGeometry args={[4.5, 0.015]} />

        <meshBasicMaterial
          color="#9ebbd2"
          transparent
          opacity={0.38}
        />
      </mesh>
    </group>
  );
}

function CameraRig({ progressRef }) {
  const { camera, size } = useThree();

  useFrame((_state, delta) => {
    const p = clamp(progressRef.current);
    const mobile = size.width < 700;

    const start = mobile
      ? { x: 0, y: 0.18, z: 7.4 }
      : { x: 0.4, y: 0.3, z: 6.9 };

    const end = mobile
      ? { x: 0, y: 0.05, z: 6.8 }
      : { x: -0.28, y: 0.06, z: 6.15 };

    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      THREE.MathUtils.lerp(start.x, end.x, p),
      4,
      delta
    );

    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      THREE.MathUtils.lerp(start.y, end.y, p),
      4,
      delta
    );

    camera.position.z = THREE.MathUtils.damp(
      camera.position.z,
      THREE.MathUtils.lerp(start.z, end.z, p),
      4,
      delta
    );

    camera.lookAt(0, 0, 0);

    camera.fov = THREE.MathUtils.damp(
      camera.fov,
      mobile ? 46 : THREE.MathUtils.lerp(43, 39, p),
      4,
      delta
    );

    camera.updateProjectionMatrix();
  });

  return null;
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.3} />

      <hemisphereLight
        color="#d8e4ee"
        groundColor="#020407"
        intensity={0.5}
      />

      <directionalLight
        position={[5, 7, 6]}
        intensity={2.4}
        color="#dde6ee"
        castShadow
      />

      <spotLight
        position={[-4, 2, 4]}
        intensity={1.5}
        color="#355f88"
        angle={0.7}
        penumbra={1}
      />

      <spotLight
        position={[4, -3, 3]}
        intensity={0.55}
        color="#8595a6"
        angle={0.7}
        penumbra={1}
      />
    </>
  );
}

function Scene({ progressRef }) {
  return (
    <>
      <CameraRig progressRef={progressRef} />

      <Lighting />

      <ProductModel progressRef={progressRef} />

      <ScanPlane progressRef={progressRef} />

      <ContactShadows
        position={[0, -1.75, 0]}
        opacity={0.22}
        scale={6}
        blur={3}
        far={5}
      />

      <Environment preset="city" environmentIntensity={0.1} />
    </>
  );
}

function HeroObject3D() {
  const wrapperRef = useRef(null);
  const progressRef = useRef(0);

  const [stage, setStage] = useState("IDEA");
  const [percentage, setPercentage] = useState(0);

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;

    const hero = wrapperRef.current.closest(".home-hero");
    if (!hero) return;

    const proxy = { value: 0 };

    const ctx = gsap.context(() => {
      gsap.to(proxy, {
        value: 1,
        ease: "none",

        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1,
          invalidateOnRefresh: true,

          onUpdate: () => {
            progressRef.current = proxy.value;

            const p = proxy.value;

            setPercentage(Math.round(p * 100));

            if (p < 0.2) {
              setStage("IDEA");
            } else if (p < 0.5) {
              setStage("ANALYZING");
            } else if (p < 0.78) {
              setStage("PREPARING");
            } else {
              setStage("READY");
            }
          },
        },
      });
    }, wrapperRef);

    ScrollTrigger.refresh();

    return () => ctx.revert();
  }, []);

  return (
    <div ref={wrapperRef} className="hero-object-wrapper">
      <div className="hero-object-aura" />
      <div className="hero-object-grid" />

      <Canvas
        className="hero-object-canvas"
        camera={{
          position: [0.4, 0.3, 6.9],
          fov: 43,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 1.6]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        shadows
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.92;
        }}
      >
        <Suspense fallback={null}>
          <Scene progressRef={progressRef} />
        </Suspense>
      </Canvas>

      <div className="hero-data-panel hero-data-top">
        <span>DIGITAL MODEL</span>
        <strong>CUSTOM_OBJECT.3MF</strong>
      </div>

      <div className="hero-analysis-panel">
        <div className="hero-analysis-head">
          <span>MODEL STATUS</span>

          <i className={stage === "READY" ? "ready" : ""} />
        </div>

        <strong>{stage}</strong>

        <div className="hero-analysis-progress">
          <span style={{ width: `${percentage}%` }} />
        </div>

        <small>{percentage}%</small>
      </div>

      <div className="hero-specs">
        <div>
          <span>MATERIAL</span>
          <strong>PLA+</strong>
        </div>

        <div>
          <span>LAYER</span>
          <strong>0.20 MM</strong>
        </div>

        <div>
          <span>PROCESS</span>
          <strong>FDM</strong>
        </div>
      </div>
    </div>
  );
}

export default HeroObject3D;