import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Users,
  Calendar,
  Compass,
  Send,
  Sparkles,
  MapPin,
  ChevronRight,
  Check,
  AlertCircle,
  LocateFixed
} from "lucide-react";
import { ChatMessage, Itinerary } from "../types";
import { INITIAL_CHAT_MESSAGES } from "../data";
import { callApi } from "../lib/callApi";

interface PlannerFormViewProps {
  onItineraryGenerated: (itinerary: Itinerary) => void;
  onPlanningStatusChange: (isPlanning: boolean) => void;
}

export default function PlannerFormView({ onItineraryGenerated, onPlanningStatusChange }: PlannerFormViewProps) {
  const [plannerMode, setPlannerMode] = useState<"form" | "chat">("form");

  // Form State
  const [originLocation, setOriginLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [travelers, setTravelers] = useState(2);
  const [duration, setDuration] = useState(4);
  const [selectedVibes, setSelectedVibes] = useState<string[]>(["Heritage", "Nature"]);
  const [budget, setBudget] = useState(2000); // 1K per traveler initially (2 travelers = 2000)
  const [budgetRange, setBudgetRange] = useState<"luxury" | "mid-range" | "budget">("mid-range");
  const [travelStyle, setTravelStyle] = useState<"adventure" | "relaxation" | "cultural">("adventure");
  const [travelMode, setTravelMode] = useState("mixed");
  const [interests, setInterests] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const vibeOptions = [
    "Beach",
    "Mountains",
    "City Break",
    "Heritage",
    "Nature",
    "Adventure",
    "Spiritual",
    "Foodie"
  ];

  useEffect(() => {
    if (plannerMode === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, plannerMode, isChatTyping]);

  useEffect(() => {
    const minBudget = travelers * 1000;
    if (budget < minBudget) {
      setBudget(minBudget);
    }
  }, [travelers, budget]);

  const toggleVibe = (vibe: string) => {
    if (selectedVibes.includes(vibe)) {
      setSelectedVibes(selectedVibes.filter(v => v !== vibe));
    } else {
      setSelectedVibes([...selectedVibes, vibe]);
    }
  };

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Current location is not available in this browser.");
      return Promise.resolve<string | null>(null);
    }

    setLocationError(null);
    setIsDetectingLocation(true);

    return new Promise<string | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const detectedLocation = `Current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          setOriginLocation(detectedLocation);
          setIsDetectingLocation(false);
          resolve(detectedLocation);
        },
        () => {
          setLocationError("Location permission was denied. Type your starting city to create the plan.");
          setIsDetectingLocation(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  };

  const handleUseCurrentLocation = () => {
    void detectCurrentLocation();
  };

  const resolveRequiredOriginLocation = async () => {
    const typedOrigin = originLocation.trim();
    if (typedOrigin) {
      setLocationError(null);
      return typedOrigin;
    }

    const detectedOrigin = await detectCurrentLocation();
    if (detectedOrigin) return detectedOrigin;

    setLocationError("A starting location is required so the plan can begin from where you are travelling.");
    return null;
  };

  const handleGenerateItinerary = async () => {
    const resolvedOriginLocation = await resolveRequiredOriginLocation();
    if (!resolvedOriginLocation) return;

    setIsGenerating(true);
    onPlanningStatusChange(true);
    setGenerationStep(1);

    // Beautiful step-by-step loading messages
    const steps = [
      "Analyzing historic spots and climate conditions...",
      "Curating premium local stays and scenic dining...",
      "Optimizing routes for seamless transportation...",
      "Structuring daily timelines and consensus checks..."
    ];

    let currentStep = 1;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setGenerationStep(currentStep + 1);
        currentStep++;
      }
    }, 900);

    try {
      const data = await callApi<{ itinerary?: Itinerary }>("/api/generate-itinerary", {
        method: "POST",
        body: JSON.stringify({
          destination,
          originLocation: resolvedOriginLocation,
          travelers,
          duration,
          vibe: selectedVibes,
          budget,
          budgetRange,
          travelStyle,
          travelMode,
          interests
        })
      });
      clearInterval(interval);

      // Artificial slight delay for maximum satisfaction
      setTimeout(() => {
        setIsGenerating(false);
        onPlanningStatusChange(false);
        if (data.itinerary) {
          onItineraryGenerated(data.itinerary);
        }
      }, 600);

    } catch (err) {
      console.error(err);
      clearInterval(interval);
      setIsGenerating(false);
      onPlanningStatusChange(false);
    }
  };

  const handleSendChatMessage = async (textToSend?: string) => {
    const messageText = textToSend || chatInput;
    if (!messageText.trim()) return;

    const resolvedOriginLocation = await resolveRequiredOriginLocation();
    if (!resolvedOriginLocation) return;

    if (!textToSend) setChatInput("");

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      content: messageText,
      timestamp: "Just now"
    };

    setChatMessages(prev => [...prev, newUserMessage]);
    setIsChatTyping(true);
    onPlanningStatusChange(true);

    try {
      const data = await callApi<{ reply?: string; itinerary?: Itinerary }>("/api/generate-itinerary-from-chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [...chatMessages, newUserMessage],
          defaults: {
            originLocation: resolvedOriginLocation,
            destination: destination.trim() || undefined,
            travelers,
            duration,
            vibe: selectedVibes,
            budget,
            budgetRange,
            travelStyle,
            travelMode,
            interests
          }
        })
      });

      const newAiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        content: data.reply || "I created an itinerary from your chat.",
        timestamp: "Just now"
      };

      setChatMessages(prev => [...prev, newAiMessage]);
      if (data.itinerary) {
        onItineraryGenerated(data.itinerary);
      }
      setIsChatTyping(false);
      onPlanningStatusChange(false);
    } catch (err) {
      console.error(err);
      setIsChatTyping(false);
      onPlanningStatusChange(false);
    }
  };

  return (
    <div id="planner-screen" className="max-w-4xl mx-auto space-y-6">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">
            Plan Your Next Trip
          </h1>
          <p className="font-sans text-xs text-slate-400 mt-1">
            Let's design a custom AI-guided experience designed precisely for your group.
          </p>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex p-1 bg-slate-100 rounded-xl self-start">
          <button
            id="planner-mode-form"
            onClick={() => setPlannerMode("form")}
            className={`px-4 py-2 text-xs font-sans font-semibold rounded-lg cursor-pointer transition-all ${plannerMode === "form"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
              }`}
          >
            Form Mode
          </button>
          <button
            id="planner-mode-chat"
            onClick={() => setPlannerMode("chat")}
            className={`px-4 py-2 text-xs font-sans font-semibold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${plannerMode === "chat"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
              }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#4FA8E0]" />
            <span>Chat Mode</span>
          </button>
        </div>
      </div>

      {isGenerating ? (
        /* Dynamic Loading Screen with high-fidelity step logs */
        <div className="bg-white rounded-[24px] border border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[420px] shadow-sm animate-fade-in">
          <div className="relative mb-8">
            {/* Spinning ambient gradients */}
            <div className="w-20 h-20 rounded-full border-4 border-slate-100 border-t-sky-400 animate-spin"></div>
            <Sparkles className="w-8 h-8 text-[#3ACBB8] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pulse-ring" />
          </div>

          <h3 className="font-display font-bold text-lg text-slate-900">
            Crafting Your Experience
          </h3>
          <p className="font-sans text-xs text-slate-500 mt-1 max-w-sm">
            WanderWay Travel AI is curating the ultimate itinerary for your trip to {destination}...
          </p>

          <div className="mt-8 space-y-2.5 max-w-xs w-full text-left">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className={`w-2 h-2 rounded-full ${generationStep >= 1 ? "bg-[#3ACBB8]" : "bg-slate-200"}`}></span>
              <span className={generationStep === 1 ? "text-slate-900 font-semibold animate-pulse" : ""}>Analyzing historic spots...</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className={`w-2 h-2 rounded-full ${generationStep >= 2 ? "bg-[#3ACBB8]" : "bg-slate-200"}`}></span>
              <span className={generationStep === 2 ? "text-slate-900 font-semibold animate-pulse" : ""}>Curating local stays...</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className={`w-2 h-2 rounded-full ${generationStep >= 3 ? "bg-[#3ACBB8]" : "bg-slate-200"}`}></span>
              <span className={generationStep === 3 ? "text-slate-900 font-semibold animate-pulse" : ""}>Optimizing travel routes...</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className={`w-2 h-2 rounded-full ${generationStep >= 4 ? "bg-[#3ACBB8]" : "bg-slate-200"}`}></span>
              <span className={generationStep === 4 ? "text-slate-900 font-semibold animate-pulse" : ""}>Structuring timelines...</span>
            </div>
          </div>
        </div>
      ) : plannerMode === "form" ? (
        /* Form Mode View */
        <div className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm space-y-8 animate-fade-in">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Column 1: Destination, Travelers, Duration */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Starting from
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      id="input-planner-origin"
                      type="text"
                      value={originLocation}
                      onChange={(e) => setOriginLocation(e.target.value)}
                      placeholder="Home city or current location"
                      className="w-full bg-slate-50 rounded-xl py-3.5 pl-12 pr-4 border border-transparent focus:border-[#4FA8E0] focus:bg-white focus:ring-0 focus:outline-none transition-all font-sans text-sm text-slate-800"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isDetectingLocation}
                    className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#4FA8E0] hover:border-[#4FA8E0]/40 disabled:text-slate-300 disabled:bg-slate-50 flex items-center justify-center transition-all cursor-pointer"
                    title="Use current location"
                    aria-label="Use current location"
                  >
                    <LocateFixed className={`w-5 h-5 ${isDetectingLocation ? "animate-spin" : ""}`} />
                  </button>
                </div>
                {locationError ? (
                  <p className="text-[10px] text-amber-600 pl-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{locationError}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 pl-1">
                    Helps WanderWay plan the route from where you are leaving to your destination.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Where do you want to go?
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    id="input-planner-destination"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Search destinations (e.g. Kyoto, Goa, Paris)"
                    className="w-full bg-slate-50 rounded-xl py-3.5 pl-12 pr-4 border border-transparent focus:border-[#4FA8E0] focus:bg-white focus:ring-0 focus:outline-none transition-all font-sans text-sm text-slate-800"
                  />
                </div>
                <p className="text-[10px] text-slate-400 pl-1">
                  Add a destination to generate your first personalized plan.
                </p>
              </div>

              {/* Steppers in Flex Container */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Travelers
                  </label>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                    <button
                      type="button"
                      onClick={() => setTravelers(prev => Math.max(1, prev - 1))}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-slate-50 flex items-center justify-center font-bold text-slate-600 transition-colors shadow-sm cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#4FA8E0]" />
                      {travelers}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTravelers(prev => prev + 1)}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-slate-50 flex items-center justify-center font-bold text-slate-600 transition-colors shadow-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Duration
                  </label>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                    <button
                      type="button"
                      onClick={() => setDuration(prev => Math.max(1, prev - 1))}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-slate-50 flex items-center justify-center font-bold text-slate-600 transition-colors shadow-sm cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#4FA8E0]" />
                      {duration} Days
                    </span>
                    <button
                      type="button"
                      onClick={() => setDuration(prev => prev + 1)}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-slate-50 flex items-center justify-center font-bold text-slate-600 transition-colors shadow-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Travel Style Selectors */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Travel Style
                </label>
                <div className="flex gap-2">
                  {["adventure", "relaxation", "cultural"].map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setTravelStyle(style as any)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize border cursor-pointer transition-all ${travelStyle === style
                          ? "bg-[#8FBF7F]/10 text-[#4A8B5C] border-[#8FBF7F]/40 font-semibold"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Travel Mode */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Preferred Travel Mode
                </label>
                <select
                  value={travelMode}
                  onChange={(e) => setTravelMode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#4FA8E0] focus:bg-white"
                >
                  <option value="mixed">Mixed / flexible</option>
                  <option value="flight">Flights</option>
                  <option value="train">Train</option>
                  <option value="car">Private car / road trip</option>
                  <option value="public-transit">Public transit</option>
                  <option value="walking">Walking-first</option>
                  <option value="bike">Bike / scooter</option>
                </select>
              </div>

              {/* Specific Interests Selectors */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Specific Interests
                </label>
                <div className="flex flex-wrap gap-2">
                  {["hiking", "museums", "foodie", "shopping", "photography"].map((interest) => {
                    const isSelected = interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setInterests(interests.filter(i => i !== interest));
                          } else {
                            setInterests([...interests, interest]);
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border cursor-pointer capitalize transition-all ${isSelected
                            ? "bg-sky-50 text-[#4FA8E0] border-[#4FA8E0]/40 font-semibold"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        <span>{interest}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Column 2: Vibes, Budget */}
            <div className="space-y-6">
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  What's your vibe?
                </label>
                <div className="flex flex-wrap gap-2">
                  {vibeOptions.map((vibe) => {
                    const isSelected = selectedVibes.includes(vibe);
                    return (
                      <button
                        key={vibe}
                        type="button"
                        onClick={() => toggleVibe(vibe)}
                        className={`px-3.5 py-1.5 rounded-full font-sans text-xs font-medium cursor-pointer transition-all flex items-center gap-1 border ${isSelected
                            ? "bg-[#8FBF7F]/10 text-[#4A8B5C] border-[#8FBF7F]/40 font-semibold"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#4A8B5C]" />}
                        <span>{vibe}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Budget Profile Selectors */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Budget Profile
                </label>
                <div className="flex gap-2">
                  {["budget", "mid-range", "luxury"].map((profile) => (
                    <button
                      key={profile}
                      type="button"
                      onClick={() => setBudgetRange(profile as any)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize border cursor-pointer transition-all ${budgetRange === profile
                          ? "bg-[#E8A66B]/10 text-[#c27633] border-[#E8A66B]/40 font-semibold"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      {profile}
                    </button>
                  ))}
                </div>
              </div>

              {/* Range slider styled with Earth Orange Secondary theme */}
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Budget Estimate
                  </label>
                  <span className="font-display font-extrabold text-[#E8A66B] text-lg">
                    ₹{budget.toLocaleString()}
                  </span>
                </div>

                <input
                  id="budget-range-slider"
                  type="range"
                  min={1000 * travelers}
                  max="200000"
                  step="1000"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#E8A66B]"
                />

                <div className="flex justify-between text-[10px] font-sans text-slate-400 font-medium px-0.5">
                  <span>Min (₹{(1000 * travelers).toLocaleString()})</span>
                  <span>Premium Luxury (₹2L+)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button styled with Primary Sky-Teal Gradient */}
          <div className="pt-4 border-t border-slate-100">
            <button
              id="generate-itinerary-btn"
              onClick={handleGenerateItinerary}
              className="w-full bg-gradient-to-r from-[#4FA8E0] to-[#3ACBB8] text-white py-4 rounded-xl font-display font-semibold text-sm shadow-md shadow-sky-100 hover:shadow-lg hover:shadow-sky-200 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="w-5 h-5 animate-pulse" />
              <span>Generate Itinerary</span>
            </button>
          </div>
        </div>
      ) : (
        /* Chat Mode View */
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Starting from
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={originLocation}
                    onChange={(e) => setOriginLocation(e.target.value)}
                    placeholder="Home city or current location"
                    className="w-full bg-slate-50 rounded-xl py-2.5 pl-9 pr-3 border border-transparent focus:border-[#4FA8E0] focus:bg-white focus:outline-none transition-all font-sans text-xs text-slate-800"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Going to
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Destination city"
                    className="w-full bg-slate-50 rounded-xl py-2.5 pl-9 pr-3 border border-transparent focus:border-[#4FA8E0] focus:bg-white focus:outline-none transition-all font-sans text-xs text-slate-800"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isDetectingLocation}
                className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-[#4FA8E0] hover:border-[#4FA8E0]/40 disabled:text-slate-300 disabled:bg-slate-50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Use current location"
              >
                <LocateFixed className={`w-4 h-4 ${isDetectingLocation ? "animate-spin" : ""}`} />
                <span className="text-xs font-semibold">Use Location</span>
              </button>
            </div>
            {locationError && (
              <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{locationError}</span>
              </p>
            )}
          </div>

          <div className="bg-white rounded-[24px] border border-slate-200 h-[650px] shadow-sm flex flex-col overflow-hidden animate-fade-in">
          {/* Chat conversation area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar bg-slate-50/50">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
              >
                {/* Message Bubble */}
                <div className={`p-4 rounded-2xl font-sans text-sm leading-relaxed ${msg.sender === "user"
                    ? "bg-[#4FA8E0] text-white rounded-tr-sm"
                    : "bg-white text-slate-800 rounded-tl-sm border border-slate-200 shadow-sm"
                  }`}>
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>

                <span className="text-[10px] text-slate-400 mt-1 font-medium px-1">
                  {msg.timestamp}
                </span>

                {/* Render proposal rich cards inside AI message */}
                {msg.richCard && (
                  <div className="mt-3 bg-white rounded-2xl border border-slate-200 shadow-md p-4 w-full max-w-[420px] overflow-hidden group">
                    <div className="relative h-28 rounded-xl overflow-hidden mb-3 bg-slate-100">
                      <img
                        src={msg.richCard.image}
                        alt="Trip preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="bg-[#8FBF7F]/10 text-[#4A8B5C] text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">
                          {msg.richCard.location}
                        </span>
                        <h4 className="font-display font-bold text-sm text-slate-900 mt-1">
                          {msg.richCard.title}
                        </h4>
                        <p className="font-sans text-xs text-slate-500 mt-0.5 leading-snug">
                          {msg.richCard.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-y border-slate-100 py-2">
                        <div className="text-center">
                          <span className="block text-[9px] text-slate-400 font-semibold uppercase">Days</span>
                          <span className="font-display font-bold text-xs text-slate-700">{msg.richCard.duration}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[9px] text-slate-400 font-semibold uppercase">Cost</span>
                          <span className="font-display font-bold text-xs text-[#E8A66B]">{msg.richCard.budget}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[9px] text-slate-400 font-semibold uppercase">Key Spots</span>
                          <span className="font-display font-bold text-[10px] text-[#4A8B5C] truncate block">Top Highlights</span>
                        </div>
                      </div>

                      <button
                        onClick={handleGenerateItinerary}
                        className="w-full bg-[#4FA8E0] hover:bg-[#3db3e6] text-white py-2 rounded-xl font-display font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Explore Itinerary</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isChatTyping && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-3.5 rounded-full w-20 shadow-sm mr-auto">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick suggestions chips */}
          <div className="px-6 py-2 flex gap-2 border-t border-slate-200 bg-white overflow-x-auto hide-scrollbar shrink-0">
            <button
              onClick={() => handleSendChatMessage("Add mountains to the itinerary")}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-full font-sans text-xs text-slate-500 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              ⛰️ Add mountains
            </button>
            <button
              onClick={() => handleSendChatMessage("Change duration to 3 days")}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-full font-sans text-xs text-slate-500 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              📅 3 days
            </button>
            <button
              onClick={() => handleSendChatMessage("Keep the total budget under ₹50,000")}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-full font-sans text-xs text-slate-500 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              💰 ₹50k budget
            </button>
          </div>

          {/* Input Panel */}
          <div className="p-4 bg-white border-t border-slate-200 flex gap-2 shrink-0">
            <input
              id="input-chat-query"
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
              placeholder="Ask WanderWay Travel AI..."
              className="flex-1 bg-slate-50 border border-transparent focus:border-[#4FA8E0] focus:bg-white rounded-xl px-4 py-3 text-sm font-sans text-slate-800 outline-none"
            />
            <button
              id="btn-send-chat-query"
              onClick={() => handleSendChatMessage()}
              className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#4FA8E0] to-[#3ACBB8] text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
