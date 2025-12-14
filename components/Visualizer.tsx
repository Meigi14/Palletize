import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, Environment, Edges } from '@react-three/drei';
import { PalletConfig, CalculationResult } from '../types';

// Bypass TypeScript intrinsic element check for React Three Fiber elements
const Group = 'group' as any;
const Mesh = 'mesh' as any;
const BoxGeometry = 'boxGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const AmbientLight = 'ambientLight' as any;
const DirectionalLight = 'directionalLight' as any;
const PlaneGeometry = 'planeGeometry' as any;
const ShadowMaterial = 'shadowMaterial' as any;

interface VisualizerProps {
  pallet: PalletConfig;
  result: CalculationResult | null;
}

const PalletMesh: React.FC<{ config: PalletConfig }> = ({ config }) => {
  return (
    <Group position={[0, config.height / 2, 0]}>
      {/* Top Deck */}
      <Mesh receiveShadow castShadow position={[0, 0, 0]}>
        <BoxGeometry args={[config.length, config.height, config.width]} />
        <MeshStandardMaterial color="#b0b0b0" /> {/* Grey Base like Image 2 */}
        <Edges color="#666666" threshold={15} />
      </Mesh>
    </Group>
  );
};

const BoxMesh: React.FC<{ 
  position: {x: number, y: number, z: number, rotation: boolean, color: string}; 
  dims: {l: number, w: number, h: number} 
}> = ({ position, dims }) => {
  
  const length = position.rotation ? dims.w : dims.l;
  const width = position.rotation ? dims.l : dims.w;

  return (
    <Mesh position={[position.x, position.y, position.z]} castShadow receiveShadow>
      <BoxGeometry args={[length, dims.h, width]} />
      {/* Blue color matching the reference image */}
      <MeshStandardMaterial color="#00609c" roughness={0.4} metalness={0.1} />
      <Edges color="black" threshold={15} lineWidth={1} />
    </Mesh>
  );
};

const SceneContent: React.FC<VisualizerProps> = ({ pallet, result }) => {
  return (
    <>
      <AmbientLight intensity={0.8} />
      <DirectionalLight position={[1000, 2000, 1000]} intensity={1.2} castShadow />
      <DirectionalLight position={[-500, 1000, -500]} intensity={0.5} />
      
      <Group>
        {/* The Pallet */}
        <PalletMesh config={pallet} />

        {/* The Boxes */}
        {result && result.positions.map((pos, idx) => (
          <BoxMesh 
            key={idx} 
            position={pos} 
            dims={{ l: result.material.length, w: result.material.width, h: result.material.height }} 
          />
        ))}
        
        {/* Shadow Plane */}
        <Mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]} receiveShadow>
           <PlaneGeometry args={[5000, 5000]} />
           <ShadowMaterial opacity={0.2} color="#000000" />
        </Mesh>
      </Group>
    </>
  );
};

const Visualizer: React.FC<VisualizerProps> = ({ pallet, result }) => {
  // Calculate zoom to fit the pallet in view
  const maxDim = Math.max(pallet.length, pallet.width);
  // Initial zoom factor for Orthographic camera
  const zoom = 400 / (maxDim / 1000); 

  return (
    <div className="absolute inset-0 bg-[#d5d2cd]"> {/* Warm grey background matching Image 2 */}
      <Canvas shadows dpr={[1, 2]}>
        {/* Orthographic Camera for Isometric View */}
        <OrthographicCamera 
           makeDefault 
           position={[1000, 1000, 1000]} 
           zoom={20} // Base zoom, will be adjusted by controls usually but we set a good default
           near={-5000} 
           far={10000}
           onUpdate={c => c.lookAt(0, 0, 0)}
        />
        <OrbitControls 
          makeDefault 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2} 
          enableRotate={true}
          enableZoom={true}
        />
        <SceneContent pallet={pallet} result={result} />
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
};

export default Visualizer;