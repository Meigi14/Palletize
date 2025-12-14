import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, Edges } from '@react-three/drei';
import { LayerResult, PalletConfig, MaterialData } from '../types';

// Bypass TypeScript intrinsic element check for React Three Fiber elements
const Group = 'group' as any;
const Mesh = 'mesh' as any;
const BoxGeometry = 'boxGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const PlaneGeometry = 'planeGeometry' as any;
const AmbientLight = 'ambientLight' as any;
const DirectionalLight = 'directionalLight' as any;

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
    <Mesh position={[position.x, dims.h / 2, position.z]}>
      <BoxGeometry args={[length, dims.h, width]} />
      {/* Matched blue color */}
      <MeshStandardMaterial color="#00609c" roughness={0.4} />
      <Edges color="#000000" threshold={15} lineWidth={1.0} />
    </Mesh>
  );
}

const IsoScene: React.FC<{ layer: LayerResult; pallet: PalletConfig; material: MaterialData }> = ({ layer, pallet, material }) => {
  return (
    <Group>
       {/* Transparent Base/Ground plane for reference */}
       <Mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -1, 0]}>
         <PlaneGeometry args={[pallet.length, pallet.width]} />
         <MeshBasicMaterial color="#b0b0b0" />
         <Edges color="#666666" />
       </Mesh>

       {/* Boxes */}
       {layer.boxPositions.map((pos, idx) => (
         <IsoBox 
           key={idx} 
           position={pos} 
           dims={{l: material.length, w: material.width, h: material.height}} 
         />
       ))}
    </Group>
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
           
           <AmbientLight intensity={1.0} />
           <DirectionalLight position={[200, 500, 100]} intensity={1.2} />
           <DirectionalLight position={[-200, 200, -200]} intensity={0.5} />
           
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