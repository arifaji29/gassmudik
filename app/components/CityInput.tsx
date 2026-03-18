"use client";

import { useEffect, useState } from 'react';

export default function CityInput({ value, onChange, disabled, placeholder, inputClassName }: any) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!value || !showDropdown) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${value}&countrycodes=id&limit=5`);
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {} finally { setLoading(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [value, showDropdown]);

  return (
    <div className="relative w-full">
      <input type="text" value={value} onChange={(e) => { onChange(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} disabled={disabled} placeholder={placeholder} className={inputClassName} required />
      {loading && showDropdown && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
          {suggestions.map((item, idx) => (
            <li key={idx} onClick={() => { onChange(item.name); setShowDropdown(false); }} className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-0 border-gray-100 transition-colors">
              <div className="font-bold text-gray-800 text-sm">{item.name}</div>
              <div className="text-xs text-gray-500 truncate">{item.display_name}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}