// src/app/components/ActionControls.tsx
"use client";

import React from 'react';
import { Rocket, Video, RefreshCw } from 'lucide-react';

interface ActionControlsProps {
  isPlaying: boolean;
  isFinished: boolean;
  isLoading: boolean;
  onPlay: () => void;
  onRecord: () => void;
}

export default function ActionControls({ isPlaying, isFinished, isLoading, onPlay, onRecord }: ActionControlsProps) {
  
  if (isPlaying) return null; 

  if (isFinished) {
    return (
      <button 
        type="button" 
        onClick={onPlay} 
        className="mt-3 w-full py-3.5 rounded-xl text-sm font-black text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-4 h-4" /> Ulangi Perjalanan
      </button>
    );
  }

  return (
    <div className="flex gap-2 mt-3">
      <button 
        type="button" 
        onClick={onPlay} 
        disabled={isLoading} 
        className={`flex-1 py-3.5 rounded-xl text-sm font-black text-white transition-all shadow-lg flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-500/30'}`}
      >
        <Rocket className="w-4 h-4" /> {isLoading ? 'Loading...' : 'Gass!'}
      </button>
      <button 
        type="button" 
        onClick={onRecord} 
        disabled={isLoading} 
        className={`flex-1 py-3.5 rounded-xl text-sm font-black text-white transition-all shadow-lg flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 active:scale-95 shadow-red-500/30'}`}
      >
        <Video className="w-4 h-4" /> {isLoading ? 'Loading...' : 'Rekam Video'}
      </button>
    </div>
  );
}