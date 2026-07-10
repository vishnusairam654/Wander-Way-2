import React, { useState } from "react";
import { 
  CalendarDays, 
  Users, 
  MapPin, 
  ThumbsUp, 
  ThumbsDown, 
  Sparkles, 
  Star, 
  DollarSign,
  Compass,
  CornerDownRight,
  Send,
  AlertCircle,
  Printer,
  Calendar,
  Download,
  Check
} from "lucide-react";
import { Itinerary, Activity } from "../types";
import WeatherWidget from "./WeatherWidget";
import MiniMapWidget from "./MiniMapWidget";
import TripMemoriesGallery from "./TripMemoriesGallery";
import DayWeatherWidget from "./DayWeatherWidget";
import TripSummaryCard from "./TripSummaryCard";

interface ItineraryViewProps {
  itinerary: Itinerary;
  onActivityVote: (dayIndex: number, activityIndex: number, voteType: "up" | "down") => void;
}

export default function ItineraryView({ itinerary, onActivityVote }: ItineraryViewProps) {
  const [activeDay, setActiveDay] = useState<number>(1);
  const [showAiPopup, setShowAiPopup] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswers, setAiAnswers] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const handleShareTrip = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2000);
  };

  const [completedActivityIds, setCompletedActivityIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`wanderway_completed_${itinerary.id || "hampi"}`);
    return saved ? JSON.parse(saved) : [];
  });

  const toggleActivityCompleted = (actId: string) => {
    const next = completedActivityIds.includes(actId)
      ? completedActivityIds.filter((id) => id !== actId)
      : [...completedActivityIds, actId];
    setCompletedActivityIds(next);
    localStorage.setItem(`wanderway_completed_${itinerary.id || "hampi"}`, JSON.stringify(next));
  };

  const totalActivities = itinerary.days.reduce((total, day) => total + (day.activities?.length || 0), 0);
  const completedActivitiesCount = itinerary.days.reduce((total, day) => {
    const dayCompletedCount = day.activities?.filter((act) => completedActivityIds.includes(act.id || `${day.dayNumber}-${act.title}`)).length || 0;
    return total + dayCompletedCount;
  }, 0);
  const completionPercentage = totalActivities > 0 ? Math.round((completedActivitiesCount / totalActivities) * 100) : 0;

  const parseActivityTime = (timeStr: string) => {
    let hour = 9;
    let min = 0;
    try {
      const cleaned = timeStr.replace(/\s+/g, " ").trim();
      const match = cleaned.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (match) {
        hour = Number(match[1]);
        min = Number(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hour < 12) {
          hour += 12;
        } else if (ampm === "AM" && hour === 12) {
          hour = 0;
        }
      } else {
        const matchSimple = cleaned.match(/^(\d+)\s*(AM|PM)$/i);
        if (matchSimple) {
          hour = Number(matchSimple[1]);
          const ampm = matchSimple[2].toUpperCase();
          if (ampm === "PM" && hour < 12) {
            hour += 12;
          } else if (ampm === "AM" && hour === 12) {
            hour = 0;
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse time:", timeStr, e);
    }
    return { hour, min };
  };

  const handleExportICS = () => {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//WanderWay//Itinerary Export//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    const baseYear = 2026;
    const baseMonth = 10; // October
    const baseDay = 12;

    itinerary.days.forEach((day) => {
      const currentDayOffset = day.dayNumber - 1;
      const eventDate = new Date(baseYear, baseMonth - 1, baseDay + currentDayOffset);
      const dateStr = eventDate.toISOString().slice(0, 10).replace(/-/g, "");

      if (day.activities && day.activities.length > 0) {
        day.activities.forEach((activity, actIdx) => {
          const { hour, min } = parseActivityTime(activity.time || "09:00 AM");
          const pad = (num: number) => String(num).padStart(2, "0");
          const dtStart = `${dateStr}T${pad(hour)}${pad(min)}00`;
          const dtEnd = `${dateStr}T${pad(Math.min(23, hour + 2))}${pad(min)}00`;

          const cleanTitle = activity.title.replace(/[,;]/g, "");
          const cleanDesc = (activity.description || "Scenic travel excursion with WanderWay")
            .replace(/[,;]/g, "")
            .replace(/\n/g, "\\n");
          const cleanLoc = (activity.bestPart ? `Highlight: ${activity.bestPart}` : itinerary.destination || "Hampi")
            .replace(/[,;]/g, "");

          lines.push("BEGIN:VEVENT");
          lines.push(`UID:wanderway-${itinerary.id || "hampi"}-${day.dayNumber}-${actIdx}@wanderway.com`);
          lines.push(`DTSTAMP:${dateStr}T090000Z`);
          lines.push(`DTSTART;TZID=Asia/Kolkata:${dtStart}`);
          lines.push(`DTEND;TZID=Asia/Kolkata:${dtEnd}`);
          lines.push(`SUMMARY:${cleanTitle}`);
          lines.push(`DESCRIPTION:${cleanDesc}`);
          lines.push(`LOCATION:${cleanLoc}`);
          lines.push("STATUS:CONFIRMED");
          lines.push("SEQUENCE:0");
          lines.push("END:VEVENT");
        });
      } else {
        const startDayStr = dateStr;
        const nextDay = new Date(baseYear, baseMonth - 1, baseDay + currentDayOffset + 1);
        const endDayStr = nextDay.toISOString().slice(0, 10).replace(/-/g, "");

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:wanderway-${itinerary.id || "hampi"}-${day.dayNumber}-allday@wanderway.com`);
        lines.push(`DTSTAMP:${dateStr}T090000Z`);
        lines.push(`DTSTART;VALUE=DATE:${startDayStr}`);
        lines.push(`DTEND;VALUE=DATE:${endDayStr}`);
        lines.push(`SUMMARY:Day ${day.dayNumber}: ${day.title || "Sightseeing"}`);
        lines.push(`DESCRIPTION:Enjoying curated schedule in ${itinerary.destination || "destination"}`);
        lines.push(`LOCATION:${itinerary.destination || "Hampi"}`);
        lines.push("STATUS:CONFIRMED");
        lines.push("SEQUENCE:0");
        lines.push("END:VEVENT");
      }
    });

    lines.push("END:VCALENDAR");

    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `wanderway_${(itinerary.destination || "trip").toLowerCase().replace(/[^a-z0-9]/g, "_")}_calendar.ics`;
    link.href = url;
    link.click();

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 4000);
  };

  // Quick categories icon mappings
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "food": return "🍽️";
      case "culture": return "🏛️";
      case "nature": return "🌳";
      case "activity": return "🚣";
      default: return "📍";
    }
  };

  const handleAiQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;

    setIsAiLoading(true);
    const question = aiQuestion;
    setAiQuestion("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ sender: "user", content: `Regarding itinerary "${itinerary.title}", query: ${question}` }],
          currentItineraryTitle: itinerary.title
        })
      });

      const data = await response.json();
      setAiAnswers(prev => [...prev, `Q: ${question}\nA: ${data.reply || "No response received."}`]);
    } catch (err) {
      console.error(err);
      setAiAnswers(prev => [...prev, `Q: ${question}\nOffline: It's always a good idea to research the details of local temples ahead of arrival!`]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div id="itinerary-screen" className="relative space-y-8 animate-fade-in">
      
      {/* Banner / Header details */}
      <section className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 w-full md:w-auto">
          {/* Circular Progress Indicator Widget */}
          <div className="flex items-center gap-3.5 bg-emerald-50/60 border border-emerald-100/80 px-4 py-3 rounded-2xl shrink-0 self-start sm:self-auto shadow-3xs">
            <div className="relative w-12 h-12 shrink-0">
              {/* SVG Circular Progress */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-emerald-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-600 transition-all duration-500 ease-out"
                  strokeDasharray={`${completionPercentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-mono font-extrabold text-[11px] text-emerald-800">
                {completionPercentage}%
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[10px] font-sans font-extrabold text-emerald-700 uppercase tracking-wider leading-none">
                Trip Progress
              </span>
              <span className="block text-xs font-bold text-slate-700 leading-normal">
                {completedActivitiesCount} of {totalActivities} Completed
              </span>
            </div>
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[#4A8B5C] bg-[#8FBF7F]/10 px-3 py-1 rounded-full text-xs font-semibold w-fit">
              <MapPin className="w-4.5 h-4.5" />
              <span>Active Trip Planning</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight leading-tight break-words">
              {itinerary.title}
            </h1>
            <div className="flex flex-wrap gap-4 text-xs font-sans text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                <span>Oct 12 - {12 + itinerary.durationDays}, 2023</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                <span>{itinerary.travelersCount} People</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full sm:w-72 shrink-0">
          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="w-full px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-display font-bold text-[11px] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer h-11"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Plan</span>
          </button>

          {/* Export to Calendar Button */}
          <div className="relative w-full">
            <button
              onClick={handleExportICS}
              className="w-full px-3 py-2 bg-[#4FA8E0] hover:bg-[#3db3e6] text-white rounded-xl font-display font-bold text-[11px] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer h-11"
            >
              <Calendar className="w-4 h-4 text-white" />
              <span>Export Calendar</span>
            </button>
            
            {exportSuccess && (
              <div className="absolute right-0 top-full mt-1.5 bg-slate-900 text-white text-[10px] font-sans px-2.5 py-1.5 rounded-lg shadow-lg z-20 flex items-center gap-1 whitespace-nowrap border border-slate-800 animate-fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>ICS Saved!</span>
              </div>
            )}
          </div>

          {/* Share Trip Button */}
          <div className="relative w-full">
            <button
              onClick={handleShareTrip}
              className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-display font-bold text-[11px] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer h-11"
            >
              <Send className="w-4 h-4 text-white" />
              <span>Share Trip</span>
            </button>
            
            {shareSuccess && (
              <div className="absolute right-0 top-full mt-1.5 bg-slate-900 text-white text-[10px] font-sans px-2.5 py-1.5 rounded-lg shadow-lg z-20 flex items-center gap-1 whitespace-nowrap border border-slate-800 animate-fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Link Copied!</span>
              </div>
            )}
          </div>

          {/* Estimated Budget Alert in warm secondary Earth-Orange */}
          <div className="bg-gradient-to-r from-[#E8A66B] to-[#D9895B] text-white px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm w-full h-11 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs shrink-0">
              ₹
            </div>
            <div className="min-w-0">
              <span className="block text-[7px] uppercase font-bold text-white/80 tracking-wide leading-none">Est. Budget</span>
              <span className="font-display font-extrabold text-[11px] leading-tight truncate block">₹{itinerary.estimatedBudget.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Horizontal Day Switcher */}
      <section className="flex gap-2.5 overflow-x-auto pb-1 hide-scrollbar print:hidden">
        {itinerary.days.map((day) => (
          <button
            key={day.dayNumber}
            id={`day-tab-btn-${day.dayNumber}`}
            onClick={() => setActiveDay(day.dayNumber)}
            className={`px-5 py-3 rounded-xl font-display font-bold text-xs transition-all whitespace-nowrap cursor-pointer border ${
              activeDay === day.dayNumber
                ? "bg-slate-100 text-slate-900 border-slate-300 shadow-sm"
                : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200"
            }`}
          >
            Day {day.dayNumber}: {day.title.split("&")[0].split(" - ")[0]}
          </button>
        ))}
      </section>

      {/* Main Content Area */}
      <section className="flex flex-col gap-8 print:hidden">
        
        {/* Day's Activities list (Full Width) */}
        <div className="w-full space-y-6">
          {itinerary.days
              .filter((d) => d.dayNumber === activeDay)
              .map((day) => (
                <div key={day.dayNumber} className="space-y-6">
                  
                  {/* Timeline title bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#4A8B5C] ring-4 ring-green-100"></div>
                      <h3 className="font-display font-bold text-lg text-slate-900">
                        Day {day.dayNumber} - {day.title}
                      </h3>
                    </div>
                    <DayWeatherWidget destination={itinerary.destination || "Hampi"} dayIndex={day.dayNumber - 1} />
                  </div>

                  {/* List of Activities with interactive elements */}
                  <div className="space-y-6 relative border-l border-slate-200 ml-2.5 pl-6">
                    {day.activities.map((act, actIdx) => {
                      const isCompleted = completedActivityIds.includes(act.id || `${day.dayNumber}-${act.title}`);
                      return (
                        <div 
                          key={act.id || actIdx}
                          className={`rounded-2xl border p-5 shadow-sm space-y-3 hover:shadow-md transition-all relative group ${
                            isCompleted
                              ? "bg-slate-50/70 border-slate-200/50 opacity-80"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          {/* Timeline dot marker on the left border */}
                          <div className={`absolute -left-[31px] top-7 w-3.5 h-3.5 rounded-full transition-colors ${
                            isCompleted
                              ? "bg-emerald-500 border-2 border-emerald-500"
                              : "bg-white border-2 border-[#4A8B5C] group-hover:bg-[#4A8B5C]"
                          }`}></div>

                          {/* Header block */}
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {/* Circular completion checkbox */}
                              <button 
                                onClick={() => toggleActivityCompleted(act.id || `${day.dayNumber}-${act.title}`)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                                  isCompleted
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-xs"
                                    : "border-slate-300 hover:border-emerald-500 text-transparent hover:bg-emerald-50/10"
                                }`}
                                title={isCompleted ? "Mark as Incomplete" : "Mark as Completed"}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                              </button>

                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded">
                                    {act.time}
                                  </span>
                                  <span className="text-xs">
                                    {getCategoryIcon(act.category)}
                                  </span>
                                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    act.category === "culture" ? "bg-[#8FBF7F]/10 text-[#4A8B5C]" :
                                    act.category === "food" ? "bg-[#E8A66B]/10 text-[#D9895B]" :
                                    act.category === "nature" ? "bg-emerald-50 text-emerald-700" :
                                    "bg-slate-100 text-slate-600"
                                  }`}>
                                    {act.category}
                                  </span>
                                  {act.isMustSee && (
                                    <span className="bg-red-50 text-red-500 font-sans font-bold text-[9px] px-2 py-0.5 rounded tracking-wide uppercase">
                                      Must See
                                    </span>
                                  )}
                                </div>
                                
                                <h4 className={`font-display font-bold text-base transition-all ${
                                  isCompleted ? "text-slate-400 line-through decoration-slate-300" : "text-slate-900"
                                }`}>
                                  {act.title}
                                </h4>
                              </div>
                            </div>

                            {/* Cost & Rating */}
                            <div className="text-right shrink-0">
                              <span className="block font-display font-extrabold text-sm text-slate-800">
                                {act.cost > 0 ? `₹${act.cost.toLocaleString()}` : "Free"}
                              </span>
                              {act.rating && (
                                <div className="flex items-center gap-1 text-amber-500 text-[11px] justify-end mt-0.5 font-bold">
                                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                  <span>{act.rating}</span>
                                </div>
                              )}
                            </div>
                          </div>

                        {/* Description */}
                        <p className="font-sans text-xs text-slate-500 leading-relaxed">
                          {act.description}
                        </p>

                        {/* Best Part / Highlight of the activity */}
                        {act.bestPart && (
                          <div className="bg-slate-50 rounded-xl p-3 flex gap-2 items-start border border-slate-200">
                            <CornerDownRight className="w-4 h-4 text-[#4FA8E0] shrink-0 mt-0.5" />
                            <p className="font-sans text-xs text-slate-700 font-medium italic">
                              <strong className="text-[#4FA8E0] not-italic font-bold">Best Part: </strong>
                              "{act.bestPart}"
                            </p>
                          </div>
                        )}

                        {/* Footer Actions - Group Voting buttons */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="font-sans text-[10px] text-slate-400 font-semibold uppercase">
                            Group Consensus
                          </span>

                          {/* Interactive Voting with active styling */}
                          <div className="flex items-center gap-3">
                            <button
                              id={`vote-up-btn-${act.id}`}
                              onClick={() => onActivityVote(day.dayNumber - 1, actIdx, "up")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                                act.userVote === "up"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <ThumbsUp className={`w-3.5 h-3.5 ${act.userVote === "up" ? "fill-emerald-500" : ""}`} />
                              <span>{act.votesUp}</span>
                            </button>

                            <button
                              id={`vote-down-btn-${act.id}`}
                              onClick={() => onActivityVote(day.dayNumber - 1, actIdx, "down")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                                act.userVote === "down"
                                  ? "bg-red-50 text-red-500 border-red-200"
                                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <ThumbsDown className={`w-3.5 h-3.5 ${act.userVote === "down" ? "fill-red-500" : ""}`} />
                              <span>{act.votesDown}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>

                </div>
              ))}
        </div>

        {/* Bottom Section: 2x2 Grid of Curated Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
          <MiniMapWidget 
            dayNumber={activeDay} 
            destination={itinerary.destination || "Hampi"} 
            itinerary={itinerary} 
          />
          <WeatherWidget destination={itinerary.destination || "Hampi"} />
          <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-4">
            <h4 className="font-display font-bold text-sm text-slate-900">
              Trip Highlights
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium border-b border-slate-100 pb-2.5">
                <span className="text-slate-500">Total Activities</span>
                <span className="text-slate-800 font-bold">8 stops</span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium border-b border-slate-100 pb-2.5">
                <span className="text-slate-500">Must See spots</span>
                <span className="text-red-600 font-bold">5 stars</span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-500">Food / Cafe stops</span>
                <span className="text-slate-800 font-bold text-[#D9895B]">3 places</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-wide block mb-2">
                Collaborators
              </span>
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex -space-x-2">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAsWvNhsNQ6US77s4jK5Cww7lCxGGBh0PXH5e5pRWCugsL91W3xmmtk-oNWPEwW1wL2Fw0jCRkYgP6QG2bZRoU0V2eYDoOm6BxAfK9ggFhf8R6niTFyBKXkxsXxwdYF3iHOJ4uR3gzeDWA4BDMhhFbcfAh2VXhb2Vk5GMTTRc3DMhmR2Z6HOiiE34qVw3xK08zGRMkjPupnxO45mHzO0zJN-l-HnDbOt0yQlwdQSAZMEyGgE3KA9H4nEZHewrsYYB4UaQSnnyS8RW0" alt="Arjun" className="w-7 h-7 rounded-full border border-white object-cover" />
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcfS_4_4reic5olAkwrcQgm_gou82PxPpZdhMlzTL09lj4yKltsyGy7b11h3eYvrdZbS_D6WZs3BbQoPldj5rvzLjRPxrSaQ_5_6AIHXkrikkwJG8abivE4fy8_qEqMRnO0rmAf0328IguivSEVTIxXSiIyAiR3N5mqZRHnEClXNls2Ki-Uv0ow2UcsL5w2JgRfQD1QSuExdOUuWMQwbl_dCq_1lCjQbqQrKNGw54fw584KLYyAtflcTeQ2G47Ca0qypaO09uK6Gk" alt="Priya" className="w-7 h-7 rounded-full border border-white object-cover" />
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDOO8RuFixchq-NGjjGwhna7f4LaydVEitLLnUReOS8PRSmjxay00B1LwItH83cknaGmw_qqxqh4TVNlxcebvrx6eUZ138s7c3c5IKipo_li8eK69YszVQSwUOhU_4nemO9OIdFsZzt0fqvXV5rYNDmyCcGU5YbPdPrlPXUVdvT_TeGKBzGSffzoAYMEUW7ctb7ZD215SqU-YYAqqO-grAhuycz5qs6gGYdZEyOnziUzNc1stuo0Z4waKBp0YVWHEc3lqvFVhkChj4" alt="Rahul" className="w-7 h-7 rounded-full border border-white object-cover" />
                </div>
                <span className="font-display font-bold text-xs text-slate-500">
                  +3 Online
                </span>
              </div>
            </div>
          </div>

          {/* Share Card Widget */}
          <TripSummaryCard itinerary={itinerary} />
        </div>

      </section>

      {/* Trip Memories Gallery */}
      <TripMemoriesGallery />

      {/* Floating Action Button: Ask AI Assistant */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-40">
        <button
          id="ask-ai-floating-btn"
          onClick={() => setShowAiPopup(!showAiPopup)}
          className="bg-gradient-to-r from-[#4FA8E0] to-[#3ACBB8] text-white p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer pulse-ring"
          title="Ask WanderWay Travel AI"
        >
          <Sparkles className="w-6 h-6 text-white" />
        </button>

        {/* Floating AI Popup Panel */}
        {showAiPopup && (
          <div className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl border border-slate-100 shadow-2xl p-4 space-y-3 z-50 animate-fade-in flex flex-col max-h-[360px]">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <span className="font-display font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#4FA8E0]" />
                <span>AI Travel Assistant</span>
              </span>
              <button 
                onClick={() => setShowAiPopup(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Answer scroll logs */}
            <div className="flex-1 overflow-y-auto space-y-2 text-xs font-sans text-slate-600 max-h-48 hide-scrollbar">
              {aiAnswers.length === 0 ? (
                <p className="text-slate-400 italic">
                  Ask me anything about Hampi's stay options, average autumn weather, or local temple rules!
                </p>
              ) : (
                aiAnswers.map((ans, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg space-y-1">
                    <p className="whitespace-pre-line leading-relaxed">{ans}</p>
                  </div>
                ))
              )}
              {isAiLoading && <p className="text-slate-400 animate-pulse font-semibold">Concierge is writing...</p>}
            </div>

            <form onSubmit={handleAiQuestionSubmit} className="flex gap-1.5">
              <input 
                id="input-ai-floating-query"
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask about weather, hotels, guide..."
                className="flex-1 bg-slate-50 border border-transparent focus:border-[#4FA8E0] focus:bg-white rounded-lg px-3 py-2 text-xs font-sans outline-none"
              />
              <button 
                id="btn-ai-floating-submit"
                type="submit"
                className="bg-[#4FA8E0] text-white p-2 rounded-lg hover:bg-[#3db3e6] transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Printable full itinerary view visible only during print */}
      <div className="hidden print:block text-slate-900 bg-white p-4 max-w-4xl mx-auto space-y-8 font-sans">
        <div className="border-b-2 border-slate-300 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 mb-1">{itinerary.title}</h1>
            <p className="text-sm text-slate-500 font-medium">
              Complete Collaborative Itinerary • {itinerary.destination}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-800">Budget: ₹{itinerary.estimatedBudget.toLocaleString()}</p>
            <p className="text-xs text-slate-500">{itinerary.travelersCount} Travelers</p>
          </div>
        </div>

        <div className="space-y-8">
          {itinerary.days.map((day) => (
            <div key={day.dayNumber} className="space-y-4 break-inside-avoid page-break-after-always">
              <h2 className="text-xl font-bold border-b border-slate-200 pb-1.5 text-slate-900 flex items-center justify-between">
                <span>Day {day.dayNumber}: {day.title}</span>
              </h2>
              
              <div className="space-y-4">
                {day.activities.map((act, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/20 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {act.time}
                        </span>
                        <h3 className="font-bold text-sm text-slate-950">{act.title}</h3>
                      </div>
                      <span className="font-bold text-xs text-slate-800">
                        {act.cost > 0 ? `₹${act.cost.toLocaleString()}` : "Free"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>
                    {act.bestPart && (
                      <div className="text-[11px] text-slate-500 italic mt-1 border-l-2 border-slate-300 pl-2">
                        <strong>Best Part:</strong> "{act.bestPart}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
