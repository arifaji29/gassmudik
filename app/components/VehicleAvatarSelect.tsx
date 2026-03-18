"use client";
import { useState, useMemo } from 'react';
import { Bike, Car, Plane, Ship, Image as ImageIcon, Sparkles, Pencil } from 'lucide-react';

// --- DATA MOCK KENDARAAN ---
// Pastikan asset PNG transparan ini ada di folder /public proyek Next.js Anda
// misal di: project-root/public/images/vario.png
const vehicleModels = {
  motor: [
    { id: 'vario', name: 'Honda Vario', src: '/images/vario.png', defaultSize: 0.15 },
    { id: 'vespa', name: 'Vespa Sprint', src: '/images/vespa.png', defaultSize: 0.15 },
    { id: 'cb', name: 'Honda CB', src: '/images/cb.png', defaultSize: 0.15 },
    { id: 'ninja', name: 'Ninja 250', src: '/images/ninja.png', defaultSize: 0.15 },
  ],
  mobil: [
    { id: 'avanza', name: 'Toyota Avanza', src: '/images/car.png', defaultSize: 0.12 },
    { id: 'fortuner', name: 'Toyota Fortuner', src: '/images/suv.png', defaultSize: 0.13 },
    { id: 'hiace', name: 'Toyota Hiace', src: '/images/van.png', defaultSize: 0.14 },
    { id: 'bus', name: 'Medium Bus', src: '/images/bus.png', defaultSize: 0.12 },
  ],
  pesawat: [
    { id: 'b737', name: 'Boeing 737', src: '/images/plane.png', defaultSize: 0.15 },
    { id: 'heli', name: 'Helicopter Bell 412', src: '/images/helicopter.png', defaultSize: 0.15 },
    { id: 'jet', name: 'Private Jet', src: '/images/privatejet.png', defaultSize: 0.14 },
  ],
  kapal: [
    { id: 'ferry', name: 'Kapal Ferry', src: '/images/ship.png', defaultSize: 0.15 },
    { id: 'speedboat', name: 'Speedboat', src: '/images/speedboat.png', defaultSize: 0.12 },
  ]
};

const categories = [
  { id: 'motor', label: 'Motor', icon: Bike },
  { id: 'mobil', label: 'Mobil', icon: Car },
  { id: 'pesawat', label: 'Pesawat', icon: Plane },
  { id: 'kapal', label: 'Kapal Laut', icon: Ship },
  { id: 'custom', label: 'Custom', icon: ImageIcon }, // Pilihan upload sendiri
];

interface VehicleAvatarSelectProps {
  onModelChange: (src: string, size: number) => void;
  onSizeChange: (size: number) => void;
  onRotChange: (rotation: number) => void;
  onFlipChange: () => void;
  onLabelChange: (label: string) => void;
  onCustomUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  currentModelSrc: string;
  currentSize: number;
  currentRot: number;
  currentLabel: string;
  currentFlip: boolean;
}

export default function VehicleAvatarSelect({
  onModelChange, onSizeChange, onRotChange, onFlipChange, onLabelChange, onCustomUpload,
  currentModelSrc, currentSize, currentRot, currentLabel, currentFlip
}: VehicleAvatarSelectProps) {
  
  // Tentukan kategori aktif berdasarkan model yang sedang terpilih saat ini
  const [activeCategory, setActiveCategory] = useState(
    () => {
      for (const [category, models] of Object.entries(vehicleModels)) {
        if (models.some(m => m.src === currentModelSrc)) {
          return category;
        }
      }
      return 'motor'; // default
    }
  );

  // Ambil list model yang sesuai dengan kategori aktif
  const currentModels = useMemo(() => {
    return vehicleModels[activeCategory as keyof typeof vehicleModels] || [];
  }, [activeCategory]);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    if (category !== 'custom') {
      // Secara otomatis pilih model pertama dari kategori yang baru dipilih
      const firstModel = vehicleModels[category as keyof typeof vehicleModels][0];
      onModelChange(firstModel.src, firstModel.defaultSize);
    }
  };

  const handleModelSelect = (src: string, defaultSize: number) => {
    onModelChange(src, defaultSize);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl w-full max-w-sm space-y-6">
      
      {/* --- Bagian Ikon & Label (Yang Diperbarui) --- */}
      <div className="space-y-4">
        <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">Ikon & Label Kendaraan</label>
        
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-4">
          
          {/* Tabs Kategori Utama */}
          <div className="grid grid-cols-5 gap-1.5 p-1 bg-gray-100 rounded-xl">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg text-center transition ${activeCategory === cat.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                <cat.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Galeri Model / Avatar (Otomatis muncul berdasarkan kategori) */}
          {activeCategory !== 'custom' ? (
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500">Pilih Karakter Model</label>
              <div className="grid grid-cols-4 gap-3 pt-1">
                {currentModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.src, model.defaultSize)}
                    className={`group aspect-square rounded-xl border-2 p-1 transition overflow-hidden relative flex items-center justify-center ${currentModelSrc === model.src ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                  >
                    <img src={model.src} alt={model.name} className="w-full h-full object-contain p-0.5" />
                    {/* Tooltip on Hover */}
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">{model.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Form untuk Custom Upload
            <div className="pt-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                Upload Karakter Anda Sendiri (PNG Transparan)
              </label>
              <input type="file" onChange={onCustomUpload} className="w-full text-sm mt-1.5 file:mr-2 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            </div>
          )}
          
          {/* Label Teks (Opsi) */}
          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <Pencil className="w-3.5 h-3.5" />
              Teks Label (Opsional)
            </label>
            <input
              type="text"
              value={currentLabel}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder="Misal: 'Supra GTR'"
              className="w-full mt-1.5 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>
      </div>

      {/* --- Sliders & Flip (Existing from screenshot, just styled) --- */}
      <div className="space-y-4 pt-4 border-t border-gray-100">
        <div className="space-y-3">
          <label className="text-sm font-semibold flex items-center justify-between">
            Ukuran Model
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{currentSize.toFixed(2)}</span>
          </label>
          <input
            type="range" min="0.05" max="0.5" step="0.01" value={currentSize}
            onChange={(e) => onSizeChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
        
        <div className="space-y-3">
          <label className="text-sm font-semibold flex items-center justify-between">
            Rotasi
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{currentRot}°</span>
          </label>
          <input
            type="range" min="-180" max="180" step="1" value={currentRot}
            onChange={(e) => onRotChange(parseInt(e.target.value))}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
        
        <div className="flex items-center justify-between gap-3 pt-2">
          <label className="text-sm font-semibold">Arah Hadap</label>
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button onClick={onFlipChange} className={`px-5 py-2 text-sm font-semibold rounded-lg transition ${!currentFlip ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Kiri</button>
            <button onClick={onFlipChange} className={`px-5 py-2 text-sm font-semibold rounded-lg transition ${currentFlip ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Kanan</button>
          </div>
        </div>
      </div>
    </div>
  );
}