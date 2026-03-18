"use client";

import React, { useMemo } from 'react';
import { Bike, Car, Plane, Ship, Image as ImageIcon, ArrowLeft, ArrowRight, Sparkles, Pencil } from 'lucide-react';

// --- DATA MOCK KENDARAAN (AVATAR) ---
export const VEHICLE_OPTIONS: Record<string, any> = {
  motor: {
    label: 'Motor',
    icon: Bike,
    variants: [
      { name: 'Motor 1', url: '/motor1.png', size: 0.15, rot: -90 },
      { name: 'Motor 2', url: '/motor2.png', size: 0.15, rot: -90 },
    ]
  },
  mobil: {
    label: 'Mobil',
    icon: Car,
    variants: [
      { name: 'Mobil 1', url: '/mobil1.png', size: 0.12, rot: 0 },
      { name: 'Mobil 2', url: '/mobil2.png', size: 0.12, rot: 0 },
      { name: 'Mobil 3', url: '/mobil3.png', size: 0.12, rot: 0 },
    ]
  },
  pesawat: {
    label: 'Pesawat',
    icon: Plane,
    variants: [
      { name: 'Pesawat 1', url: '/pesawat1.png', size: 0.15, rot: 90 },
      { name: 'Pesawat 2', url: '/pesawat2.png', size: 0.15, rot: 90 },
    ]
  },
  kapal: {
    label: 'Kapal',
    icon: Ship,
    variants: [
      { name: 'Kapal 1', url: '/kapal1.png', size: 0.15, rot: 0 },
      { name: 'Kapal 2', url: '/kapal2.png', size: 0.15, rot: 0 },
    ]
  }
};

interface VehicleSettingsProps {
  vehicleCategory: string;
  onCategoryChange: (val: string) => void;
  vehicleType: string;
  onVehicleChange: (val: string) => void;
  customLabel: string;
  onLabelChange: (val: string) => void;
  modelSize: number;
  onSizeChange: (val: number) => void;
  rotationUI: number;
  onRotationChange: (val: number) => void;
  isFlipped: boolean;
  onFlipChange: () => void;
  isPlaying: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function VehicleSettings({
  vehicleCategory, onCategoryChange,
  vehicleType, onVehicleChange,
  customLabel, onLabelChange,
  modelSize, onSizeChange,
  rotationUI, onRotationChange,
  isFlipped, onFlipChange,
  isPlaying, onFileUpload
}: VehicleSettingsProps) {

  // Mengambil daftar varian/avatar berdasarkan kategori yang aktif
  const currentVariants = useMemo(() => {
    if (vehicleCategory === 'custom') return [];
    return VEHICLE_OPTIONS[vehicleCategory]?.variants || [];
  }, [vehicleCategory]);

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col gap-4 shadow-sm w-full box-border relative">
      
      {/* OVERLAY: Mencegah klik saat animasi jalan */}
      {isPlaying && <div className="absolute inset-0 bg-white/50 z-10 rounded-2xl cursor-not-allowed"></div>}

      {/* --- 1. TABS KATEGORI UTAMA --- */}
      <div className="w-full">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ikon Kendaraan</label>
        <div className="grid grid-cols-5 gap-1.5 mt-2 bg-gray-100 p-1.5 rounded-xl">
          {Object.entries(VEHICLE_OPTIONS).map(([key, data]) => {
            const Icon = data.icon;
            const isActive = vehicleCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onCategoryChange(key)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  isActive ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px] font-bold tracking-tight truncate w-full text-center">{data.label}</span>
              </button>
            );
          })}
          
          {/* Tab Custom */}
          <button
            type="button"
            onClick={() => onCategoryChange('custom')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
              vehicleCategory === 'custom' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span className="text-[9px] font-bold tracking-tight truncate w-full text-center">Custom</span>
          </button>
        </div>
      </div>

      {/* --- 2. GRID AVATAR KENDARAAN --- */}
      <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 border-dashed">
        {vehicleCategory !== 'custom' ? (
          <div className="w-full">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Pilih Model</label>
            <div className="grid grid-cols-4 gap-2">
              {currentVariants.map((variant: any, idx: number) => {
                const isSelected = vehicleType === variant.url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onVehicleChange(variant.url)}
                    className={`group relative aspect-square rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden bg-white ${
                      isSelected ? 'border-blue-500 shadow-md ring-2 ring-blue-100' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    {/* Gambar Avatar Kendaraan */}
                    {/* Pastikan gambar ini sudah ada di folder public Anda! */}
                    <img 
                      src={variant.url} 
                      alt={variant.name} 
                      className={`w-full h-full object-contain p-1.5 transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`} 
                    />
                    
                    {/* Tooltip Nama Kendaraan */}
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent pt-4 pb-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-[8px] font-bold text-white block truncate leading-tight drop-shadow-md">{variant.name}</span>
                    </div>

                    {/* Checkmark jika terpilih */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-blue-500 rounded-full w-3 h-3 flex items-center justify-center shadow-sm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-2 h-2 text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          // --- 3. OPSI UPLOAD CUSTOM ---
          <div className="w-full text-center py-2">
            <Sparkles className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-2">Upload PNG Sendiri</label>
            <input 
              type="file" accept="image/*" 
              onChange={onFileUpload} 
              disabled={isPlaying} 
              className="w-full text-[11px] file:mr-2 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer bg-white border border-gray-200 rounded-full p-1" 
            />
          </div>
        )}
      </div>

      {/* --- 4. LABEL TEKS --- */}
      <div className="w-full pt-1">
        <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <Pencil className="w-3 h-3" /> Teks Bubble (Opsional)
        </label>
        <input 
          type="text" 
          value={customLabel} 
          onChange={(e) => onLabelChange(e.target.value)} 
          placeholder="Misal: Mudik 2026!" 
          className="w-full mt-1.5 px-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium transition-all" 
        />
      </div>

      {/* --- 5. PENGATURAN TRANSFORMASI (UKURAN & ROTASI) --- */}
      <div className="flex gap-4 mt-2 w-full px-1">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] font-bold text-gray-500">Ukuran</label>
            <span className="text-[9px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{modelSize.toFixed(2)}</span>
          </div>
          <input type="range" min="0.05" max="0.6" step="0.01" value={modelSize} onChange={(e) => onSizeChange(parseFloat(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] font-bold text-gray-500">Rotasi</label>
            <span className="text-[9px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{rotationUI}°</span>
          </div>
          <input type="range" min="-180" max="180" step="1" value={rotationUI} onChange={(e) => onRotationChange(parseInt(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
        </div>
      </div>
      
      {/* --- 6. ARAH HADAP --- */}
      <div className="pt-4 border-t border-gray-100 mt-1 flex items-center justify-between w-full px-1">
        <label className="text-[10px] font-bold text-gray-500">Arah Hadap Muka</label>
        <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl">
          <button 
            type="button" 
            onClick={() => { if(!isFlipped) onFlipChange(); }} 
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 min-w-17.5 ${isFlipped ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <ArrowLeft className="w-3 h-3"/> Kiri
          </button>
          <button 
            type="button" 
            onClick={() => { if(isFlipped) onFlipChange(); }} 
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 min-w-17.5 ${!isFlipped ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Kanan <ArrowRight className="w-3 h-3"/>
          </button>
        </div>
      </div>

    </div>
  );
}