import {
  Suspense,
  useEffect,
  useMemo,
} from "react";

import {
  Canvas,
  useThree,
} from "@react-three/fiber";

import {
  Center,
  useGLTF,
} from "@react-three/drei";

import * as THREE from "three";

import "./BuddyChef.css";

const BUDDY_CHEF_MODEL = "/models/buddyChef-blue-web.glb";

function BuddyChefModel() {
  const {
    scene,
  } = useGLTF(BUDDY_CHEF_MODEL);

  const model = useMemo(
    () => scene.clone(true),
    [scene]
  );

  useEffect(() => {
    model.traverse((object) => {
      if (!object.isMesh) return;

      object.frustumCulled = true;

      if (object.material) {
        object.material.side = THREE.FrontSide;
      }
    });
  }, [model]);

  return (
    <group position={[0.08, 0, 0]}>
      <Center>
        <primitive
          object={model}
          scale={1.00}
        />
      </Center>
    </group>
  );
}

function TransparentScene() {
  const {
    gl,
  } = useThree();

  useEffect(() => {
    gl.setClearColor(0x000000, 0);
  }, [gl]);

  return null;
}

export default function BuddyChef() {
  return (
    <div
      className="buddy-chef"
      aria-hidden="true"
    >
      <Canvas
        camera={{
          position: [0, 0.05, 4.8],
          fov: 30,
        }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        dpr={[1.5, 2]}
      >
        <TransparentScene />

        <ambientLight intensity={2.4} />

        <directionalLight
          position={[3, 5, 5]}
          intensity={2.6}
        />

        <directionalLight
          position={[-3, 2, 4]}
          intensity={0.9}
        />

        <Suspense fallback={null}>
          <BuddyChefModel />
        </Suspense>
      </Canvas>
    </div>
  );
}

