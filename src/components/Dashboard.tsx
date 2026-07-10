import React, { useState, useMemo } from "react";
import { Compass, CalendarDays, MapPin, ArrowRight, Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Itinerary } from "../types";

interface DashboardViewProps {
  onPlanNewTrip: () => void;
  onViewItinerary: (itinerary: Itinerary) => void;
  tripsList: Itinerary[];
  currentUser: { name: string; email: string; avatar: string } | null;
}

export default function DashboardView({ 
  onPlanNewTrip, 
  onViewItinerary, 
  tripsList, 
  currentUser 
}: DashboardViewProps) {
  // Sorting & Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");

  // Dynamically extract unique vibes from available trips list
  const availableVibes = useMemo(() => {
    const vibes = new Set<string>();
    tripsList.forEach(t => {
      if (t.tripType) vibes.add(t.tripType);
    });
    return ["all", ...Array.from(vibes)];
  }, [tripsList]);

  // Sort and filter the active trips list
  const filteredAndSortedTrips = useMemo(() => {
    let list = [...tripsList];

    // 1. Filter by search term (destination or title)
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      list = list.filter(t => 
        (t.destination && t.destination.toLowerCase().includes(term)) ||
        (t.title && t.title.toLowerCase().includes(term))
      );
    }

    // 2. Filter by Vibe (Trip Type)
    if (selectedVibe !== "all") {
      list = list.filter(t => t.tripType === selectedVibe);
    }

    // 3. Sort
    list.sort((a, b) => {
      if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      if (sortBy === "newest") {
        return timeB - timeA;
      } else {
        return timeA - timeB;
      }
    });

    return list;
  }, [tripsList, searchTerm, selectedVibe, sortBy]);

  const welcomeName = currentUser ? currentUser.name.split(" ")[0] : "Traveler";

  return (
    <div id="dashboard-view" className="space-y-10 animate-fade-in">
      
      {/* Dynamic Greeting Section */}
      <section className="space-y-1.5">
        <h1 className="font-display text-3xl font-extrabold text-slate-800 tracking-tight">
          Namaste, {welcomeName}!
        </h1>
        <p className="font-sans text-sm text-slate-500">
          Where are we heading next? Let's design another tailored AI-native getaway.
        </p>
      </section>

      {/* Hero Banner CTA styled with Sunset Accent Gradient */}
      <section>
        <div 
          onClick={onPlanNewTrip}
          className="bg-gradient-to-r from-[#FF8A65] to-[#FFB74D] rounded-[24px] p-8 md:p-12 text-white shadow-xl shadow-orange-100/50 relative overflow-hidden group cursor-pointer hover:shadow-2xl hover:shadow-orange-200/50 hover:scale-[1.005] transition-all duration-500"
        >
          {/* Decorative Ambient Shapes */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl"></div>

          <div className="relative z-10 max-w-lg space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Compass className="w-6 h-6 text-white" />
            </div>
            
            <div className="space-y-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                Plan New AI Trip
              </h2>
              <p className="font-sans text-sm md:text-base text-white/90 leading-relaxed font-light">
                Let WanderWay's travel AI craft your customized itinerary based on your dynamic style, budget limits, and group goals.
              </p>
            </div>

            <button 
              id="start-planning-hero-btn"
              onClick={(e) => {
                e.stopPropagation();
                onPlanNewTrip();
              }}
              className="bg-white text-[#FF8A65] font-display font-bold text-xs px-6 py-3 rounded-full hover:bg-slate-50 active:scale-95 transition-all inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>Start Planning</span>
              <ArrowRight className="w-4 h-4 text-[#FF8A65] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Controls: Sorting and Filtering Interface */}
      <section className="bg-white rounded-[20px] border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by destination..."
              className="w-full bg-slate-50 border border-transparent rounded-xl py-2.5 pl-10 pr-4 focus:bg-white focus:border-[#4FA8E0] focus:outline-none font-sans text-xs text-slate-800 placeholder:text-slate-400 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto justify-end">
            
            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select 
                value={selectedVibe}
                onChange={(e) => setSelectedVibe(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-sans text-slate-600 focus:outline-none focus:border-[#4FA8E0] capitalize cursor-pointer"
              >
                {availableVibes.map((vibe) => (
                  <option key={vibe} value={vibe}>
                    {vibe === "all" ? "All Trip Types" : `${vibe} Trips`}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-sans text-slate-600 focus:outline-none focus:border-[#4FA8E0] cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Alphabetical (A-Z)</option>
              </select>
            </div>

          </div>
        </div>
      </section>

      {/* Active Trips Slider / List */}
      <section className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <h3 className="font-display text-lg font-bold text-slate-800">
            Active Tailored Trips ({filteredAndSortedTrips.length})
          </h3>
        </div>

        {filteredAndSortedTrips.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-slate-200 p-12 text-center text-slate-400 font-sans text-xs space-y-3">
            <Compass className="w-8 h-8 text-slate-300 mx-auto" />
            <p>No trips found matching your current filter choices.</p>
            <button 
              onClick={() => { setSearchTerm(""); setSelectedVibe("all"); }}
              className="text-[#4FA8E0] font-bold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedTrips.map((trip) => {
              const collaborators = trip.collaborators || [];
              const commentCount = trip.comments?.length || 0;
              const hasKey = trip.id === "hampi-heritage-trail";

              // Distinct color mapping based on destination name length
              const colorSchemes = [
                "from-sky-400 to-teal-400",
                "from-orange-400 to-amber-500",
                "from-emerald-400 to-green-500",
                "from-purple-400 to-pink-500"
              ];
              const schemeIdx = (trip.destination?.length || 0) % colorSchemes.length;
              const cardColor = colorSchemes[schemeIdx];

              return (
                <div
                  key={trip.id}
                  onClick={() => onViewItinerary(trip)}
                  className="bg-white rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 overflow-hidden flex flex-col cursor-pointer group"
                >
                  <div className={`h-32 bg-gradient-to-br ${cardColor} relative p-4 flex flex-col justify-between`}>
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="bg-white/20 backdrop-blur-md text-white font-sans font-medium text-[10px] px-2.5 py-1 rounded-full self-start flex items-center gap-1 uppercase tracking-wider">
                      <MapPin className="w-3 h-3" />
                      <span>{trip.destination || "Scenic"}</span>
                    </span>
                    <span className="bg-white text-slate-800 font-display font-bold text-[9px] px-2.5 py-0.5 rounded uppercase tracking-wider self-end shadow-sm">
                      {trip.tripType || "Cultural"}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <h4 className="font-display font-bold text-base text-slate-800 group-hover:text-[#4FA8E0] transition-colors leading-snug">
                        {trip.title}
                      </h4>
                      <p className="font-sans text-[11px] text-slate-400 flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>{trip.durationDays} Days • {trip.travelersCount} Travelers</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      {/* Avatar Stack */}
                      <div className="flex -space-x-1.5">
                        {collaborators.slice(0, 3).map((collab, idx) => (
                          <img 
                            key={collab.email + idx}
                            src={collab.avatar} 
                            alt={collab.name} 
                            className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-sm" 
                            title={collab.name}
                          />
                        ))}
                        {collaborators.length > 3 && (
                          <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-slate-600 font-display font-bold text-[9px] shadow-sm">
                            +{collaborators.length - 3}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {commentCount > 0 && (
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-sans text-slate-500 font-medium mr-1">
                            💬 {commentCount} logs
                          </span>
                        )}
                        <span className="text-[#4FA8E0] text-xs font-display font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Open <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Suggestion Bento Box - Weekend Escapes */}
      <section className="space-y-4">
        <h3 className="font-display text-lg font-bold text-slate-800">
          Curated Weekend Escapes
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Bento Item 1 - Munnar Tea Estates */}
          <div 
            onClick={() => {
              const hampiTrip = tripsList.find(t => t.id === "hampi-heritage-trail");
              if (hampiTrip) onViewItinerary(hampiTrip);
            }}
            className="col-span-1 md:col-span-2 bg-white rounded-[24px] border border-slate-200 p-5 flex flex-col md:flex-row gap-5 items-center hover:shadow-md hover:scale-[1.002] transition-all cursor-pointer group"
          >
            <div className="w-full md:w-1/2 h-36 bg-slate-100 rounded-xl relative overflow-hidden shrink-0">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDm81RrX0TPWVIHXnrdre98Zl5750emb68IUJxUyafuMqNn_pLEL9fdYuZqzyzMUmpbddwhR5RiV2Wq_gil7MP2KvVI8cs9io5Thfj_eNUcal_Szag5B8O7s8OF3KGTrGN0BOQ4t9Ex1gWFAUaAYegi-10mXpD5t9-Jcy2BNlnFoq25dDoi8BfaFbRkGixqB2BXrXm--fMCIDXVER9WiuZAxeNkrpDL9HaaZMD5qRPphZVwrM8s26fgAP5Y44xVdSkrOMRz4nAIQqY" 
                alt="Munnar Tea Estates" 
                className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="space-y-3 w-full">
              <span className="bg-[#8FBF7F]/10 text-[#4A8B5C] px-2 py-1 rounded-lg text-[9px] font-bold inline-block uppercase tracking-wider">
                Nature Retreat
              </span>
              <div>
                <h4 className="font-display font-bold text-sm text-slate-800">
                  Munnar Tea Estates
                </h4>
                <p className="font-sans text-xs text-slate-400 mt-1 leading-relaxed">
                  Escape the summer heat in the lush green rolling hills, cool mist, and tranquil environments of Kerala.
                </p>
              </div>
              <button className="text-[#4FA8E0] font-sans font-semibold text-xs inline-flex items-center gap-1 group-hover:translate-x-1 transition-all cursor-pointer">
                <span>Explore Itinerary</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bento Item 2 - Jaipur Heritage */}
          <div 
            onClick={() => {
              const hampiTrip = tripsList.find(t => t.id === "hampi-heritage-trail");
              if (hampiTrip) onViewItinerary(hampiTrip);
            }}
            className="col-span-1 bg-white rounded-[24px] border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md hover:scale-[1.002] transition-all cursor-pointer group"
          >
            <div className="space-y-1">
              <span className="bg-[#E8A66B]/10 text-[#D9895B] px-2 py-1 rounded-lg text-[9px] font-bold inline-block uppercase tracking-wider">
                City Break
              </span>
              <h4 className="font-display font-bold text-sm text-slate-800">
                Jaipur Heritage
              </h4>
              <p className="font-sans text-xs text-slate-400 leading-snug">
                A quick dive into royal architecture, fort structures, and vibrant local bazaars.
              </p>
            </div>
            <div className="h-16 bg-slate-100 rounded-xl mt-4 relative overflow-hidden">
              <img 
                className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" 
                data-alt="Jaipur palace" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYUUVfR9NEH2KcZ_PdQKAukV9-ijMMNFjxn-jGopMXErzvs7czIJ5eAz21q-Lu5XvSPjqR4keHcmCou4bZTLfAKQe_IFWJzfDc1blwlcFW-CR-WFxtFoVfGb7fjEtiQzTDj2iRPzZJjJxkSCtZQussnv7FXXCqiw1F5BieEAmOW8eOeclFO7o-i--EW24c77bx5M9I1mbUgYPsJJH_beU3_SANcAyzkSmOQC6sh-mtSx9lRQREFiD0EbYkuA8XO2NNY0prlZ1s0sw"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
