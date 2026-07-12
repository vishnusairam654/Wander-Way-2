import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Square,
  Plus,
  RefreshCw,
  Sun,
  ShieldCheck,
  FileCheck,
  AlertCircle,
  Trash2,
  Info,
  MapPin,
  Sparkles,
  Loader2
} from "lucide-react";
import { PackingItem, Itinerary } from "../types";
import { INITIAL_PACKING_ITEMS } from "../data";
import { callApi } from "../lib/callApi";

interface PackingListViewProps {
  itinerary?: Itinerary;
}

interface EssentialRequirement {
  id: string;
  name: string;
  description: string;
  required: boolean; // Is it legally/physically mandatory?
  checked: boolean;
  type: "visa" | "health" | "identity" | "finance" | "other";
}

export default function PackingListView({ itinerary }: PackingListViewProps) {
  if (!itinerary?.id) {
    return null;
  }

  const tripId = itinerary.id;
  const destination = itinerary.destination || "Destination";
  const originLocation = itinerary.originLocation || "";
  const routeLabel = originLocation ? `${originLocation} to ${destination}` : destination;
  const travelMode = itinerary.travelMode || "mixed";
  const [weatherSummary, setWeatherSummary] = useState("Checking latest forecast...");

  // Existing Packing Items State
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<PackingItem["category"]>("Clothing");

  // AI Suggestions State
  const [aiSuggestions, setAiSuggestions] = useState<{ name: string; category: PackingItem["category"]; description: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [addedSuggestions, setAddedSuggestions] = useState<string[]>([]);

  // Trip Essentials / Mandatory Requirements State
  const [essentials, setEssentials] = useState<EssentialRequirement[]>([]);
  const [newEssentialName, setNewEssentialName] = useState("");
  const [newEssentialDesc, setNewEssentialDesc] = useState("");
  const [newEssentialType, setNewEssentialType] = useState<EssentialRequirement["type"]>("other");
  const [showAddEssentialForm, setShowAddEssentialForm] = useState(false);

  // Load packing items and essentials from localStorage or seed
  useEffect(() => {
    const packingKey = `wanderway_packing_${tripId}`;
    const packingMetaKey = `wanderway_packing_meta_${tripId}`;
    const essentialsKey = `wanderway_essentials_${tripId}`;
    const essentialsMetaKey = `wanderway_essentials_meta_${tripId}`;
    const routeKey = JSON.stringify({ originLocation, destination, travelMode });
    const essentialsRouteKey = JSON.stringify({ originLocation, destination });

    const defaultAIItems = (itinerary.packingList || []).map((item, index) => ({
      id: `ai-pack-${index}`,
      category: item.category as PackingItem["category"],
      name: item.name,
      description: item.reason,
      checked: false
    }));

    // 1. Existing general items
    const savedPacking = localStorage.getItem(packingKey);
    const savedPackingMeta = localStorage.getItem(packingMetaKey);
    if (savedPacking && savedPackingMeta === routeKey) {
      try {
        const parsed = JSON.parse(savedPacking);
        setPackingItems(parsed.length > 0 ? parsed : defaultAIItems);
      } catch (e) {
        setPackingItems(defaultAIItems);
      }
    } else {
      setPackingItems(defaultAIItems);
      localStorage.setItem(packingKey, JSON.stringify(defaultAIItems));
      localStorage.setItem(packingMetaKey, routeKey);
    }

    const defaultAIDocs = (itinerary.documentsList || []).map((doc, index) => ({
      id: `ai-doc-${index}`,
      name: doc.name,
      description: doc.reason,
      required: true,
      checked: false,
      type: "other" as const
    }));

    // 2. Destination-specific essentials checklist
    const savedEssentials = localStorage.getItem(essentialsKey);
    const savedEssentialsMeta = localStorage.getItem(essentialsMetaKey);
    if (savedEssentials && savedEssentialsMeta === essentialsRouteKey) {
      try {
        const parsed = JSON.parse(savedEssentials);
        setEssentials(parsed.length > 0 ? parsed : defaultAIDocs);
      } catch (e) {
        setEssentials(defaultAIDocs);
      }
    } else {
      setEssentials(defaultAIDocs);
      localStorage.setItem(essentialsKey, JSON.stringify(defaultAIDocs));
      localStorage.setItem(essentialsMetaKey, essentialsRouteKey);
    }
  }, [tripId, destination, originLocation, travelMode, itinerary.packingList, itinerary.documentsList]);

  useEffect(() => {
    let active = true;
    async function fetchPackingWeather() {
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        const location = geoData.results?.[0];
        if (!location) throw new Error("location_not_found");
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`);
        const weatherData = await weatherRes.json();
        const max = Math.round(weatherData.daily.temperature_2m_max[0]);
        const min = Math.round(weatherData.daily.temperature_2m_min[0]);
        const rain = weatherData.daily.precipitation_probability_max?.[0] || 0;
        if (active) {
          setWeatherSummary(`${min}-${max}C, ${rain}% rain chance`);
        }
      } catch {
        if (active) setWeatherSummary("Forecast unavailable; pack flexible layers.");
      }
    }
    fetchPackingWeather();
    return () => {
      active = false;
    };
  }, [destination]);



  // Toggle general packing item
  const handleToggleItem = (itemId: string) => {
    const updated = packingItems.map(item => {
      if (item.id === itemId) {
        return { ...item, checked: !item.checked };
      }
      return item;
    });
    setPackingItems(updated);
    localStorage.setItem(`wanderway_packing_${tripId}`, JSON.stringify(updated));
  };

  // Toggle mandatory essential item
  const handleToggleEssential = (essentialId: string) => {
    const updated = essentials.map(ess => {
      if (ess.id === essentialId) {
        return { ...ess, checked: !ess.checked };
      }
      return ess;
    });
    setEssentials(updated);
    localStorage.setItem(`wanderway_essentials_${tripId}`, JSON.stringify(updated));
  };

  // Generate AI Packing Suggestions
  const handleGenerateAISuggestions = async () => {
    try {
      setIsGenerating(true);
      setAiError(null);

      // Collect activity categories
      const activityTypes: string[] = [];
      if (itinerary?.days) {
        itinerary.days.forEach(day => {
          if (day.activities) {
            day.activities.forEach(act => {
              if (act.category && !activityTypes.includes(act.category)) {
                activityTypes.push(act.category);
              }
            });
          }
        });
      }

      const existingItemNames = packingItems.map(item => item.name);

      const data = await callApi<{ suggestions?: { name: string; category: PackingItem["category"]; description: string }[] }>("/api/packing/suggest", {
        method: "POST",
        body: JSON.stringify({
          destination,
          originLocation: originLocation || undefined,
          weather: weatherSummary,
          travelMode,
          activityTypes: activityTypes.length > 0 ? activityTypes : ["culture", "nature", "activity"],
          existingItemNames
        })
      });
      setAiSuggestions(data.suggestions || []);
    } catch (err: any) {
      console.error(err);
      setAiError("Could not retrieve AI recommendations. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Add suggestion item directly to packing list
  const handleAddSuggestionItem = (name: string, category: PackingItem["category"], description: string) => {
    const newItem: PackingItem = {
      id: `pack-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      category,
      name,
      description,
      checked: false
    };
    const updated = [...packingItems, newItem];
    setPackingItems(updated);
    localStorage.setItem(`wanderway_packing_${tripId}`, JSON.stringify(updated));
    setAddedSuggestions(prev => [...prev, name]);
  };

  // Add custom general packing item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: PackingItem = {
      id: `pack-${Date.now()}`,
      category: newItemCategory,
      name: newItemName.trim(),
      checked: false
    };

    const updated = [...packingItems, newItem];
    setPackingItems(updated);
    localStorage.setItem(`wanderway_packing_${tripId}`, JSON.stringify(updated));
    setNewItemName("");
  };

  // Add custom trip essential item
  const handleAddEssential = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEssentialName.trim()) return;

    const newEss: EssentialRequirement = {
      id: `ess-${Date.now()}`,
      name: newEssentialName.trim(),
      description: newEssentialDesc.trim() || "User added mandatory requirement.",
      required: true,
      checked: false,
      type: newEssentialType
    };

    const updated = [...essentials, newEss];
    setEssentials(updated);
    localStorage.setItem(`wanderway_essentials_${tripId}`, JSON.stringify(updated));

    setNewEssentialName("");
    setNewEssentialDesc("");
    setNewEssentialType("other");
    setShowAddEssentialForm(false);
  };

  // Delete custom trip essential item
  const handleDeleteEssential = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = essentials.filter(ess => ess.id !== id);
    setEssentials(updated);
    localStorage.setItem(`wanderway_essentials_${tripId}`, JSON.stringify(updated));
  };

  const categories: PackingItem["category"][] = [
    "Clothing",
    "Essentials & Toiletries",
    "Documents",
    "Activity-Specific"
  ];

  const getCategoryProgress = (cat: PackingItem["category"]) => {
    const items = packingItems.filter(i => i.category === cat);
    const checkedCount = items.filter(i => i.checked).length;
    return {
      total: items.length,
      packed: checkedCount,
      percentage: items.length > 0 ? (checkedCount / items.length) * 100 : 0
    };
  };

  // Calculate essentials progress
  const completedEssentials = essentials.filter(e => e.checked).length;
  const totalEssentials = essentials.length;
  const essentialsProgressPercent = totalEssentials > 0 ? (completedEssentials / totalEssentials) * 100 : 0;

  return (
    <div id="packing-screen" className="space-y-8 animate-fade-in print:hidden">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Smart Packing List
          </h1>
          <p className="font-sans text-xs text-slate-500 mt-1">
            AI-generated essentials checklist and mandatory route clearances for <span className="font-bold text-emerald-600">{routeLabel}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#8FBF7F]/10 text-[#4A8B5C] px-3.5 py-1.5 rounded-xl text-xs font-semibold self-start">
          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
          <span>Trip Checklist Synced</span>
        </div>
      </div>

      {/* Weather Suggestion card */}
      <section className="bg-gradient-to-r from-sky-400 to-teal-400 rounded-[24px] p-6 text-white shadow-lg shadow-sky-100 flex flex-col md:flex-row gap-6 items-center">
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
          <Sun className="w-8 h-8 text-white animate-pulse" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-extrabold text-base">
            Weather Forecast for {destination.split(",")[0]}
          </h3>
          <p className="font-sans text-xs text-white/90 leading-relaxed font-light">
            {weatherSummary}. Packing suggestions below adapt to the destination, activity mix, and preferred travel mode: {travelMode.replace("-", " ")}.
          </p>
        </div>
      </section>

      {/* Feature 1: AI-Driven Packing List suggestions */}
      <section className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center border border-violet-100">
              <Sparkles className="w-5 h-5 text-violet-600 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-base text-slate-900 flex items-center gap-1.5">
                AI Packing List suggestions
                <span className="text-[10px] font-bold text-violet-500 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  AI Smart Mode
                </span>
              </h2>
              <p className="font-sans text-[10px] text-slate-500 font-medium mt-0.5">
                Analyzes weather patterns and activity profiles of your itinerary to find smart packing omissions.
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateAISuggestions}
            disabled={isGenerating}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 disabled:from-slate-100 disabled:to-slate-100 disabled:text-slate-400 rounded-xl font-display font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing itinerary...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>{aiSuggestions.length > 0 ? "Refresh AI Checklist" : "Generate AI suggestions"}</span>
              </>
            )}
          </button>
        </div>

        {aiError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-[11px] font-sans">
            {aiError}
          </div>
        )}

        {aiSuggestions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiSuggestions.map((suggestion) => {
              const isAdded = addedSuggestions.includes(suggestion.name);
              return (
                <div
                  key={suggestion.name}
                  className="p-4 rounded-2xl border border-violet-100 bg-violet-50/10 hover:bg-violet-50/20 transition-all flex items-start justify-between gap-3 select-none"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.25 rounded">
                        {suggestion.category}
                      </span>
                      <h4 className="font-display font-bold text-xs text-slate-800 leading-none">
                        {suggestion.name}
                      </h4>
                    </div>
                    <p className="font-sans text-[10px] text-slate-500 leading-relaxed">
                      {suggestion.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleAddSuggestionItem(suggestion.name, suggestion.category, suggestion.description)}
                    disabled={isAdded}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${isAdded
                      ? "bg-slate-100 border-slate-200 text-slate-400"
                      : "bg-white border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-300"
                      }`}
                    title={isAdded ? "Added to packing list" : "Add to list"}
                  >
                    {isAdded ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-1">Added</span>
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          !isGenerating && (
            <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-slate-100 rounded-2xl">
              <Sparkles className="w-6 h-6 text-slate-300 mb-2" />
              <p className="font-display font-bold text-xs text-slate-500">No suggestions loaded yet</p>
              <p className="font-sans text-[10px] text-slate-400 max-w-xs mt-1">
                Click the generate button above to let Gemini audit your itinerary activities and recommend crucial items!
              </p>
            </div>
          )
        )}
      </section>

      {/* Feature 2: Destination Mandatory Essentials Checklist Component */}
      <section className="bg-gradient-to-br from-[#FAF8F5] to-white rounded-[24px] border-2 border-emerald-500/20 p-6 shadow-sm space-y-6">

        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <ShieldCheck className="w-5 h-5 text-emerald-600 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-base text-slate-900 flex items-center gap-1.5">
                Trip Essentials & Mandatory Clearances
                <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Critical
                </span>
              </h2>
              <p className="font-sans text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                Required checklist for crossing borders, checking in, and avoiding travel penalties for {routeLabel}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Custom Essentials button */}
            <button
              onClick={() => setShowAddEssentialForm(!showAddEssentialForm)}
              className="px-3 py-1.5 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/25 rounded-xl font-display font-semibold text-[10px] text-slate-600 hover:text-emerald-600 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Clearance</span>
            </button>

            <span className="font-mono text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
              {completedEssentials}/{totalEssentials} Cleared
            </span>
          </div>
        </div>

        {/* Global Essentials progress line */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-sans font-bold text-slate-400">
            <span>MANDATORY CLEARANCES PROGRESS</span>
            <span>{essentialsProgressPercent.toFixed(0)}% APPROVED</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-[#3B7A57] transition-all duration-700"
              style={{ width: `${essentialsProgressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Custom essential requirement inline adder form */}
        {showAddEssentialForm && (
          <form onSubmit={handleAddEssential} className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm space-y-3 animate-fade-in">
            <h4 className="font-display font-bold text-xs text-slate-800">New Travel Clearence Requirement</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Requirement (e.g. Yellow Fever Card)"
                value={newEssentialName}
                onChange={(e) => setNewEssentialName(e.target.value)}
                className="w-full bg-slate-50 border border-transparent focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-sans text-slate-800 outline-none transition-all"
              />
              <input
                type="text"
                placeholder="Additional advice / details"
                value={newEssentialDesc}
                onChange={(e) => setNewEssentialDesc(e.target.value)}
                className="w-full bg-slate-50 border border-transparent focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-sans text-slate-800 outline-none transition-all"
              />
              <div className="flex gap-2">
                <select
                  value={newEssentialType}
                  onChange={(e: any) => setNewEssentialType(e.target.value)}
                  className="bg-slate-50 border border-transparent focus:border-emerald-500 focus:bg-white rounded-xl px-2 py-2 text-xs font-sans text-slate-700 outline-none transition-all flex-1 cursor-pointer"
                >
                  <option value="identity">🪪 Identity Doc</option>
                  <option value="visa">🛂 Visa / Custom</option>
                  <option value="health">💉 Health / Vaccine</option>
                  <option value="finance">💳 Finance / Money</option>
                  <option value="other">📄 Other Checklist</option>
                </select>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-xl font-display font-bold text-xs shadow-sm cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Requirements grid list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {essentials.map((ess) => (
            <div
              key={ess.id}
              onClick={() => handleToggleEssential(ess.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 group relative select-none ${ess.checked
                ? "bg-slate-50/50 border-slate-200/80"
                : "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-xs"
                }`}
            >
              {/* Checkbox state */}
              <div className="shrink-0 mt-0.5">
                {ess.checked ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300 group-hover:text-slate-400" />
                )}
              </div>

              {/* Requirement descriptions */}
              <div className="space-y-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5">
                  <h4 className={`font-display font-bold text-xs break-words ${ess.checked ? "text-slate-400 line-through" : "text-slate-800"}`}>
                    {ess.name}
                  </h4>
                  {ess.required && !ess.checked && (
                    <span className="text-[7.5px] font-black text-rose-500 border border-rose-100 bg-rose-50 px-1 py-0.25 rounded shrink-0">
                      MANDATORY
                    </span>
                  )}
                </div>
                <p className={`font-sans text-[10px] leading-relaxed break-words ${ess.checked ? "text-slate-350" : "text-slate-500"}`}>
                  {ess.description}
                </p>
              </div>

              {/* Trash icon for user custom clearances */}
              {ess.id.startsWith("ess-") && (
                <button
                  onClick={(e) => handleDeleteEssential(ess.id, e)}
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-opacity p-1 cursor-pointer"
                  title="Remove requirement"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Dynamic warning banner if any mandatory clearances are not checked */}
        {essentials.some(e => e.required && !e.checked) && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-start gap-3 text-[11px] font-sans">
            <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Missing Vital Approvals:</span>
              <p className="text-slate-600 leading-relaxed font-light">
                One or more mandatory travel clearances or border papers have not been cleared. Double check visa issuance guidelines and local identity policies to secure seamless travel.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Split grid of categories */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {categories.map((cat) => {
          const catItems = packingItems.filter(item => item.category === cat);
          const progress = getCategoryProgress(cat);

          return (
            <div key={cat} className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-4">

              {/* Category Header with progress status */}
              <div className="flex justify-between items-baseline">
                <h3 className="font-display font-bold text-base text-slate-900">
                  {cat}
                </h3>
                <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {progress.packed}/{progress.total} Packed
                </span>
              </div>

              {/* Progress bar line */}
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#4FA8E0] to-[#3ACBB8] transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>

              {/* Checklist list */}
              <div className="space-y-3.5 pt-2">
                {catItems.map((item) => (
                  <button
                    key={item.id}
                    id={`packing-item-${item.id}`}
                    onClick={() => handleToggleItem(item.id)}
                    className="w-full flex items-start gap-3 p-1 rounded-lg text-left hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  >
                    {item.checked ? (
                      <CheckSquare className="w-5 h-5 text-[#3ACBB8] shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 group-hover:text-slate-400 shrink-0 mt-0.5" />
                    )}

                    <div className="space-y-0.5 text-left">
                      <span className={`font-sans text-xs font-semibold ${item.checked ? "text-slate-400 line-through" : "text-slate-700"
                        }`}>
                        {item.name}
                      </span>
                      {item.description && (
                        <p className={`font-sans text-[10px] leading-relaxed ${item.checked ? "text-slate-300" : "text-slate-400"
                          }`}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

            </div>
          );
        })}

      </section>

      {/* Manual item adder form */}
      <section className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
        <h3 className="font-display font-bold text-sm text-slate-900 mb-4">
          Add Custom Item
        </h3>

        <form onSubmit={handleAddItem} className="flex flex-col md:flex-row gap-4">
          <input
            id="input-new-packing-item"
            type="text"
            required
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add an item (e.g. Toothbrush, Portable charger)"
            className="flex-1 bg-slate-50 border border-transparent focus:border-[#4A8B5C] focus:bg-white rounded-xl px-4 py-3 text-sm font-sans text-slate-850 outline-none transition-all"
          />

          <select
            value={newItemCategory}
            onChange={(e: any) => setNewItemCategory(e.target.value)}
            className="bg-slate-50 border border-transparent focus:border-[#4A8B5C] focus:bg-white rounded-xl px-4 py-3 text-sm font-sans text-slate-700 outline-none transition-all"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
            id="add-packing-item-btn"
            type="submit"
            className="bg-[#4FA8E0] hover:bg-[#3db3e6] text-white px-6 py-3 rounded-xl font-display font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add to list</span>
          </button>
        </form>
      </section>

    </div>
  );
}
