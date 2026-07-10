import React, { useState, useEffect, useRef } from "react";
import { 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  Navigation 
} from "lucide-react";
import { Itinerary } from "../types";

declare const L: any;

interface MiniMapWidgetProps {
  dayNumber: number;
  destination: string;
  itinerary: Itinerary;
}

export default function MiniMapWidget({ dayNumber, destination, itinerary }: MiniMapWidgetProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  // Extract activities for current day that have coordinates
  const dayPlan = itinerary?.days?.find((d) => d.dayNumber === dayNumber);
  const dayActivities = dayPlan?.activities?.filter((act) => act.latitude && act.longitude) || [];

  useEffect(() => {
    if (!mapRef.current) return;
    if (typeof L === "undefined") {
      console.warn("Leaflet library not loaded yet.");
      return;
    }

    // Initialize map if not done already
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([15.3352, 76.4623], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear old markers and polyline
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (dayActivities.length > 0) {
      const coords = dayActivities.map((act) => [act.latitude, act.longitude]);

      // Connect stops with a route path line
      polylineRef.current = L.polyline(coords, {
        color: "#4A8B5C",
        weight: 3,
        dashArray: "5, 5",
        opacity: 0.8
      }).addTo(map);

      // Add numbered circular markers
      dayActivities.forEach((act, idx) => {
        const isSelected = selectedActivity?.id === act.id;
        const color = "#4A8B5C"; // Primary green theme for mini map

        const marker = L.marker([act.latitude, act.longitude], {
          icon: L.divIcon({
            html: `
              <div class="relative flex items-center justify-center">
                ${isSelected ? `<span class="absolute w-6 h-6 rounded-full bg-green-400/30 animate-ping"></span>` : ""}
                <div class="w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white font-mono text-[9px] font-bold text-white transition-transform transform hover:scale-115" style="background-color: ${color};">
                  ${idx + 1}
                </div>
              </div>
            `,
            className: "mini-marker-icon",
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        })
        .addTo(map)
        .bindPopup(`<strong>Stop ${idx + 1}: ${act.title}</strong>`);

        marker.on("click", () => {
          setSelectedActivity(act);
        });

        markersRef.current.push(marker);
      });

      // Adjust map view to cover all day activity coordinates
      map.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });
      
      // Default select the first activity of the day
      setSelectedActivity(dayActivities[0]);
    } else {
      setSelectedActivity(null);
    }
  }, [dayNumber, itinerary]);

  // Update ping animation on marker selection
  useEffect(() => {
    dayActivities.forEach((act, idx) => {
      const marker = markersRef.current[idx];
      if (marker) {
        const isSelected = selectedActivity?.id === act.id;
        marker.setIcon(L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              ${isSelected ? `<span class="absolute w-6 h-6 rounded-full bg-green-400/30 animate-ping"></span>` : ""}
              <div class="w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white font-mono text-[9px] font-bold text-white transition-transform" style="background-color: #4A8B5C;">
                ${idx + 1}
              </div>
            </div>
          `,
          className: "mini-marker-icon",
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        }));
      }
    });
  }, [selectedActivity]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm space-y-4 font-sans select-none overflow-hidden relative">
      
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#3B7A57]/10 flex items-center justify-center">
            <Compass className="w-4.5 h-4.5 text-[#3B7A57]" />
          </div>
          <div className="text-left">
            <h4 className="font-display font-bold text-xs text-slate-800">
              Interactive Mini-Map
            </h4>
            <p className="text-[9px] text-slate-400 font-medium">
              Geographical context for Day {dayNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <div className="w-full h-48 rounded-2xl relative overflow-hidden bg-[#FAFAF7] border border-slate-150">
        <div ref={mapRef} className="w-full h-full" />

        {/* GPS Coordinates HUD overlay */}
        {selectedActivity && (
          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-[8px] font-mono font-bold text-white px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm border border-white/15 z-[1000]">
            <Navigation className="w-2.5 h-2.5 text-sky-400 animate-pulse" />
            <span>GPS: {selectedActivity.latitude.toFixed(4)}° N, {selectedActivity.longitude.toFixed(4)}° E</span>
          </div>
        )}

        {/* Zoom Controls HUD */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-1 flex flex-col gap-1 shadow-sm z-[1000]">
          <button 
            onClick={handleZoomIn}
            className="p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleZoomOut}
            className="p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Compass indicator */}
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center shadow-xs z-[1000]">
          <span className="font-mono text-[8px] font-black text-slate-800">N</span>
        </div>
      </div>

      {/* Selected Landmark Details Box */}
      {selectedActivity ? (
        <div className="bg-[#FAF8F5] border border-amber-500/10 rounded-xl p-3 space-y-1.5 animate-fade-in text-left">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
              📌 stop highlight
            </span>
            <span className="font-mono text-[8px] text-slate-400 font-bold">
              {selectedActivity.latitude.toFixed(4)}° N, {selectedActivity.longitude.toFixed(4)}° E
            </span>
          </div>
          <h5 className="font-display font-extrabold text-[11px] text-slate-800">
            {selectedActivity.title}
          </h5>
          <p className="font-sans text-[10px] text-slate-500 leading-relaxed font-light">
            {selectedActivity.description}
          </p>
        </div>
      ) : (
        <div className="text-[10px] text-slate-400 italic py-4 text-center">
          No landmarks available for this day.
        </div>
      )}

    </div>
  );
}
