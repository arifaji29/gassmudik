"use client";

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';

// Import Ikon Lucide React (Mengganti Route menjadi Bike)
import { Bike, Image as ImageIcon, ZoomIn, ZoomOut, Scissors, Plus, X, Video, ArrowLeftRight, ArrowRight } from 'lucide-react';

import CityInput from './CityInput'; 
import VehicleSettings, { VEHICLE_OPTIONS } from './VehicleSettings';
import VideoSettings from './VideoSettings';
import { getProcessedImageData, getCoordinates } from '../utils/mapUtils';

export default function MapComponent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const animationRef = useRef<number | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  
  const distanceRef = useRef<HTMLDivElement>(null);
  const vehicleLabelMarkerRef = useRef<maplibregl.Marker | null>(null); 

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // State Form Map
  const [asal, setAsal] = useState('Jakarta');
  const [tujuan, setTujuan] = useState('Surabaya');
  const [titikSinggah, setTitikSinggah] = useState<string[]>([]); 
  
  // State Kendaraan
  const [vehicleCategory, setVehicleCategory] = useState('motor'); 
  const [vehicleType, setVehicleType] = useState('/vario.png'); 
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [modelSize, setModelSize] = useState(0.15); 
  const [rotationUI, setRotationUI] = useState(-90);
  const [isFlipped, setIsFlipped] = useState(false); 
  const [customLabel, setCustomLabel] = useState('');
  
  // STATE PENGATURAN VIDEO
  const [videoDuration, setVideoDuration] = useState(8); 
  const [videoResolution, setVideoResolution] = useState('full');
  const [watermark, setWatermark] = useState('');

  const customLabelRef = useRef(''); 
  const rotationOffsetRef = useRef(-90); 
  const currentBearingRef = useRef(0); // 👈 Menyimpan bearing terakhir untuk rotasi real-time
  const estimasiWaktuRef = useRef<string | null>(null); // 👈 Menyimpan waktu agar bisa disablon ke video
  
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [tempFile, setTempFile] = useState<File | null>(null); 
  const [bgWarningOpen, setBgWarningOpen] = useState(false); 
  const [editorOpen, setEditorOpen] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [isEditorFlipped, setIsEditorFlipped] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); 
  const [isFinished, setIsFinished] = useState(false); 
  const [estimasiWaktu, setEstimasiWaktu] = useState<string | null>(null);

  // --- INIT MAP ---
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return; 
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [108.5, -6.8], zoom: 6, pitch: 45, bearing: 0,
      attributionControl: false,
      preserveDrawingBuffer: true 
    } as any);
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
  }, []);

  useEffect(() => {
    if (mapRef.current) setTimeout(() => mapRef.current?.resize(), 400); 
  }, [videoResolution]);

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.hasImage('vehicle-icon')) return;
    const updateIcon = async () => {
      const activeImageUrl = (vehicleCategory === 'custom' && customImage) ? customImage : vehicleType;
      if (!activeImageUrl) return;
      try {
        const imageData = await getProcessedImageData(activeImageUrl, isFlipped);
        if (mapRef.current?.hasImage('vehicle-icon')) mapRef.current.updateImage('vehicle-icon', imageData);
      } catch (e) {}
    };
    updateIcon();
  }, [vehicleType, customImage, isFlipped, vehicleCategory]);

  useEffect(() => {
    const el = vehicleLabelMarkerRef.current?.getElement();
    if (el) {
      if (customLabel.trim() === '') el.style.display = 'none';
      else { el.style.display = 'block'; el.innerText = customLabel; }
    }
  }, [customLabel]);

  // --- HANDLER UI KENDARAAN (Ditambahkan Update Realtime ke Map Layer) ---
  const handleCategoryChange = (category: string) => {
    setVehicleCategory(category);
    setIsFlipped(false);
    if (category !== 'custom') {
      const firstVariant = VEHICLE_OPTIONS[category].variants[0];
      setVehicleType(firstVariant.url);
      setModelSize(firstVariant.size);
      setRotationUI(firstVariant.rot);
      rotationOffsetRef.current = firstVariant.rot;
      if (mapRef.current?.getLayer('motor-layer')) {
          mapRef.current.setLayoutProperty('motor-layer', 'icon-size', firstVariant.size);
          mapRef.current.setLayoutProperty('motor-layer', 'icon-rotate', currentBearingRef.current + firstVariant.rot);
      }
    }
    if (isFinished) setIsFinished(false);
  };

  const handleVehicleChange = (variantUrl: string) => {
    setVehicleType(variantUrl);
    setIsFlipped(false);
    const categoryData = VEHICLE_OPTIONS[vehicleCategory];
    const variantData = categoryData?.variants.find((v: any) => v.url === variantUrl);
    if (variantData) {
      setModelSize(variantData.size);
      setRotationUI(variantData.rot);
      rotationOffsetRef.current = variantData.rot;
      if (mapRef.current?.getLayer('motor-layer')) {
          mapRef.current.setLayoutProperty('motor-layer', 'icon-size', variantData.size);
          mapRef.current.setLayoutProperty('motor-layer', 'icon-rotate', currentBearingRef.current + variantData.rot);
      }
    }
    if (isFinished) setIsFinished(false);
  };

  const handleLabelChange = (val: string) => { setCustomLabel(val); customLabelRef.current = val; };
  const handleSizeChange = (val: number) => { 
      setModelSize(val); 
      if (mapRef.current?.getLayer('motor-layer')) mapRef.current.setLayoutProperty('motor-layer', 'icon-size', val); 
  };
  const handleRotationChange = (val: number) => { 
      setRotationUI(val); 
      rotationOffsetRef.current = val; 
      // Update Realtime saat start/finish
      if (mapRef.current?.getLayer('motor-layer')) {
          mapRef.current.setLayoutProperty('motor-layer', 'icon-rotate', currentBearingRef.current + val);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setTempFile(file); setBgWarningOpen(true); } e.target.value = ''; };
  
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => { setIsDragging(true); const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX; const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY; setDragStart({ x: clientX - pan.x, y: clientY - pan.y }); };
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => { if (!isDragging) return; const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX; const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY; setPan({ x: clientX - dragStart.x, y: clientY - dragStart.y }); };
  const handleMouseUp = () => setIsDragging(false);

  const proceedToCrop = () => { if (tempFile) { const reader = new FileReader(); reader.onload = (event) => { setRawImage(event.target?.result as string); setPan({ x: 0, y: 0 }); setZoom(1); setIsEditorFlipped(false); setBgWarningOpen(false); setEditorOpen(true); }; reader.readAsDataURL(tempFile); } };
  const goToRemoveBg = () => { window.open('https://www.remove.bg', '_blank'); setBgWarningOpen(false); setTempFile(null); };

  const processAndSaveImage = () => {
    if (!rawImage) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const CROP_SIZE = 256; canvas.width = CROP_SIZE; canvas.height = CROP_SIZE;
      const baseScale = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height); const currentScale = baseScale * zoom;
      const drawWidth = img.width * currentScale; const drawHeight = img.height * currentScale;
      const x = (CROP_SIZE - drawWidth) / 2 + pan.x; const y = (CROP_SIZE - drawHeight) / 2 + pan.y;
      
      if (isEditorFlipped) { ctx?.translate(CROP_SIZE, 0); ctx?.scale(-1, 1); ctx?.drawImage(img, CROP_SIZE - x - drawWidth, y, drawWidth, drawHeight); } 
      else { ctx?.drawImage(img, x, y, drawWidth, drawHeight); }
      
      setCustomImage(canvas.toDataURL('image/png', 0.9));
      setIsFlipped(false); setEditorOpen(false); setTempFile(null); 
      if (isFinished) setIsFinished(false);
    };
    img.src = rawImage;
  };

  // --- CORE ENGINE: MUDIK ANIMATION & RECORDING ---
  async function handleGassMudik(shouldRecord: boolean = false) {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    setIsLoading(true); setIsFinished(false); setIsRecording(shouldRecord);
    if (distanceRef.current) distanceRef.current.innerText = "0.0 KM"; 
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    try {
      const startCoord = await getCoordinates(asal);
      const endCoord = await getCoordinates(tujuan);
      const validWaypoints = titikSinggah.filter(wp => wp.trim() !== '');
      const waypointCoords: [number, number][] = [];
      for (const wp of validWaypoints) waypointCoords.push(await getCoordinates(wp));

      const allCoords = [startCoord, ...waypointCoords, endCoord];
      const allNames = [asal, ...validWaypoints, tujuan];

      let routeFeature: any; 
      if (allCoords.length === 2) routeFeature = turf.lineString((turf.greatCircle(allCoords[0], allCoords[1])).geometry.coordinates as [number, number][]);
      else routeFeature = turf.bezierSpline(turf.lineString(allCoords), { resolution: 10000, sharpness: 0.6 });

      const distanceInKm = turf.length(routeFeature, { units: 'kilometers' });
      const jam = Math.floor(distanceInKm / 60); const menit = Math.floor(((distanceInKm / 60) - jam) * 60);
      const estimasiStr = jam > 0 ? `${jam} Jam ${menit} Menit` : `${menit} Menit`;
      setEstimasiWaktu(estimasiStr);
      estimasiWaktuRef.current = estimasiStr; // 👈 Simpan ke ref untuk sablon video

      markersRef.current.forEach(m => m.remove()); markersRef.current = [];
      allCoords.forEach((coord, index) => {
        let color = index === 0 ? '#3b82f6' : index === allCoords.length - 1 ? '#22c55e' : '#f97316'; 
        const el = document.createElement('div'); el.style.cssText = 'display:flex; align-items:center; gap:6px;';
        const dot = document.createElement('div'); dot.style.cssText = `width:12px; height:12px; background-color:${color}; border-radius:50%; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);`;
        const label = document.createElement('div'); label.textContent = allNames[index]; label.style.cssText = `background:white; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold; color:#1f2937; border:1px solid ${color};`;
        el.appendChild(dot); el.appendChild(label);
        markersRef.current.push(new maplibregl.Marker({ element: el, anchor: 'left' }).setLngLat(coord).addTo(map));
      });

      if (vehicleLabelMarkerRef.current) vehicleLabelMarkerRef.current.remove();
      const bubbleEl = document.createElement('div'); bubbleEl.className = 'custom-chat-bubble'; bubbleEl.innerText = customLabelRef.current; bubbleEl.style.display = customLabelRef.current.trim() === '' ? 'none' : 'block';
      vehicleLabelMarkerRef.current = new maplibregl.Marker({ element: bubbleEl, anchor: 'bottom', offset: [0, -35] }).setLngLat(startCoord).addTo(map);

      const activeImageUrl = (vehicleCategory === 'custom' && customImage) ? customImage : vehicleType;
      const imageData = await getProcessedImageData(activeImageUrl, isFlipped);
      const imageId = 'vehicle-icon'; 

      if (map.hasImage(imageId)) map.updateImage(imageId, imageData); else map.addImage(imageId, imageData);

      if (map.getSource('route')) (map.getSource('route') as maplibregl.GeoJSONSource).setData(routeFeature);
      else {
        map.addSource('route', { type: 'geojson', data: routeFeature });
        map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ef4444', 'line-width': 5, 'line-opacity': 0.8 } });
      }

      const point = turf.point(routeFeature.geometry.coordinates[0] as [number, number]);
      if (map.getSource('motor')) {
        (map.getSource('motor') as maplibregl.GeoJSONSource).setData(point);
        map.setLayoutProperty('motor-layer', 'icon-image', imageId); map.setLayoutProperty('motor-layer', 'icon-size', modelSize);
      } else {
        map.addSource('motor', { type: 'geojson', data: point });
        map.addLayer({ id: 'motor-layer', type: 'symbol', source: 'motor', layout: { 'icon-image': imageId, 'icon-size': modelSize, 'icon-allow-overlap': true, 'icon-rotation-alignment': 'map' } });
      }

      // --- LOGIKA COMPOSITING & PEREKAMAN MP4 / WEBM ---
      let exportCtx: CanvasRenderingContext2D | null = null;
      let exportCanvas: HTMLCanvasElement | null = null;
      const dpr = window.devicePixelRatio || 1;

      if (shouldRecord) {
        try {
          const mapCanvas = map.getCanvas();
          exportCanvas = document.createElement('canvas');
          exportCanvas.width = mapCanvas.width; exportCanvas.height = mapCanvas.height;
          exportCtx = exportCanvas.getContext('2d');

          const stream = exportCanvas.captureStream(30);
          recordedChunksRef.current = [];
          
          let mimeType = 'video/webm; codecs=vp9'; let extension = 'webm';
          if (MediaRecorder.isTypeSupported('video/mp4')) { mimeType = 'video/mp4'; extension = 'mp4'; } 
          else if (!MediaRecorder.isTypeSupported('video/webm; codecs=vp9') && MediaRecorder.isTypeSupported('video/webm')) { mimeType = 'video/webm'; }

          mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current.ondataavailable = (event) => { if (event.data && event.data.size > 0) recordedChunksRef.current.push(event.data); };
          mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: mimeType });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.style.display = 'none'; a.href = url;
            a.download = `GassMudik-${asal}-${tujuan}.${extension}`; 
            document.body.appendChild(a); a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
            setIsRecording(false);
          };
        } catch (err) { console.error(err); alert("Browser ini tidak mendukung fitur rekam video otomatis."); setIsRecording(false); shouldRecord = false; }
      }

      setIsLoading(false); setIsPlaying(true); setIsFormExpanded(false); 

      // Menerbangkan Kamera Dulu (2 Detik)
      map.flyTo({ center: startCoord, zoom: 8, pitch: 50, duration: 2000 });
      
      let startTime: number | null = null;
      const lineDistance = turf.length(routeFeature);
      let hasTriggeredFinishUI = false;

      // --- ANIMASI TIME-BASED (Akurat berapapun FPS-nya) ---
      function animate(timestamp: number) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        
        // Progress dibatasi di 1 agar berhenti di ujung garis
        let progress = elapsed / (videoDuration * 1000);
        const isAnimationDone = progress >= 1;
        progress = Math.min(progress, 1);
        
        const currentDistance = progress * lineDistance;

        const currentPoint = turf.along(routeFeature, currentDistance, { units: 'kilometers' });
        let targetDistance = currentDistance + 2; if (targetDistance > lineDistance) targetDistance = lineDistance;
        const nextPoint = turf.along(routeFeature, targetDistance, { units: 'kilometers' });
        const bearing = turf.bearing(currentPoint, nextPoint);
        
        currentBearingRef.current = bearing; // 👈 Simpan agar UI Rotasi tetap bisa update realtime ketika finish

        (map.getSource('motor') as maplibregl.GeoJSONSource).setData(currentPoint);
        map.setLayoutProperty('motor-layer', 'icon-rotate', bearing + rotationOffsetRef.current); 
        map.panTo(currentPoint.geometry.coordinates as [number, number], { duration: 0 });

        if (vehicleLabelMarkerRef.current) vehicleLabelMarkerRef.current.setLngLat(currentPoint.geometry.coordinates as [number, number]);
        if (distanceRef.current) distanceRef.current.innerText = `${currentDistance.toFixed(1)} KM`;

        // --- SABLON LAYER KE CANVAS REKAMAN (Real-time Overlay Compositing) ---
        if (shouldRecord && exportCtx && exportCanvas) {
          const mapCanvas = map.getCanvas();
          exportCtx.drawImage(mapCanvas, 0, 0); 
          
          // Sablon Rute & Label Kota
          allCoords.forEach((coord, i) => {
             const pos = map.project(coord as [number, number]);
             const x = pos.x * dpr; const y = pos.y * dpr;
             const color = i === 0 ? '#3b82f6' : i === allCoords.length - 1 ? '#22c55e' : '#f97316';
             
             exportCtx!.beginPath(); exportCtx!.arc(x, y, 6 * dpr, 0, 2 * Math.PI);
             exportCtx!.fillStyle = color; exportCtx!.fill();
             exportCtx!.lineWidth = 2 * dpr; exportCtx!.strokeStyle = 'white'; exportCtx!.stroke();

             const text = allNames[i];
             exportCtx!.font = `bold ${11 * dpr}px sans-serif`;
             const tw = exportCtx!.measureText(text).width;
             exportCtx!.fillStyle = 'white'; exportCtx!.fillRect(x + 12 * dpr, y - 10 * dpr, tw + 8 * dpr, 20 * dpr);
             exportCtx!.fillStyle = '#1f2937'; exportCtx!.fillText(text, x + 16 * dpr, y + 4 * dpr);
          });

          // Sablon Bubble Chat Kendaraan
          if (customLabelRef.current.trim() !== '') {
             const vehPos = map.project(currentPoint.geometry.coordinates as [number, number]);
             const vx = vehPos.x * dpr; const vy = (vehPos.y - 35) * dpr;
             const text = customLabelRef.current;
             exportCtx.font = `900 ${12 * dpr}px sans-serif`;
             const tw = exportCtx.measureText(text).width;
             
             exportCtx.fillStyle = 'white'; exportCtx.fillRect(vx - tw/2 - 10*dpr, vy - 14*dpr, tw + 20*dpr, 20*dpr);
             exportCtx.lineWidth = 1.5 * dpr; exportCtx.strokeStyle = '#e5e7eb'; exportCtx.strokeRect(vx - tw/2 - 10*dpr, vy - 14*dpr, tw + 20*dpr, 20*dpr);
             exportCtx.fillStyle = '#1f2937'; exportCtx.textAlign = 'center'; exportCtx.fillText(text, vx, vy + 4*dpr); exportCtx.textAlign = 'left';
          }

          // Sablon Indikator Jarak Real-time (dan Waktu di Akhir)
          const distText = `${currentDistance.toFixed(1)} KM`;
          exportCtx.font = `900 ${24 * dpr}px sans-serif`;
          const distW = exportCtx.measureText(distText).width;
          
          let boxWidth = distW + 40 * dpr;
          let boxHeight = 50 * dpr;

          // 👈 Tampilkan Estimasi Waktu ke dalam Video Sablon jika sudah Finish (Progress 100%)
          if (progress >= 1 && estimasiWaktuRef.current) {
              exportCtx.font = `bold ${14 * dpr}px sans-serif`;
              const timeText = `Waktu: ${estimasiWaktuRef.current}`;
              const timeW = exportCtx.measureText(timeText).width;
              boxWidth = Math.max(boxWidth, timeW + 40 * dpr);
              boxHeight = 85 * dpr;
          }

          exportCtx.fillStyle = 'rgba(255,255,255,0.9)';
          exportCtx.fillRect(exportCanvas.width - boxWidth - 10*dpr, exportCanvas.height - boxHeight - 10*dpr, boxWidth, boxHeight);
          exportCtx.fillStyle = '#1f2937';
          exportCtx.textAlign = 'right';
          exportCtx.fillText(distText, exportCanvas.width - 25*dpr, exportCanvas.height - boxHeight + 35*dpr);
          
          if (progress >= 1 && estimasiWaktuRef.current) {
              exportCtx.font = `bold ${14 * dpr}px sans-serif`;
              exportCtx.fillStyle = '#16a34a'; 
              exportCtx.fillText(`Waktu: ${estimasiWaktuRef.current}`, exportCanvas.width - 25*dpr, exportCanvas.height - 25*dpr);
          }
          exportCtx.textAlign = 'left'; // reset format

          // Sablon Watermark
          if (watermark) {
             exportCtx.font = `bold ${32 * dpr}px sans-serif`; exportCtx.fillStyle = "rgba(255, 255, 255, 0.8)";
             exportCtx.shadowColor = "rgba(0, 0, 0, 0.5)"; exportCtx.shadowBlur = 4 * dpr;
             exportCtx.fillText(watermark, 30 * dpr, exportCanvas.height - 40 * dpr);
             exportCtx.shadowBlur = 0; 
          }
        }
        // ------------------------------------------------------------------

        // Total durasi (tambah 3 detik jika sedang merekam)
        const totalDurationMs = shouldRecord ? (videoDuration * 1000) + 3000 : (videoDuration * 1000);

        if (elapsed < totalDurationMs) {
          // Jika animasi sampai di tujuan, trigger UI "Finish" untuk memunculkan teks Waktu, tapi JANGAN stop video!
          if (isAnimationDone && !hasTriggeredFinishUI) {
              setIsPlaying(false);
              setIsFinished(true);
              setIsFormExpanded(true); 
              hasTriggeredFinishUI = true;
          }
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // SELESAI TOTAL 
          if (!hasTriggeredFinishUI) {
              setIsPlaying(false); setIsFinished(true); setIsFormExpanded(true); 
              hasTriggeredFinishUI = true;
          }
          if (shouldRecord && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
          }
        }
      }
      
      // Tunggu flyTo selesai (2 Detik), baru mulai bergerak dan merekam!
      setTimeout(() => {
        if (shouldRecord && mediaRecorderRef.current) mediaRecorderRef.current.start();
        animationRef.current = requestAnimationFrame(animate);
      }, 2000);

    } catch (error: any) { alert(error.message); setIsLoading(false); setIsPlaying(false); setIsRecording(false); } 
  }

  return (
    <div className="relative w-screen h-screen bg-[#111827] overflow-hidden flex items-center justify-center">
      
      <div 
        className={`relative transition-all duration-700 ease-in-out bg-gray-800 ${
          videoResolution === '9:16' ? 'w-90 h-160 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]' :
          videoResolution === '16:9' ? 'w-213.5 h-120 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]' :
          videoResolution === '1:1' ? 'w-125 h-125 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]' :
          'w-full h-full'
        }`}
      >
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
        {watermark && <div className="absolute bottom-6 left-6 z-30 text-white/70 font-black text-2xl drop-shadow-md pointer-events-none">{watermark}</div>}
      </div>

    {/* --- PANEL JARAK REAL-TIME --- */}
      {(isPlaying || isFinished) && (
        <div className="absolute top-6 left-6 md:top-auto md:bottom-10 md:left-auto md:right-6 z-40 bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl border border-white/50 flex flex-col items-start md:items-end transition-all">
          {isRecording && (<div className="absolute -top-3 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse shadow-lg"><div className="w-1.5 h-1.5 bg-white rounded-full"></div> REC</div>)}
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Jarak Tempuh</span>
          <div className="text-2xl font-black text-gray-800 tracking-tighter" ref={distanceRef}>0.0 KM</div>
          
          {/* MUNCUL HANYA KETIKA SUDAH SELESAI */}
          {isFinished && estimasiWaktu && (
             <div className="mt-1 text-sm font-bold text-green-600 animate-fade-in">Waktu: {estimasiWaktu}</div>
          )}
        </div>
      )}
      {/* --- TOMBOL REKAM (Di Luar Card, Pojok Kanan Atas) --- */}
      {!isPlaying && !isRecording && (
          <button 
              type="button" 
              onClick={() => handleGassMudik(true)} 
              disabled={isLoading} 
              className={`absolute top-6 right-6 z-40 px-5 py-3 rounded-2xl text-sm font-black text-white transition-all shadow-2xl flex items-center justify-center gap-2 border border-white/20 backdrop-blur-sm ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500/90 hover:bg-red-600 active:scale-95'}`}
          >
              <Video className="w-5 h-5" /> {isLoading ? 'Menyiapkan...' : 'Rekam Video'}
          </button>
      )}

      {bgWarningOpen && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-80 text-center border border-white/20">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-blue-500" />
            <h2 className="text-xl font-black text-gray-800 mb-2">Tips Custom Ikon</h2>
            <p className="text-sm text-gray-600 mb-6">Agar terlihat bagus, pastikan foto Anda <b>tidak memiliki background (format PNG transparan)</b>.</p>
            <div className="flex flex-col gap-2">
              <button onClick={proceedToCrop} className="w-full py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95">Lanjut (Sudah PNG)</button>
              <button onClick={goToRemoveBg} className="w-full py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                <Scissors className="w-4 h-4" /> Hapus Background Dulu
              </button>
              <button onClick={() => { setBgWarningOpen(false); setTempFile(null); }} className="text-xs font-bold text-gray-400 mt-2 hover:text-gray-600 underline">Batal</button>
            </div>
          </div>
        </div>
      )}

      {editorOpen && rawImage && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchMove={handleTouchMove => handleMouseMove(handleTouchMove)} onTouchEnd={handleMouseUp}>
          <div className="bg-white p-5 rounded-3xl shadow-2xl w-80 text-center border border-white/20 relative">
            <button onClick={() => { setEditorOpen(false); setTempFile(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-all"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-black text-gray-800 mb-1">Posisikan Ikon</h2>
            <p className="text-xs text-gray-500 mb-4">Geser & atur ukuran agar pas di tengah.</p>
            
            <div className="relative w-64 h-64 mx-auto mb-4 bg-[#e5e7eb] rounded-xl overflow-hidden border-4 border-blue-500 cursor-move shadow-inner" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart => handleMouseDown(handleTouchStart)}>
              <img src={rawImage} alt="Drag & Crop" draggable={false} style={{ position: 'absolute', top: '50%', left: '50%', minWidth: '100%', minHeight: '100%', objectFit: 'cover', transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom}) scaleX(${isEditorFlipped ? -1 : 1})`, transformOrigin: 'center', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }} />
              <div className="absolute inset-0 pointer-events-none border border-white/30 flex items-center justify-center"><div className="w-4 h-4 rounded-full border border-red-500/50 flex items-center justify-center"><div className="w-1 h-1 bg-red-500/50 rounded-full"></div></div></div>
            </div>
            
            <div className="mb-4 px-2 flex items-center justify-center gap-3">
              <ZoomOut className="w-4 h-4 text-gray-500" />
              <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer flex-1" />
              <ZoomIn className="w-4 h-4 text-gray-500" />
              <button onClick={() => setIsEditorFlipped(!isEditorFlipped)} className="bg-gray-100 border border-gray-200 p-1.5 rounded-lg text-gray-600 hover:bg-gray-200 transition-all ml-1"><ArrowLeftRight className="w-4 h-4" /></button>
            </div>
            
            <p className="text-[10px] font-bold text-blue-600 mb-5 flex items-center justify-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" /> Tolong arahkan moncong kendaraan ke arah Kanan
            </p>
            
            <button onClick={processAndSaveImage} className="w-full py-3.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
                Selesai & Pasang Ikon
            </button>
          </div>
        </div>
      )}

      {/* --- UI PANEL RESPONSIF DRAWER --- */}
      <div className={`absolute z-20 bg-white/95 backdrop-blur-md shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500 ease-in-out flex flex-col md:top-6 md:left-6 md:w-85 md:rounded-2xl md:max-h-[90vh] md:border md:border-white/20 md:shadow-2xl md:bottom-auto bottom-0 left-0 w-full rounded-t-3xl max-h-[85vh] border-t border-white/20 ${isFormExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-60px)] md:translate-y-0'}`}>
        <div className="flex flex-col items-center pt-3 pb-3 px-5 cursor-pointer md:cursor-default" onClick={() => setIsFormExpanded(!isFormExpanded)}>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-3 md:hidden"></div>
          <div className="w-full flex justify-between items-center">
            {/* 👈 Mengganti ikon Route menjadi Bike di judul */}
            <h1 className="text-xl font-black text-gray-800 flex items-center gap-2">GassMudik <Bike className="w-5 h-5 text-blue-600" /></h1>
            <button className="md:hidden text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">{isFormExpanded ? 'Tutup' : 'Buka Panel'}</button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 pb-8 custom-scrollbar">
          <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
            
            <VehicleSettings vehicleType={vehicleType} onVehicleChange={handleVehicleChange} customLabel={customLabel} onLabelChange={handleLabelChange} modelSize={modelSize} onSizeChange={handleSizeChange} rotationUI={rotationUI} onRotationChange={handleRotationChange} isFlipped={isFlipped} onFlipChange={() => setIsFlipped(!isFlipped)} isPlaying={isRecording} onFileUpload={handleFileUpload} vehicleCategory={vehicleCategory} onCategoryChange={handleCategoryChange} />
            <VideoSettings duration={videoDuration} onDurationChange={setVideoDuration} resolution={videoResolution} onResolutionChange={setVideoResolution} watermark={watermark} onWatermarkChange={setWatermark} isPlaying={isRecording} />

            <div className="relative z-30 mt-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Lokasi Asal</label>
              <CityInput value={asal} onChange={(val: string) => setAsal(val)} disabled={isRecording} placeholder="Ketik asal..." inputClassName="w-full mt-1 px-4 py-2.5 bg-gray-100 text-gray-800 text-sm rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 font-medium" />
            </div>

            {titikSinggah.map((titik, index) => (
              <div key={index} className="flex flex-col relative z-20">
                <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider ml-1">Singgah {index + 1}</label>
                <div className="flex gap-2 mt-1 relative">
                  <CityInput value={titik} onChange={(val: string) => { const n = [...titikSinggah]; n[index] = val; setTitikSinggah(n); }} disabled={isRecording} placeholder="Lewat mana?" inputClassName="w-full px-4 py-2.5 bg-orange-50 text-gray-800 text-sm rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all disabled:opacity-50 border border-orange-100 font-medium" />
                  {!isRecording && (<button type="button" onClick={() => setTitikSinggah(titikSinggah.filter((_, i) => i !== index))} className="px-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all shrink-0 border border-red-100 flex items-center justify-center"><X className="w-4 h-4"/></button>)}
                </div>
              </div>
            ))}

            {!isRecording && (<button type="button" onClick={() => setTitikSinggah([...titikSinggah, ''])} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-all text-center mt-1 py-2 bg-blue-50 rounded-xl border border-blue-100 border-dashed flex items-center justify-center gap-1"><Plus className="w-3 h-3"/> Tambah Titik Singgah</button>)}
            
            <div className="relative z-10 mt-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Lokasi Tujuan</label>
              <CityInput value={tujuan} onChange={(val: string) => setTujuan(val)} disabled={isRecording} placeholder="Ketik tujuan..." inputClassName="w-full mt-1 px-4 py-2.5 bg-gray-100 text-gray-800 text-sm rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all disabled:opacity-50 font-medium" />
            </div>

            <button 
                type="button" 
                onClick={() => handleGassMudik(false)} 
                disabled={isLoading} 
                className={`mt-3 w-full py-3.5 rounded-xl text-sm font-black text-white transition-all shadow-lg flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-500/30'}`}
            >
                {/* 👈 Mengganti ikon Route menjadi Bike di tombol utama */}
                <Bike className="w-4 h-4" /> {isLoading ? 'Menyiapkan Rute...' : 'Gass!!'}
            </button>

          </form>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #2563eb; cursor: pointer; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        .custom-chat-bubble { background-color: white; color: #1f2937; padding: 4px 10px; border-radius: 8px; font-weight: 900; font-size: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); position: relative; max-width: 150px; white-space: normal; word-wrap: break-word; text-align: center; line-height: 1.2; border: 1.5px solid #e5e7eb; transition: all 0.2s ease; }
        .custom-chat-bubble::after { content: ''; position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); border-width: 6px 6px 0; border-style: solid; border-color: white transparent transparent transparent; filter: drop-shadow(0 2px 1px rgba(0,0,0,0.1)); }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}} />
    </div>
  );
}