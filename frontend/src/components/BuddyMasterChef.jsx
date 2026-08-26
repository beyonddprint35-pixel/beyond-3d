import {
  Suspense,
  useMemo,
} from "react";

import {
  Canvas,
} from "@react-three/fiber";

import {
  Center,
  useGLTF,
} from "@react-three/drei";

import "./BuddyMasterChef.css";

const BUDDY_MASTER_CHEF_MODEL = "/models/buddymasterchef-blue-web.glb";

function BuddyMasterChefModel() {
  const { scene } =
    useGLTF(BUDDY_MASTER_CHEF_MODEL);

  const model = useMemo(
    () => scene.clone(true),
    [scene]
  );

  return (
    <Center>
      <primitive
        object={model}
        scale={0.82}
      />
    </Center>
  );
}

export default function BuddyMasterChef() {
  return (
    <div
      className="buddy-master-chef"
      aria-hidden="true"
    >
      <Canvas
        camera={{
          position: [0, 0.05, 5.6],
          fov: 30,
        }}
        gl={{
          alpha: true,
          antialias: true,
        }}
        dpr={[1, 2]}
      >
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
          <BuddyMasterChefModel />
        </Suspense>
      </Canvas>
    </div>
  );
}

/*
 * Intentionally NO useGLTF.preload().
 * Master Chef is near the bottom of the page.
 */
