export interface MaterialData {
  id: string;
  name: string;
  length: number; // mm
  width: number; // mm
  height: number; // mm
}

export interface PalletConfig {
  name: string;
  length: number; // mm
  width: number; // mm
  height: number; // mm (height of the wood pallet itself)
  maxLoadHeight: number; // mm
}

export interface BoxPosition {
  x: number;
  y: number;
  z: number;
  rotation: boolean; // true if rotated 90 degrees
  color: string;
  layerIndex: number;
}

export interface LayerResult {
  id: string; // 'A' or 'B'
  items: number;
  orientation: 'normal' | 'rotated'; // normal = length aligns with pallet length
  boxPositions: { x: number; z: number; rotated: boolean }[];
  layerWidth: number;
  layerLength: number;
}

export interface LayerAssignment {
  layerIndex: number;
  patternId: string;
  height: number;
  itemCount: number;
}

export interface CalculationResult {
  material: MaterialData;
  totalItems: number;
  totalLayers: number;
  utilizationVolume: number; // percentage
  utilizationArea: number; // percentage
  positions: BoxPosition[];
  stackHeight: number;
  uniquePatterns: LayerResult[];
  layerAssignments: LayerAssignment[];
}