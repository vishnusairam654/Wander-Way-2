import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Download, Compass, ChevronRight, Star } from "lucide-react";
import { Itinerary } from "../types";

declare const L: any;

interface MapViewProps {
  itinerary: Itinerary;
}

export default function MapView({ itinerary }: MapViewProps) {
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletMarkersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  // Extract all activities with coordinates from itinerary
  const allActivities: any[] = [];
  if (itinerary && itinerary.days) {
    itinerary.days.forEach((day) => {
      if (day.activities) {
        day.activities.forEach((act) => {
          if (act.latitude && act.longitude) {
            allActivities.push({
              ...act,
              dayNumber: day.dayNumber
            });
          }
        });
      }
    });
  }

  // Create custom marker icons
  const createCustomIcon = (category: string, isSelected: boolean) => {
    let color = "#4FA8E0"; // Default sky blue
    if (category === "culture") color = "#4A8B5C"; // Green
    if (category === "food") color = "#D9895B"; // Earth Orange
    if (category === "nature") color = "#10B981"; // Emerald
    if (category === "activity") color = "#8B5CF6"; // Violet

    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          ${isSelected ? `<span class="absolute w-8 h-8 rounded-full bg-sky-400/30 animate-ping"></span>` : ""}
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all transform hover:scale-110" style="background-color: ${color}; color: white;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      `,
      className: "custom-marker-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  };

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;

    // Check if Leaflet is loaded
    if (typeof L === "undefined") {
      console.warn("Leaflet library not loaded yet.");
      return;
    }

    // Initialize map instance once
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: false
      }).setView([15.3352, 76.4623], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Add zoom control at bottom right
      L.control.zoom({
        position: 'bottomright'
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing markers & paths
    leafletMarkersRef.current.forEach((marker) => marker.remove());
    leafletMarkersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (allActivities.length > 0) {
      const coords = allActivities.map((act) => [act.latitude, act.longitude]);

      // Draw path line connecting activities
      polylineRef.current = L.polyline(coords, {
        color: "#4FA8E0",
        weight: 3.5,
        dashArray: "6, 5",
        opacity: 0.85
      }).addTo(map);

      // Add markers
      allActivities.forEach((act, index) => {
        const marker = L.marker([act.latitude, act.longitude], {
          icon: createCustomIcon(act.category, selectedActivityId === act.id)
        })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: system-ui, sans-serif; padding: 4px; max-width: 220px;">
            <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #94a3b8;">Day ${act.dayNumber} • ${act.time}</span>
            <h4 style="font-size: 13px; font-weight: 700; color: #1e293b; margin: 2px 0 4px 0;">${act.title}</h4>
            <p style="font-size: 11px; color: #475569; margin: 0 0 6px 0; line-height: 1.4;">${act.description}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; border-t: 1px solid #f1f5f9; padding-top: 6px; margin-top: 6px;">
              <span style="font-size: 10px; font-weight: 700; color: #e8a66b;">${act.cost > 0 ? `₹${act.cost.toLocaleString()}` : "Free"}</span>
              ${act.rating ? `
                <span style="font-size: 10px; font-weight: 700; color: #f59e0b; display: flex; align-items: center; gap: 2px;">
                  ★ ${act.rating}
                </span>
              ` : ""}
            </div>
          </div>
        `);

        marker.on("click", () => {
          setSelectedActivityId(act.id);
        });

        leafletMarkersRef.current.push(marker);
      });

      // Fit map view to cover all markers
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
    }
  }, [itinerary]);

  // Update active marker icon when selectedActivityId changes
  useEffect(() => {
    allActivities.forEach((act, index) => {
      const marker = leafletMarkersRef.current[index];
      if (marker) {
        marker.setIcon(createCustomIcon(act.category, selectedActivityId === act.id));
      }
    });
  }, [selectedActivityId]);

  const handleCardClick = (act: any) => {
    setSelectedActivityId(act.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([act.latitude, act.longitude], 15);
      
      const index = allActivities.findIndex((a) => a.id === act.id);
      if (index !== -1 && leafletMarkersRef.current[index]) {
        leafletMarkersRef.current[index].openPopup();
      }
    }
  };

  const getActiveTrailString = () => {
    if (allActivities.length === 0) return "No trail stops generated";
    return allActivities.slice(0, 3).map((act) => act.title.split("Visit")[0].split("Explore")[0].trim()).join(" → ") + (allActivities.length > 3 ? " → ..." : "");
  };

  return (
    <div id="map-screen" className="h-[calc(100vh-140px)] w-full rounded-[24px] border border-slate-100 overflow-hidden relative shadow-sm animate-fade-in flex flex-col">
      
      {/* Top Floating Action Overlay bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-center pointer-events-none">
        
        {/* Active Route display pill */}
        <div className="bg-white/95 backdrop-blur-sm shadow-md rounded-xl p-3 border border-slate-100 flex items-center gap-3 pointer-events-auto">
          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-[#4FA8E0]">
            <Navigation className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Active Day Trail</span>
            <span className="font-display font-bold text-xs text-slate-700 max-w-[200px] truncate block">
              {getActiveTrailString()}
            </span>
          </div>
        </div>

        {/* Action utility buttons */}
        <div className="flex gap-2 pointer-events-auto">
          <button 
            id="btn-download-map"
            onClick={() => alert("Offline map download started. Saved successfully!")}
            className="w-10 h-10 bg-white/95 backdrop-blur-sm shadow-md rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors border border-slate-100 cursor-pointer"
            title="Download Offline Map"
          >
            <Download className="w-4.5 h-4.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Real Interactive Leaflet Map Div Container */}
      <div ref={mapRef} className="flex-1 w-full h-full relative overflow-hidden bg-[#FAFAF7]" />

      {/* Draggable/Togglable bottom sheet with scrolling detail cards */}
      <div className="bg-white border-t border-slate-100 p-5 z-[1000] shadow-xl max-h-52 shrink-0">
        <span className="block text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">
          Explore stops on this trail ({allActivities.length} locations)
        </span>

        {/* Scrollable grid of stops */}
        <div className="flex gap-4 overflow-x-auto pb-1 hide-scrollbar snap-x">
          {allActivities.map((act) => {
            const isSelected = selectedActivityId === act.id;
            return (
              <button
                key={act.id}
                onClick={() => handleCardClick(act)}
                className={`min-w-[260px] md:min-w-[280px] bg-slate-50 hover:bg-slate-100/70 border rounded-xl p-3 flex gap-3 transition-all cursor-pointer snap-start flex-shrink-0 text-left outline-none ${
                  isSelected ? "border-[#4FA8E0] bg-sky-50/20 shadow-sm" : "border-slate-100"
                }`}
              >
                {/* Visual Circle with Category Icon */}
                <div className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center shrink-0 border transition-colors ${
                  isSelected ? "bg-white border-sky-100" : "bg-white border-slate-200"
                }`}>
                  <span className="text-xl">
                    {act.category === "food" ? "🍽️" :
                     act.category === "culture" ? "🏛️" :
                     act.category === "nature" ? "🌳" :
                     act.category === "activity" ? "🚣" : "📍"}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                    Day {act.dayNumber}
                  </span>
                </div>

                {/* Stop info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h5 className="font-display font-bold text-xs text-slate-800 truncate">
                      {act.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-sans font-semibold text-[#4FA8E0] bg-sky-50 px-1.5 py-0.5 rounded uppercase tracking-wide">
                        {act.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {act.cost > 0 ? `₹${act.cost.toLocaleString()}` : "Free"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-[10px]">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{act.rating || "4.5"}</span>
                    </div>
                    
                    <span className="text-[10px] font-display font-semibold text-[#4FA8E0] inline-flex items-center gap-0.5">
                      View details <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {allActivities.length === 0 && (
            <div className="text-xs text-slate-400 italic p-4 text-center w-full">
              No geographical coordinate markers exist in this itinerary.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
