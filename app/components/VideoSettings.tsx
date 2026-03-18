// src/app/components/VideoSettings.tsx
"use client";
import React from 'react';

interface VideoSettingsProps {
  duration: number;
  onDurationChange: (val: number) => void;
  resolution: string;
  onResolutionChange: (val: string) => void;
  watermark: string;
  onWatermarkChange: (val: string) => void;
  isPlaying: boolean;
}

export default function VideoSettings({
  duration, onDurationChange,
  resolution, onResolutionChange,
  watermark, onWatermarkChange,
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
            type="range" min="3" max="30" step="1" 
            value={duration} 
            onChange={(e) => onDurationChange(parseInt(e.target.value))} 
            disabled={isPlaying} 
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
          />
        </div>
      </div>

      <div className="mt-1">
         <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Watermark Teks (Di Video)</label>
         <input 
           type="text" 
           value={watermark} 
           onChange={(e) => onWatermarkChange(e.target.value)} 
           disabled={isPlaying} 
           placeholder="Misal: @username_tiktok" 
           className="w-full mt-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs" 
         />
      </div>
    </div>
  );
}