import { MaterialData, PalletConfig, CalculationResult, LayerResult, BoxPosition, LayerAssignment } from '../types';

// Updated Default Pallet dimensions based on user request
export const DEFAULT_PALLET: PalletConfig = {
  name: "標準平板 (1180 x 980)",
  length: 1180,
  width: 980,
  height: 150, // Approx height of the wood pallet
  maxLoadHeight: 1350 // Default max loading height
};

/**
 * Calculates a single layer layout.
 */
const calculateLayerPattern = (
  boxL: number, 
  boxW: number, 
  palL: number, 
  palW: number,
  id: string
): LayerResult => {
  // Strategy 1: Align Box Length with Pallet Length
  const cols1 = Math.floor(palL / boxL);
  const rows1 = Math.floor(palW / boxW);
  const count1 = cols1 * rows1;

  // Strategy 2: Align Box Width with Pallet Length (Rotated)
  const cols2 = Math.floor(palL / boxW);
  const rows2 = Math.floor(palW / boxL);
  const count2 = cols2 * rows2;

  let chosenCount = 0;
  let isRotated = false;
  let finalCols = 0;
  let finalRows = 0;
  let usedL = 0;
  let usedW = 0;

  // Prefer the orientation that gives more items.
  if (count1 >= count2) {
    chosenCount = count1;
    isRotated = false;
    finalCols = cols1;
    finalRows = rows1;
    usedL = cols1 * boxL;
    usedW = rows1 * boxW;
  } else {
    chosenCount = count2;
    isRotated = true;
    finalCols = cols2;
    finalRows = rows2;
    usedL = cols2 * boxW;
    usedW = rows2 * boxL;
  }

  // Generate 2D positions for this layer
  const positions: { x: number; z: number; rotated: boolean }[] = [];
  
  // Center the layer
  const startX = -usedL / 2;
  const startZ = -usedW / 2;

  const actualItemL = isRotated ? boxW : boxL;
  const actualItemW = isRotated ? boxL : boxW;

  for (let c = 0; c < finalCols; c++) {
    for (let r = 0; r < finalRows; r++) {
      positions.push({
        x: startX + (c * actualItemL) + (actualItemL / 2),
        z: startZ + (r * actualItemW) + (actualItemW / 2),
        rotated: isRotated
      });
    }
  }

  return {
    id,
    items: chosenCount,
    orientation: isRotated ? 'rotated' : 'normal',
    boxPositions: positions,
    layerWidth: usedW,
    layerLength: usedL
  };
};

export const calculatePallet = (material: MaterialData, pallet: PalletConfig): CalculationResult => {
  const { length: pL, width: pW, maxLoadHeight } = pallet;
  const { length: bL, width: bW, height: bH } = material;

  // Layer A: Best fit algorithm
  const layerA = calculateLayerPattern(bL, bW, pL, pW, 'A');
  
  // Layer B: Attempt to find a complementary pattern for cross-stacking
  let layerB: LayerResult | null = null;
  
  if (layerA.orientation === 'normal') {
    // Try to force rotated layout
    const cols = Math.floor(pL / bW);
    const rows = Math.floor(pW / bL);
    if (cols > 0 && rows > 0) {
      const usedL = cols * bW;
      const usedW = rows * bL;
      const startX = -usedL / 2;
      const startZ = -usedW / 2;
      const positions = [];
      for(let c=0; c<cols; c++){
        for(let r=0; r<rows; r++){
          positions.push({
            x: startX + (c * bW) + (bW/2),
            z: startZ + (r * bL) + (bL/2),
            rotated: true
          });
        }
      }
      layerB = {
         id: 'B',
         items: cols * rows,
         orientation: 'rotated',
         boxPositions: positions,
         layerLength: usedL,
         layerWidth: usedW
      };
    }
  } else {
    // Layer A was rotated, try normal
    const cols = Math.floor(pL / bL);
    const rows = Math.floor(pW / bW);
    if (cols > 0 && rows > 0) {
       const usedL = cols * bL;
       const usedW = rows * bW;
       const startX = -usedL / 2;
       const startZ = -usedW / 2;
       const positions = [];
       for(let c=0; c<cols; c++){
         for(let r=0; r<rows; r++){
           positions.push({
             x: startX + (c * bL) + (bL/2),
             z: startZ + (r * bW) + (bW/2),
             rotated: false
           });
         }
       }
       layerB = {
          id: 'B',
          items: cols * rows,
          orientation: 'normal',
          boxPositions: positions,
          layerLength: usedL,
          layerWidth: usedW
       };
    }
  }

  // If Layer B is terrible (< 85% of A), discard it to avoid wasting too much space
  if (layerB && layerB.items < layerA.items * 0.85) {
      layerB = null;
  }

  // Determine Max Layers
  // Ensure we don't exceed max height. 
  // Note: user said max height 1350/700. Usually this includes pallet? 
  // Let's assume the limit applies to the Goods + Pallet or just Goods?
  // "Goods stacking max height" usually means just the goods. 
  // However, usually in logistics "Total Height" matters. 
  // Let's assume the user input is the LIMIT for the GOODS stack if not specified, 
  // but to be safe for stability, we calculate based on goods height.
  // If the prompt says "Goods stacking max height", we use that for the goods.
  const maxLayers = Math.floor(maxLoadHeight / bH);
  
  const finalPositions: BoxPosition[] = [];
  const layerAssignments: LayerAssignment[] = [];
  let totalItems = 0;

  for (let i = 0; i < maxLayers; i++) {
    // Cross-stacking: Alternate layers if Layer B is valid
    let currentLayer = layerA;
    if (layerB && i % 2 !== 0) {
        currentLayer = layerB;
    }

    // Record assignment
    layerAssignments.push({
        layerIndex: i + 1,
        patternId: currentLayer.id,
        height: (i + 1) * bH,
        itemCount: currentLayer.items
    });

    const yPos = (i * bH) + (bH / 2) + pallet.height;
    const layerColor = i % 2 === 0 ? '#3b82f6' : '#2563eb';

    currentLayer.boxPositions.forEach(pos => {
      finalPositions.push({
        x: pos.x,
        y: yPos,
        z: pos.z,
        rotation: pos.rotated,
        color: layerColor,
        layerIndex: i
      });
    });

    totalItems += currentLayer.items;
  }

  const uniquePatterns = [layerA];
  if (layerB) uniquePatterns.push(layerB);

  // Stats
  const totalVolumeBox = totalItems * (bL * bW * bH);
  const totalVolumeLoad = pL * pW * (maxLayers * bH);
  const volumeUtil = totalVolumeLoad > 0 ? (totalVolumeBox / totalVolumeLoad) * 100 : 0;
  
  const baseAreaUsed = layerA.layerLength * layerA.layerWidth;
  const palletArea = pL * pW;
  const areaUtil = (baseAreaUsed / palletArea) * 100;

  return {
    material,
    totalItems,
    totalLayers: maxLayers,
    utilizationVolume: volumeUtil,
    utilizationArea: areaUtil,
    positions: finalPositions,
    stackHeight: maxLayers * bH,
    uniquePatterns,
    layerAssignments
  };
};