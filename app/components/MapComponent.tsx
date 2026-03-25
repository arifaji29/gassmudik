"use client";

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';

import { Bike, Image as ImageIcon, ZoomIn, ZoomOut, Scissors, Plus, X, Video, ArrowLeftRight, ArrowRight, RotateCcw, Rocket } from 'lucide-react';

import CityInput from './CityInput'; 
import VehicleSettings, { VEHICLE_OPTIONS } from './VehicleSettings';
import VideoSettings from './VideoSettings';
import { getProcessedImageData, getCoordinates } from '../utils/mapUtils';

export default function MapComponent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const animationRef = useRef<number | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const coordsCache = useRef<Record<string, [number, number]>>({}); 
  
  const distanceRef = useRef<HTMLDivElement>(null);
  const vehicleLabelMarkerRef = useRef<maplibregl.Marker | null>(null); 

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [asal, setAsal] = useState('Jakarta');
  const [tujuan, setTujuan] = useState('Surabaya');
  const [titikSinggah, setTitikSinggah] = useState<string[]>([]); 
  
  const [vehicleCategory, setVehicleCategory] = useState('mobil'); 
  const [vehicleType, setVehicleType] = useState('/car.png'); 
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [modelSize, setModelSize] = useState(0.12); 
  const [rotationUI, setRotationUI] = useState(90);
  const [isFlipped, setIsFlipped] = useState(false); 
  const [customLabel, setCustomLabel] = useState('');
  
  const [videoDuration, setVideoDuration] = useState(15); 
  const [videoResolution, setVideoResolution] = useState('full');
  
  const [endImage, setEndImage] = useState<string | null>(null);

  const customLabelRef = useRef(''); 
  const rotationOffsetRef = useRef(90); 
  const currentBearingRef = useRef(0); 
  const estimasiWaktuRef = useRef<string | null>(null); 
  
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
    if (!mapRef.current) return;
    const updateIcon = async () => {
      const activeImageUrl = vehicleCategory === 'custom' ? customImage : vehicleType;
      
      if (!activeImageUrl) {
        if (mapRef.current?.getLayer('motor-layer')) {
            mapRef.current.setLayoutProperty('motor-layer', 'visibility', 'none');
        }
        if (vehicleLabelMarkerRef.current) {
            vehicleLabelMarkerRef.current.getElement().style.display = 'none';
        }
        return;
      }

      try {
        const imageData = await getProcessedImageData(activeImageUrl, isFlipped);
        const newImageId = `vehicle-${Math.random().toString(36).substring(2, 9)}`; 
        
        mapRef.current?.addImage(newImageId, imageData);
        
        if (mapRef.current?.getLayer('motor-layer')) {
            mapRef.current.setLayoutProperty('motor-layer', 'icon-image', newImageId);
            mapRef.current.setLayoutProperty('motor-layer', 'visibility', 'visible');
        }
      } catch (e) {}
    };
    updateIcon();
  }, [vehicleType, customImage, isFlipped, vehicleCategory]);

  useEffect(() => {
    const el = vehicleLabelMarkerRef.current?.getElement();
    if (el) {
      if (customLabel.trim() === '' || (vehicleCategory === 'custom' && !customImage)) {
          el.style.display = 'none';
      } else { 
          el.style.display = 'block'; 
          el.innerText = customLabel; 
      }
    }
  }, [customLabel, vehicleCategory, customImage]);

  // --- LIVE PREVIEW MAP ---
  useEffect(() => {
    if (isPlaying || isRecording || isFinished) return;
    if (!mapRef.current) return;

    const timer = setTimeout(async () => {
        try {
            const map = mapRef.current!;
            const validPoints: { name: string, coord: [number, number], type: 'start' | 'waypoint' | 'end' }[] = [];

            const getCoordSafe = async (cityName: string): Promise<[number, number]> => {
                if (coordsCache.current[cityName]) return coordsCache.current[cityName];
                const c = await getCoordinates(cityName);
                coordsCache.current[cityName] = c;
                await new Promise(r => setTimeout(r, 400)); 
                return c;
            };

            if (asal.trim()) { try { const c = await getCoordSafe(asal); validPoints.push({ name: asal, coord: c, type: 'start' }); } catch(e){} }
            for (const wp of titikSinggah) {
                if (wp.trim()) { try { const c = await getCoordSafe(wp); validPoints.push({ name: wp, coord: c, type: 'waypoint' }); } catch(e){} }
            }
            if (tujuan.trim()) { try { const c = await getCoordSafe(tujuan); validPoints.push({ name: tujuan, coord: c, type: 'end' }); } catch(e){} }

            markersRef.current.forEach(m => m.remove());
            markersRef.current = [];

            validPoints.forEach((pt, index) => {
                let color = pt.type === 'start' ? '#3b82f6' : pt.type === 'end' ? '#22c55e' : '#f97316'; 
                const el = document.createElement('div'); el.style.cssText = 'display:flex; align-items:center; gap:6px; transition: all 0.3s ease;';
                const dot = document.createElement('div'); dot.style.cssText = `width:12px; height:12px; background-color:${color}; border-radius:50%; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);`;
                const label = document.createElement('div'); label.textContent = pt.name; label.style.cssText = `background:white; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold; color:#1f2937; border:1px solid ${color};`;
                el.appendChild(dot); el.appendChild(label);
                markersRef.current.push(new maplibregl.Marker({ element: el, anchor: 'left' }).setLngLat(pt.coord).addTo(map));
            });

            if (validPoints.length > 0 && validPoints[0].type === 'start') {
                const startCoord = validPoints[0].coord;

                if (vehicleLabelMarkerRef.current) vehicleLabelMarkerRef.current.remove();
                const bubbleEl = document.createElement('div'); bubbleEl.className = 'custom-chat-bubble'; bubbleEl.innerText = customLabelRef.current; 
                
                const activeImageUrl = vehicleCategory === 'custom' ? customImage : vehicleType;
                bubbleEl.style.display = (customLabelRef.current.trim() === '' || !activeImageUrl) ? 'none' : 'block';
                
                vehicleLabelMarkerRef.current = new maplibregl.Marker({ element: bubbleEl, anchor: 'bottom', offset: [0, -35] }).setLngLat(startCoord).addTo(map);

                if (activeImageUrl) {
                    const newImageId = `vehicle-${Math.random().toString(36).substring(2, 9)}`; 
                    const point = turf.point(startCoord);
                    
                    try {
                      const imageData = await getProcessedImageData(activeImageUrl, isFlipped);
                      map.addImage(newImageId, imageData);
                    } catch(e){}

                    if (map.getSource('motor')) {
                        (map.getSource('motor') as maplibregl.GeoJSONSource).setData(point);
                        map.setLayoutProperty('motor-layer', 'icon-image', newImageId);
                        map.setLayoutProperty('motor-layer', 'icon-size', modelSize);
                        map.setLayoutProperty('motor-layer', 'icon-rotate', rotationOffsetRef.current);
                        map.setPaintProperty('motor-layer', 'icon-translate', [0, 0]); 
                        map.setLayoutProperty('motor-layer', 'visibility', 'visible');
                    } else {
                        map.addSource('motor', { type: 'geojson', data: point });
                        map.addLayer({ id: 'motor-layer', type: 'symbol', source: 'motor', layout: { 'icon-image': newImageId, 'icon-size': modelSize, 'icon-allow-overlap': true, 'icon-rotation-alignment': 'map', 'icon-rotate': rotationOffsetRef.current }, paint: { 'icon-translate': [0, 0] } });
                    }
                } else {
                    if (map.getLayer('motor-layer')) map.setLayoutProperty('motor-layer', 'visibility', 'none');
                }

                if (validPoints.length === 1) {
                    map.flyTo({ center: startCoord, zoom: 8, duration: 1200 });
                    if (map.getSource('route')) (map.getSource('route') as maplibregl.GeoJSONSource).setData(turf.featureCollection([]));
                } else if (validPoints.length > 1) {
                    const bounds = new maplibregl.LngLatBounds(validPoints[0].coord, validPoints[0].coord);
                    validPoints.forEach(p => bounds.extend(p.coord));
                    
                    const allCoordsArr = validPoints.map(p => p.coord);
                    let routeFeature: any; 
                    if (allCoordsArr.length === 2) routeFeature = turf.lineString((turf.greatCircle(allCoordsArr[0], allCoordsArr[1])).geometry.coordinates as [number, number][]);
                    else routeFeature = turf.bezierSpline(turf.lineString(allCoordsArr), { resolution: 10000, sharpness: 0.6 });

                    if (map.getSource('route')) {
                        (map.getSource('route') as maplibregl.GeoJSONSource).setData(routeFeature);
                        map.setPaintProperty('route-line', 'line-opacity', 0.4); 
                    } else {
                        map.addSource('route', { type: 'geojson', data: routeFeature });
                        map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ef4444', 'line-width': 5, 'line-opacity': 0.4 } });
                    }

                    const distanceInKmPreview = turf.length(routeFeature, { units: 'kilometers' });
                    const nextPointForBearing = turf.along(routeFeature, Math.min(1, distanceInKmPreview), { units: 'kilometers' });
                    const initialBearing = turf.bearing(turf.point(startCoord), nextPointForBearing);
                    currentBearingRef.current = initialBearing;
                    
                    if (map.getLayer('motor-layer')) {
                        map.setLayoutProperty('motor-layer', 'icon-rotate', initialBearing + rotationOffsetRef.current);
                        map.moveLayer('motor-layer'); 
                    }
                    map.fitBounds(bounds, { padding: 80, duration: 1200 });
                }
            } else {
                if (map.getSource('motor')) (map.getSource('motor') as maplibregl.GeoJSONSource).setData(turf.featureCollection([]));
                if (map.getSource('route')) (map.getSource('route') as maplibregl.GeoJSONSource).setData(turf.featureCollection([]));
            }

        } catch (err) { console.error("Live preview error:", err); }
    }, 1200);

    return () => clearTimeout(timer);
  }, [asal, tujuan, titikSinggah, vehicleType, customImage, customLabel, modelSize, rotationUI, isFlipped, vehicleCategory, isPlaying, isRecording, isFinished]);

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
      if (mapRef.current?.getLayer('motor-layer')) {
          mapRef.current.setLayoutProperty('motor-layer', 'icon-rotate', currentBearingRef.current + val);
      }
  };

  const handleReset = () => {
    setAsal('');
    setTujuan('');
    setTitikSinggah([]);
    setCustomLabel('');
    customLabelRef.current = '';
    setEndImage(null); 
    
    setVehicleCategory('mobil');
    setVehicleType('/car.png');
    setCustomImage(null);
    setModelSize(0.12);
    setRotationUI(90);
    rotationOffsetRef.current = 90;
    setIsFlipped(false);
    setIsEditorFlipped(false);
    
    setIsFinished(false);
    setIsPlaying(false);
    setIsRecording(false);
    setEstimasiWaktu(null);
    estimasiWaktuRef.current = null;
    
    if (distanceRef.current) distanceRef.current.innerText = "0.0 KM";
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (vehicleLabelMarkerRef.current) vehicleLabelMarkerRef.current.remove();
    
    if (mapRef.current) {
      if (mapRef.current.getSource('route')) {
        (mapRef.current.getSource('route') as maplibregl.GeoJSONSource).setData(turf.featureCollection([]));
      }
      if (mapRef.current.getSource('motor')) {
        (mapRef.current.getSource('motor') as maplibregl.GeoJSONSource).setData(turf.featureCollection([]));
      }
      if (mapRef.current.getLayer('motor-layer')) {
          mapRef.current.setPaintProperty('motor-layer', 'icon-translate', [0, 0]);
      }
      mapRef.current.flyTo({ center: [108.5, -6.8], zoom: 6, pitch: 0, bearing: 0, duration: 1500 });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setTempFile(file); setBgWarningOpen(true); } e.target.value = ''; };
  
  const handleEndImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setEndImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

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

  async function handleGassMudik(shouldRecord: boolean = false) {
    if (!asal || !tujuan) return alert("Mohon isi Kota Asal dan Tujuan terlebih dahulu.");
    
    const activeImageUrl = vehicleCategory === 'custom' ? customImage : vehicleType;
    if (!activeImageUrl) {
        setIsLoading(false);
        return alert("Mohon unggah gambar Custom Anda terlebih dahulu, atau pilih kategori kendaraan lain!");
    }

    if (!mapRef.current) return;
    const map = mapRef.current;
    
    setIsLoading(true); setIsFinished(false); setIsRecording(shouldRecord);
    setIsFormExpanded(false); 

    if (distanceRef.current) distanceRef.current.innerText = "0.0 KM"; 
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    try {
      let loadedEndImage: HTMLImageElement | null = null;
      if (shouldRecord && endImage) {
          loadedEndImage = new Image();
          loadedEndImage.src = endImage;
          await new Promise((resolve) => { loadedEndImage!.onload = resolve; });
      }

      const startCoord = await getCoordinates(asal);
      const endCoord = await getCoordinates(tujuan);
      const validWaypoints = titikSinggah.filter(wp => wp.trim() !== '');
      const waypointCoords: [number, number][] = [];
      for (const wp of validWaypoints) waypointCoords.push(await getCoordinates(wp));

      const allCoords = [startCoord, ...waypointCoords, endCoord];
      const allNames = [asal, ...validWaypoints, tujuan];

      let routeFeature: any; 
      if (allCoords.length === 2) {
          routeFeature = turf.lineString((turf.greatCircle(allCoords[0], allCoords[1])).geometry.coordinates as [number, number][]);
      } else {
          routeFeature = turf.bezierSpline(turf.lineString(allCoords), { resolution: 2000, sharpness: 0.6 });
      }

      const distanceInKm = turf.length(routeFeature, { units: 'kilometers' });
      const jam = Math.floor(distanceInKm / 60); const menit = Math.floor(((distanceInKm / 60) - jam) * 60);
      const estimasiStr = jam > 0 ? `${jam} Jam ${menit} Menit` : `${menit} Menit`;
      setEstimasiWaktu(estimasiStr);
      estimasiWaktuRef.current = estimasiStr; 

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

      const imageData = await getProcessedImageData(activeImageUrl, isFlipped);
      const newImageId = `vehicle-${Math.random().toString(36).substring(2, 9)}`; 

      map.addImage(newImageId, imageData); 

      if (map.getSource('route')) {
          (map.getSource('route') as maplibregl.GeoJSONSource).setData(routeFeature);
          map.setPaintProperty('route-line', 'line-opacity', 0.8); 
      } else {
          map.addSource('route', { type: 'geojson', data: routeFeature });
          map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ef4444', 'line-width': 5, 'line-opacity': 0.8 } });
      }

      const point = turf.point(routeFeature.geometry.coordinates[0] as [number, number]);
      const nextPointForBearing = turf.along(routeFeature, Math.min(1, distanceInKm), { units: 'kilometers' });
      const initialBearing = turf.bearing(point, nextPointForBearing);
      currentBearingRef.current = initialBearing; 

      if (map.getSource('motor')) {
        (map.getSource('motor') as maplibregl.GeoJSONSource).setData(point);
        map.setLayoutProperty('motor-layer', 'icon-image', newImageId); 
        map.setLayoutProperty('motor-layer', 'icon-size', modelSize);
        map.setLayoutProperty('motor-layer', 'icon-rotate', initialBearing + rotationOffsetRef.current);
        map.setPaintProperty('motor-layer', 'icon-translate', [0, 0]);
        map.setLayoutProperty('motor-layer', 'visibility', 'visible');
      } else {
        map.addSource('motor', { type: 'geojson', data: point });
        map.addLayer({ 
            id: 'motor-layer', 
            type: 'symbol', 
            source: 'motor', 
            layout: { 
                'icon-image': newImageId, 
                'icon-size': modelSize, 
                'icon-allow-overlap': true, 
                'icon-rotation-alignment': 'map',
                'icon-rotate': initialBearing + rotationOffsetRef.current,
                'visibility': 'visible'
            },
            paint: {
                'icon-translate': [0, 0] 
            }
        });
      }

      if (map.getLayer('motor-layer')) {
          map.moveLayer('motor-layer');
      }

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

      setIsLoading(false); setIsPlaying(true); 

      map.flyTo({ center: startCoord, zoom: 8, pitch: 50, duration: 2000 });
      
      let startTime: number | null = null;
      const lineDistance = turf.length(routeFeature);
      let hasTriggeredFinishUI = false;

      function animate(timestamp: number) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        
        let rawProgress = elapsed / (videoDuration * 1000);
        const isAnimationDone = rawProgress >= 1;
        
        const progress = Math.min(rawProgress, 1);
        
        const currentDistance = progress * lineDistance;
        const currentPoint = turf.along(routeFeature, currentDistance, { units: 'kilometers' });
        
        if (!isAnimationDone) {
            const lookAheadDist = Math.max(0.5, lineDistance * 0.01);
            let targetDistance = currentDistance + lookAheadDist; 
            if (targetDistance > lineDistance) targetDistance = lineDistance;
            
            const nextPoint = turf.along(routeFeature, targetDistance, { units: 'kilometers' });
            const bearing = turf.bearing(currentPoint, nextPoint);
            currentBearingRef.current = bearing; 
            
            const bounceY = -Math.abs(Math.sin(elapsed / 120)) * 8; 
            const wobble = Math.cos(elapsed / 120) * 3; 

            map.setPaintProperty('motor-layer', 'icon-translate', [0, bounceY]);
            map.setLayoutProperty('motor-layer', 'icon-rotate', bearing + rotationOffsetRef.current + wobble); 
        } else {
            map.setPaintProperty('motor-layer', 'icon-translate', [0, 0]);
            map.setLayoutProperty('motor-layer', 'icon-rotate', currentBearingRef.current + rotationOffsetRef.current);
        }

        (map.getSource('motor') as maplibregl.GeoJSONSource).setData(currentPoint);
        map.jumpTo({ center: currentPoint.geometry.coordinates as [number, number] });

        if (vehicleLabelMarkerRef.current) vehicleLabelMarkerRef.current.setLngLat(currentPoint.geometry.coordinates as [number, number]);
        if (distanceRef.current) distanceRef.current.innerText = `${currentDistance.toFixed(1)} KM`;

        if (shouldRecord && exportCtx && exportCanvas) {
             const mapCanvas = map.getCanvas();
             exportCtx.drawImage(mapCanvas, 0, 0); 
             
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

             // --- PERBAIKAN: TEXT BUBBLE MULTI-LINE (WORD WRAPPING) ---
             if (customLabelRef.current.trim() !== '') {
                const vehPos = map.project(currentPoint.geometry.coordinates as [number, number]);
                const vx = vehPos.x * dpr;
                const vy = (vehPos.y - 35) * dpr;
                const text = customLabelRef.current;
                
                const fontSize = 12 * dpr;
                exportCtx.font = `900 ${fontSize}px sans-serif`;
                
                // Logika Pemecah Baris (Word Wrap)
                const maxWidth = 150 * dpr;
                const words = text.split(' ');
                const lines: string[] = [];
                let currentLine = words[0];
                
                for (let i = 1; i < words.length; i++) {
                    const word = words[i];
                    const width = exportCtx.measureText(currentLine + " " + word).width;
                    if (width < maxWidth) {
                        currentLine += " " + word;
                    } else {
                        lines.push(currentLine);
                        currentLine = word;
                    }
                }
                lines.push(currentLine);

                // Hitung Dimensi Box Bubble
                const lineHeight = fontSize * 1.2;
                let maxLineWidth = 0;
                lines.forEach(line => {
                    const w = exportCtx.measureText(line).width;
                    if (w > maxLineWidth) maxLineWidth = w;
                });

                const padX = 10 * dpr;
                const padY = 6 * dpr;
                const boxWidth = maxLineWidth + padX * 2;
                const boxHeight = lines.length * lineHeight + padY * 2;

                const boxX = vx - boxWidth / 2;
                const boxY = vy - boxHeight - (6 * dpr); 

                // Gambar Background Bubble
                exportCtx.fillStyle = 'white';
                if (typeof (exportCtx as any).roundRect === 'function') {
                    exportCtx.beginPath();
                    (exportCtx as any).roundRect(boxX, boxY, boxWidth, boxHeight, 8 * dpr);
                    exportCtx.fill();
                    exportCtx.lineWidth = 1.5 * dpr;
                    exportCtx.strokeStyle = '#e5e7eb';
                    exportCtx.stroke();
                } else {
                    exportCtx.fillRect(boxX, boxY, boxWidth, boxHeight);
                    exportCtx.lineWidth = 1.5 * dpr;
                    exportCtx.strokeStyle = '#e5e7eb';
                    exportCtx.strokeRect(boxX, boxY, boxWidth, boxHeight);
                }

                // Gambar Ekor Bubble (Segitiga Bawah)
                exportCtx.beginPath();
                exportCtx.moveTo(vx - 6 * dpr, boxY + boxHeight - 1.5 * dpr); 
                exportCtx.lineTo(vx + 6 * dpr, boxY + boxHeight - 1.5 * dpr);
                exportCtx.lineTo(vx, boxY + boxHeight + 6 * dpr);
                exportCtx.fillStyle = 'white';
                exportCtx.fill();

                // Cetak Teks (Bisa Multi-baris)
                exportCtx.fillStyle = '#1f2937';
                exportCtx.textAlign = 'center';
                exportCtx.textBaseline = 'top';

                const textStartY = boxY + padY + (fontSize * 0.1); 
                lines.forEach((line, index) => {
                    exportCtx.fillText(line, vx, textStartY + index * lineHeight);
                });

                // Reset ke default agar elemen lain (Jarak) tidak berantakan
                exportCtx.textAlign = 'left';
                exportCtx.textBaseline = 'alphabetic';
             }

             const distText = `${currentDistance.toFixed(1)} KM`;
             exportCtx.font = `900 ${16 * dpr}px sans-serif`; 
             const distW = exportCtx.measureText(distText).width;
             
             let boxWidth = distW + 30 * dpr;
             let boxHeight = 30 * dpr; 

             if (progress >= 1 && estimasiWaktuRef.current) {
                 exportCtx.font = `bold ${12 * dpr}px sans-serif`;
                 const timeText = `Waktu: ${estimasiWaktuRef.current}`;
                 const timeW = exportCtx.measureText(timeText).width;
                 boxWidth = Math.max(boxWidth, timeW + 30 * dpr);
                 boxHeight = 50 * dpr; 
             }

             const startX = (exportCanvas.width / 2) - (boxWidth / 2);
             const startY = 40 * dpr;

             exportCtx.fillStyle = 'rgba(255,255,255,0.9)';
             if (typeof (exportCtx as any).roundRect === 'function') {
                 exportCtx.beginPath();
                 exportCtx.roundRect(startX, startY, boxWidth, boxHeight, 15 * dpr); 
                 exportCtx.fill();
             } else {
                 exportCtx.fillRect(startX, startY, boxWidth, boxHeight);
             }
             
             exportCtx.fillStyle = '#1f2937';
             exportCtx.textAlign = 'center'; 
             exportCtx.font = `900 ${16 * dpr}px sans-serif`;
             exportCtx.fillText(distText, startX + (boxWidth / 2), startY + 22 * dpr);
             
             if (progress >= 1 && estimasiWaktuRef.current) {
                 exportCtx.font = `bold ${12 * dpr}px sans-serif`;
                 exportCtx.fillStyle = '#16a34a'; 
                 exportCtx.fillText(`Waktu: ${estimasiWaktuRef.current}`, startX + (boxWidth / 2), startY + 40 * dpr);
             }
             
             exportCtx.textAlign = 'left';

             if (progress >= 1 && loadedEndImage) {
                const holdElapsed = elapsed - (videoDuration * 1000);
                const alpha = Math.min(holdElapsed / 500, 1); 
                exportCtx.globalAlpha = alpha;

                exportCtx.fillStyle = 'rgba(0,0,0,0.6)';
                exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

                const canvasRatio = exportCanvas.width / exportCanvas.height;
                const imgRatio = loadedEndImage.width / loadedEndImage.height;
                let drawW = exportCanvas.width;
                let drawH = exportCanvas.height;
                let drawX = 0;
                let drawY = 0;

                if (imgRatio > canvasRatio) {
                    drawH = exportCanvas.width / imgRatio;
                    drawY = (exportCanvas.height - drawH) / 2;
                } else {
                    drawW = exportCanvas.height * imgRatio;
                    drawX = (exportCanvas.width - drawW) / 2;
                }

                exportCtx.drawImage(loadedEndImage, drawX, drawY, drawW, drawH);
                exportCtx.globalAlpha = 1.0; 
             }
        }

        const endScreenDuration = loadedEndImage ? 4000 : 3000;
        const totalDurationMs = shouldRecord ? (videoDuration * 1000) + endScreenDuration : (videoDuration * 1000);

        if (elapsed < totalDurationMs) {
          if (isAnimationDone && !hasTriggeredFinishUI) {
              setIsPlaying(false);
              setIsFinished(true);
              setIsFormExpanded(true); 
              hasTriggeredFinishUI = true;
          }
          animationRef.current = requestAnimationFrame(animate);
        } else {
          if (!hasTriggeredFinishUI) {
              setIsPlaying(false); setIsFinished(true); setIsFormExpanded(true); 
              hasTriggeredFinishUI = true;
          }
          if (shouldRecord && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
          }
        }
      }
      
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
      </div>

      {(isPlaying || isFinished) && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/50 flex flex-col items-center transition-all min-w-30">
          {isRecording && (<div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse shadow-md"><div className="w-1.5 h-1.5 bg-white rounded-full"></div> REC</div>)}
          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Jarak Tempuh</span>
          <div className="text-base font-black text-gray-800 tracking-tighter" ref={distanceRef}>0.0 KM</div>
          
          {isFinished && estimasiWaktu && (
             <div className="mt-0.5 text-[10px] font-bold text-green-600 animate-fade-in">Waktu: {estimasiWaktu}</div>
          )}
        </div>
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

      <div className={`absolute z-20 bg-white/95 backdrop-blur-md shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500 ease-in-out flex flex-col md:top-6 md:left-6 md:w-85 md:rounded-2xl md:max-h-[90vh] md:border md:border-white/20 md:shadow-2xl md:bottom-auto bottom-0 left-0 w-full rounded-t-3xl max-h-[50vh] border-t border-white/20 ${isFormExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-60px)] md:translate-y-0'}`}>
        <div className="flex flex-col items-center pt-3 pb-3 px-5 cursor-pointer md:cursor-default" onClick={() => setIsFormExpanded(!isFormExpanded)}>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-3 md:hidden"></div>
          <div className="w-full flex justify-between items-center">
            <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">GassMudik <Bike className="w-5 h-5 text-blue-600" /></h1>
            
            <div className="flex items-center gap-1.5">
              {!isPlaying && !isRecording && (
                  <>
                  <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); handleGassMudik(true); }} 
                      disabled={isLoading} 
                      className={`text-[8px] font-bold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-md shadow-red-500/30 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                      <Video className="w-3 h-3" /> {isLoading ? 'Wait..' : 'Rekam'}
                  </button>
                  <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); handleGassMudik(false); }} 
                      disabled={isLoading} 
                      className={`text-[8px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-md shadow-blue-500/30 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                      <Rocket className="w-3 h-3" /> {isLoading ? 'Wait..' : 'Preview'}
                  </button>
                  </>
              )}
              <button className="md:hidden text-[8px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full" onClick={() => setIsFormExpanded(!isFormExpanded)}>
                {isFormExpanded ? 'Tutup' : 'Buka'}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-5 pb-8 custom-scrollbar">
          <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
            
            <VehicleSettings vehicleType={vehicleType} onVehicleChange={handleVehicleChange} customLabel={customLabel} onLabelChange={handleLabelChange} modelSize={modelSize} onSizeChange={handleSizeChange} rotationUI={rotationUI} onRotationChange={handleRotationChange} isFlipped={isFlipped} onFlipChange={() => setIsFlipped(!isFlipped)} isPlaying={isRecording} onFileUpload={handleFileUpload} vehicleCategory={vehicleCategory} onCategoryChange={handleCategoryChange} />
            <VideoSettings duration={videoDuration} onDurationChange={setVideoDuration} resolution={videoResolution} onResolutionChange={setVideoResolution} endImage={endImage} onEndImageChange={handleEndImageUpload} onRemoveEndImage={() => setEndImage(null)} isPlaying={isRecording} />

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
                onClick={() => handleReset()} 
                disabled={isLoading} 
                className={`mt-3 w-full py-3.5 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95 border border-gray-200 flex items-center justify-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <RotateCcw className="w-4 h-4" /> Reset Peta
            </button>

          </form>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
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