"use client";

import { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent'; // Sesuaikan path import
import { Bike } from 'lucide-react'; // Menggunakan ikon motor lucide

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Tahan splash screen selama 2.5 detik agar peta sempat termuat di belakang
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="relative w-full h-screen bg-[#111827] overflow-hidden">
      
      {/* --- ANIMASI LOADING (SPLASH SCREEN) --- */}
      <div 
        className={`absolute inset-0 z-100 flex flex-col items-center justify-center bg-[#111827] transition-all duration-1000 ease-in-out ${
          showSplash ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-12 invisible'
        }`}
      >
        <div className="flex flex-col items-center justify-center animate-pulse">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
              Gass<span className="text-blue-500">Mudik</span>
            </h1>
            <Bike className="w-12 h-12 md:w-16 md:h-16 text-blue-500" />
          </div>
          
          {/* Indikator Titik Loading */}
          <div className="flex items-center gap-2 mt-4">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          
          <p className="text-gray-500 mt-4 text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase">
            Menyiapkan Peta Perjalanan...
          </p>
        </div>
      </div>

      {/* --- PETA UTAMA --- */}
      <MapComponent />
      
    </main>
  );
}