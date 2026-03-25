"use client";
import React from 'react';
import { X } from 'lucide-react';

interface VideoSettingsProps {
  duration: number;
  onDurationChange: (val: number) => void;
  resolution: string;
  onResolutionChange: (val: string) => void;
  endImage: string | null;
  onEndImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveEndImage: () => void;
  isPlaying: boolean;
}

export default function VideoSettings({
  duration, onDurationChange,
  resolution, onResolutionChange,
  endImage, onEndImageChange, onRemoveEndImage,
  isPlaying
}: VideoSettingsProps) {
  return (
    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col gap-3 shadow-sm mt-1">
      <div>
        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Format Video Peta</label>
        <div className="flex gap-2 mt-1.5">
          <select 
            value={resolution} 
            onChange={(e) => onResolutionChange(e.target.value)} 
            disabled={isPlaying} 
            className="flex-1 px-3 py-2 bg-white border border-gray-200 text-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold cursor-pointer"
          >
            <option value="full">Layar Penuh</option>
            <option value="9:16">TikTok / Reels (9:16)</option>
            <option value="16:9">YouTube (16:9)</option>
            <option value="1:1">Instagram (1:1)</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 mt-1">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] font-bold text-gray-500">Durasi Perjalanan</label>
            <span className="text-[10px] font-bold text-blue-600">{duration} Detik</span>
          </div>
          <input 
            type="range" min="15" max="45" step="1" 
            value={duration} 
            onChange={(e) => onDurationChange(parseInt(e.target.value))} 
            disabled={isPlaying} 
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
          />
        </div>
      </div>

      <div className="mt-1">
         <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gambar Akhir Video (Opsional)</label>
         {endImage ? (
             <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 text-xs text-green-700 font-bold bg-green-50 py-2 px-3 rounded-lg border border-green-200 flex items-center gap-2 shadow-sm">
                  ✓ Gambar Penutup Tersimpan
                </div>
                <button type="button" onClick={onRemoveEndImage} className="p-2 bg-white text-red-500 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-all shadow-sm active:scale-95">
                    <X className="w-4 h-4"/>
                </button>
             </div>
         ) : (
             <input 
               type="file" 
               accept="image/*"
               onChange={onEndImageChange} 
               disabled={isPlaying} 
               className="w-full text-[11px] mt-1.5 file:mr-2 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer bg-white border border-gray-200 rounded-full p-1" 
             />
         )}
      </div>
    </div>
  );
}