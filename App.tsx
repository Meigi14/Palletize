import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Box, Settings, AlertCircle, ChevronRight, BarChart3, Layers, Maximize, FileSpreadsheet, RotateCcw, Search } from 'lucide-react';
import { MaterialData, PalletConfig, CalculationResult } from './types';
import { calculatePallet, DEFAULT_PALLET } from './utils/packer';
import Visualizer from './components/Visualizer';
import LayerPattern2D from './components/LayerPattern2D';

function App() {
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [pallet, setPallet] = useState<PalletConfig>(DEFAULT_PALLET);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to fuzzy match column headers
  const findColumnIndex = (headers: any[], keywords: string[]): number => {
    return headers.findIndex(h => {
      const str = String(h).toLowerCase();
      return keywords.some(k => str.includes(k));
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length < 2) {
          setError("Excel 文件為空或缺少數據行。");
          return;
        }

        // Detect columns from first row
        const headerRow = data[0];
        const idxName = findColumnIndex(headerRow, ['物料', 'name', 'item']);
        const idxL = findColumnIndex(headerRow, ['長', 'length', 'l']);
        const idxW = findColumnIndex(headerRow, ['闊', '寬', 'width', 'w']);
        const idxH = findColumnIndex(headerRow, ['高', 'height', 'h']);

        // Fallback to 0,1,2,3 if headers not found
        const cName = idxName !== -1 ? idxName : 0;
        const cL = idxL !== -1 ? idxL : 1;
        const cW = idxW !== -1 ? idxW : 2;
        const cH = idxH !== -1 ? idxH : 3;

        const parsedMaterials: MaterialData[] = [];
        // Skip header
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          // Ensure row has enough data based on max index
          if (row.length > Math.max(cName, cL, cW, cH)) {
            const name = row[cName]?.toString() || `Item ${i}`;
            const l = parseFloat(row[cL]);
            const w = parseFloat(row[cW]);
            const h = parseFloat(row[cH]);

            if (!isNaN(l) && !isNaN(w) && !isNaN(h)) {
              parsedMaterials.push({
                id: `mat-${i}-${Date.now()}`,
                name,
                length: l,
                width: w,
                height: h
              });
            }
          }
        }

        if (parsedMaterials.length === 0) {
          setError("未找到有效數據。請檢查 Excel 格式: 物料, 長, 闊, 高");
        } else {
          setMaterials(parsedMaterials);
          setSearchQuery(''); // Reset search on new upload
          setSelectedMaterialId(parsedMaterials[0].id);
          setError(null);
        }
      } catch (err) {
        console.error(err);
        setError("無法解析 Excel 文件。");
      }
    };
    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    if (selectedMaterialId && materials.length > 0) {
      const mat = materials.find(m => m.id === selectedMaterialId);
      if (mat) {
        const res = calculatePallet(mat, pallet);
        setResult(res);
      }
    }
  }, [selectedMaterialId, materials, pallet]);

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  // Filter materials based on search query
  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-gray-800">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 shadow-md z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">平板裝載優化專家</h1>
              <p className="text-xs text-slate-400">Excel 導入 & 3D 自動堆疊計算</p>
            </div>
          </div>
          <div className="flex gap-4 text-sm text-slate-300">
            <span>平板: {pallet.length} x {pallet.width} mm</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Inputs & List */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              導入數據
            </h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors group"
            >
              <FileSpreadsheet className="w-10 h-10 text-gray-400 group-hover:text-blue-500 mb-2" />
              <p className="text-sm font-medium text-gray-600">點擊上傳 Excel (.xlsx)</p>
              <p className="text-xs text-gray-400 mt-1">格式: 物料 | 長 | 闊 | 高</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx, .xls" 
              className="hidden" 
            />
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          {/* Configuration */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
             <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-600" />
              平板設置
            </h2>
            <div className="space-y-4 text-sm">
               <div>
                  <label className="block text-gray-500 mb-1 font-medium">貨物堆疊最大高度</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPallet({...pallet, maxLoadHeight: 1350})}
                      className={`px-3 py-2 rounded border text-center transition-all ${pallet.maxLoadHeight === 1350 ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold ring-1 ring-blue-600' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      1350 mm
                    </button>
                    <button 
                      onClick={() => setPallet({...pallet, maxLoadHeight: 700})}
                      className={`px-3 py-2 rounded border text-center transition-all ${pallet.maxLoadHeight === 700 ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold ring-1 ring-blue-600' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      700 mm
                    </button>
                  </div>
               </div>
               <div>
                  <label className="block text-gray-500 mb-1">平板尺寸 (固定)</label>
                  <div className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-600 flex justify-between">
                    <span>長 1180 mm</span>
                    <span>闊 980 mm</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Material List */}
          {materials.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col min-h-[300px]">
              <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl space-y-3">
                 <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-gray-700">導入的物料清單</h2>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{filteredMaterials.length} / {materials.length}</span>
                 </div>
                 
                 {/* Search Bar */}
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                     type="text" 
                     placeholder="搜尋物料名稱..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                   />
                 </div>
              </div>

              <div className="overflow-y-auto flex-1 p-2 space-y-2 max-h-[400px]">
                {filteredMaterials.length > 0 ? (
                  filteredMaterials.map(mat => (
                    <button
                      key={mat.id}
                      onClick={() => setSelectedMaterialId(mat.id)}
                      className={`w-full text-left p-4 border-b border-gray-100 last:border-0 flex items-center justify-between transition-all group ${
                        selectedMaterialId === mat.id 
                          ? 'bg-blue-600 text-white shadow-md rounded-lg' 
                          : 'hover:bg-gray-50 text-gray-700 rounded-lg'
                      }`}
                    >
                      <div>
                        <div className={`text-lg font-bold ${selectedMaterialId === mat.id ? 'text-white' : 'text-gray-800'}`}>
                          {mat.name}
                        </div>
                        <div className={`text-xs mt-1 ${selectedMaterialId === mat.id ? 'text-blue-100' : 'text-gray-400'}`}>
                          {mat.length} x {mat.width} x {mat.height} mm
                        </div>
                      </div>
                      {selectedMaterialId === mat.id && <ChevronRight className="w-5 h-5 text-white" />}
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    未找到相符物料
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Visualization & Stats */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <StatCard 
               label="總箱數" 
               value={result ? result.totalItems.toString() : '-'} 
               icon={<Box className="w-4 h-4" />}
             />
             <StatCard 
               label="總層數" 
               value={result ? result.totalLayers.toString() : '-'} 
               icon={<Layers className="w-4 h-4" />}
             />
             <StatCard 
               label="容積利用率" 
               value={result ? `${result.utilizationVolume.toFixed(1)}%` : '-'} 
               icon={<Maximize className="w-4 h-4" />}
             />
             <StatCard 
               label="堆疊高度" 
               value={result ? `${result.stackHeight} mm` : '-'} 
               icon={<BarChart3 className="w-4 h-4" />}
             />
          </div>

          {/* 3D Visualizer */}
          <div className="flex-1 bg-[#d5d2cd] rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-300 overflow-hidden min-h-[500px] relative flex flex-col">
            {/* Overlay UI */}
            <div className="absolute top-6 left-6 z-10 flex flex-col items-start gap-2 pointer-events-none">
              {selectedMaterial ? (
                <>
                  <div className="bg-white/95 backdrop-blur-sm shadow-md border border-gray-200 rounded-lg p-3 min-w-[60px] text-center">
                    <span className="text-3xl font-bold text-gray-800 block leading-none tracking-tight">
                      {selectedMaterial.name}
                    </span>
                  </div>
                  
                  {result && (
                    <div className="bg-blue-50/95 backdrop-blur-sm shadow-sm border border-blue-100 rounded px-2 py-1 text-xs font-semibold text-blue-700 flex items-center gap-1">
                      <span className="text-blue-400">策略:</span> 交叉堆疊穩固優化
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-sm text-gray-500 font-medium border border-gray-200">
                   請先導入並選擇物料
                </div>
              )}
            </div>

            <div className="flex-1 relative w-full h-full">
               <Visualizer pallet={pallet} result={result} />
            </div>
            
            <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
               <div className="bg-white/90 backdrop-blur-sm shadow-sm border border-gray-200 rounded px-3 py-1.5 text-[10px] text-gray-500">
                  Left Click: Rotate | Right Click: Pan | Scroll: Zoom
               </div>
            </div>

            {result && (
               <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 p-2 text-xs text-center text-gray-500">
                   提示: 系統已自動交錯層次排列以增加穩定性 (避免同向重疊)。
               </div>
            )}
          </div>

          {/* Layer Guide & Patterns */}
          {result && selectedMaterial && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Layer Structure Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-gray-600" />
                  每層堆疊明細
                </h3>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">層數</th>
                        <th className="px-4 py-3">樣式</th>
                        <th className="px-4 py-3">箱數</th>
                        <th className="px-4 py-3">高度</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.layerAssignments.map((layer) => (
                        <tr key={layer.layerIndex} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-700">第 {layer.layerIndex} 層</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${layer.patternId === 'A' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'}`}>
                              樣式 {layer.patternId}
                            </span>
                          </td>
                          <td className="px-4 py-2">{layer.itemCount}</td>
                          <td className="px-4 py-2 text-gray-500">{layer.height} mm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2D Patterns Visualization */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Box className="w-5 h-5 text-gray-600" />
                  每層排列圖示
                </h3>
                <div className="flex flex-wrap justify-center gap-8 py-4">
                  {result.uniquePatterns.map((pattern) => (
                    <LayerPattern2D 
                      key={pattern.id}
                      layer={pattern} 
                      pallet={pallet} 
                      material={selectedMaterial} 
                    />
                  ))}
                </div>
                <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <RotateCcw className="w-3 h-3 mt-0.5" />
                  <p>奇數層與偶數層交替使用不同樣式 (如樣式 A 和 B) 以確保貨物穩定。</p>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}

const StatCard = ({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
    <div className="flex items-center gap-2 text-gray-500 mb-2">
      <div className="p-1.5 bg-gray-100 rounded-md text-gray-600">
         {icon}
      </div>
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-3xl font-bold text-slate-800 mt-1">{value}</div>
  </div>
);

export default App;