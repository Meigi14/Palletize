import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, Edges } from '@react-three/drei';
import { LayerResult, PalletConfig, MaterialData } from '../types';

// Augment JSX namespace to satisfy TypeScript when @react-three/fiber types are missing or not picked up
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      planeGeometry: any;
      ambientLight: any;
      directionalLight: any;
    }
  }
}

interface LayerPatternProps {
  layer: LayerResult;
  pallet: PalletConfig;
  material: MaterialData;
}

const IsoBox: React.FC<{ 
  position: {x: number, z: number, rotated: boolean}; 
  dims: {l: number, w: number, h: number};
}> = ({ position, dims }) => {
  const length = position.rotated ? dims.w : dims.l;
  const width = position.rotated ? dims.l : dims.w;
  
  // Center y at h/2 so it sits on 0
  return (
    <mesh position={[position.x, dims.h / 2, position.z]}>
      <boxGeometry args={[length, dims.h, width]} />
      {/* Matched blue color */}
      <meshStandardMaterial color="#00609c" roughness={0.4} />
      <Edges color="#000000" threshold={15} lineWidth={1.0} />
    </mesh>
  );
}

const IsoScene: React.FC<{ layer: LayerResult; pallet: PalletConfig; material: MaterialData }> = ({ layer, pallet, material }) => {
  return (
    <group>
       {/* Transparent Base/Ground plane for reference */}
       <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -1, 0]}>
         <planeGeometry args={[pallet.length, pallet.width]} />
         <meshBasicMaterial color="#b0b0b0" />
         <Edges color="#666666" />
       </mesh>

       {/* Boxes */}
       {layer.boxPositions.map((pos, idx) => (
         <IsoBox 
           key={idx} 
           position={pos} 
           dims={{l: material.length, w: material.width, h: material.height}} 
         />
       ))}
    </group>
  );
}

const LayerPattern2D: React.FC<LayerPatternProps> = (props) => {
  const maxDim = Math.max(props.pallet.length, props.pallet.width);
  const zoom = 200 / maxDim; 

  return (
    <div className="flex flex-col items-center bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-72 h-56 relative bg-[#d5d2cd]"> {/* Matched background color */}
        <Canvas>
           <OrthographicCamera 
             makeDefault 
             position={[500, 500, 500]} 
             zoom={zoom} 
             near={-2000}
             far={5000}
             onUpdate={c => c.lookAt(0, 0, 0)}
           />
           
           <ambientLight intensity={1.0} />
           <directionalLight position={[200, 500, 100]} intensity={1.2} />
           <directionalLight position={[-200, 200, -200]} intensity={0.5} />
           
           <IsoScene {...props} />
        </Canvas>
      </div>
      
      <div className="w-full p-3 bg-white border-t border-gray-100 flex justify-between items-center">
        <div>
          <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
             <span className={`w-5 h-5 flex items-center justify-center rounded text-xs text-white ${props.layer.id === 'A' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                {props.layer.id}
             </span>
             {props.layer.items} 箱
          </div>
        </div>
        <div className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
          {props.layer.orientation === 'normal' ? '直向' : '橫向'}
        </div>
      </div>
    </div>
  );
}

export default LayerPattern2D;