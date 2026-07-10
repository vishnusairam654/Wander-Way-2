import React, { useState } from "react";
import { Download, Sparkles, MapPin, Calendar, Users, Star, Settings2, Eye, EyeOff, Compass } from "lucide-react";
import { Itinerary } from "../types";

interface TripSummaryCardProps {
  itinerary: Itinerary;
}

type CardTheme = "navy" | "coral" | "autumn" | "forest";

interface ThemeConfig {
  bgClass: string;
  glow1: string;
  glow2: string;
  canvasBg: string[];
  canvasGlow1: string;
  canvasGlow2: string;
  textAccent: string;
  btnGrad: string;
}

const THEMES: Record<CardTheme, ThemeConfig> = {
  navy: {
    bgClass: "from-[#131C2D] to-[#02040A]",
    glow1: "bg-emerald-500/12",
    glow2: "bg-[#D9895B]/12",
    canvasBg: ["#131C2D", "#0A0F1D", "#02040A"],
    canvasGlow1: "#8FBF7F",
    canvasGlow2: "#D9895B",
    textAccent: "text-emerald-400",
    btnGrad: "from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
  },
  coral: {
    bgClass: "from-[#35121b] to-[#0d0407]",
    glow1: "bg-rose-500/12",
    glow2: "bg-orange-500/12",
    canvasBg: ["#35121b", "#210b10", "#0d0407"],
    canvasGlow1: "#E04F75",
    canvasGlow2: "#E8A66B",
    textAccent: "text-rose-400",
    btnGrad: "from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600"
  },
  autumn: {
    bgClass: "from-[#2A160A] to-[#0A0502]",
    glow1: "bg-amber-500/12",
    glow2: "bg-yellow-500/12",
    canvasBg: ["#2A160A", "#190D05", "#0A0502"],
    canvasGlow1: "#F59E0B",
    canvasGlow2: "#D97706",
    textAccent: "text-amber-400",
    btnGrad: "from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
  },
  forest: {
    bgClass: "from-[#0F2218] to-[#030805]",
    glow1: "bg-emerald-500/12",
    glow2: "bg-lime-500/12",
    canvasBg: ["#0F2218", "#09140E", "#030805"],
    canvasGlow1: "#10B981",
    canvasGlow2: "#84CC16",
    textAccent: "text-emerald-400",
    btnGrad: "from-emerald-500 to-lime-500 hover:from-emerald-600 hover:to-lime-600"
  }
};

export default function TripSummaryCard({ itinerary }: TripSummaryCardProps) {
  const { title, destination, durationDays, travelersCount, estimatedBudget, days } = itinerary;

  // Customization States
  const [activeTheme, setActiveTheme] = useState<CardTheme>("navy");
  const [customDest, setCustomDest] = useState(destination || "");
  const [customTitleText, setCustomTitleText] = useState(title || "");
  const [customBrandSignature, setCustomBrandSignature] = useState("WANDERWAY SYNC");
  const [showBudget, setShowBudget] = useState(true);
  const [showHighlights, setShowHighlights] = useState(true);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const theme = THEMES[activeTheme];

  const handleDownloadImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Fill background with the customized linear gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1000);
    grad.addColorStop(0, theme.canvasBg[0]);
    grad.addColorStop(0.5, theme.canvasBg[1]);
    grad.addColorStop(1, theme.canvasBg[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 1000);

    // Draw glowing circles/orbs in background
    ctx.globalAlpha = 0.12;
    const orbGrad1 = ctx.createRadialGradient(150, 150, 50, 150, 150, 350);
    orbGrad1.addColorStop(0, theme.canvasGlow1);
    orbGrad1.addColorStop(1, "transparent");
    ctx.fillStyle = orbGrad1;
    ctx.beginPath();
    ctx.arc(150, 150, 350, 0, Math.PI * 2);
    ctx.fill();

    const orbGrad2 = ctx.createRadialGradient(650, 750, 50, 650, 750, 350);
    orbGrad2.addColorStop(0, theme.canvasGlow2);
    orbGrad2.addColorStop(1, "transparent");
    ctx.fillStyle = orbGrad2;
    ctx.beginPath();
    ctx.arc(650, 750, 350, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Outer framing card lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 40, 720, 920);

    // 2. Logo / Header Branding
    ctx.fillStyle = theme.canvasGlow1;
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText("WANDERWAY TRAVEL", 80, 100);

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "normal 12px monospace";
    ctx.fillText("CURATED AI-NATIVE ITINERARY", 80, 122);

    // 3. Dynamic Title & Destination (User Customized)
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "extrabold 48px system-ui, sans-serif";
    const displayName = customDest || "Curated Getaway";
    ctx.fillText(displayName, 80, 220);

    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "normal 22px system-ui, sans-serif";
    const subtitle = customTitleText || "Exclusive Travel Trail";
    const maxSubWidth = 640;
    let finalSubText = subtitle;
    if (ctx.measureText(subtitle).width > maxSubWidth) {
      finalSubText = subtitle.substring(0, 45) + "...";
    }
    ctx.fillText(finalSubText, 80, 270);

    // 4. Info pills layout (Budget limit, Duration, Travelers)
    // Draw background for info box
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(80, 310, 640, 80, 16);
    } else {
      ctx.rect(80, 310, 640, 80);
    }
    ctx.fill();
    ctx.stroke();

    // Fill Pill Data
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(`${durationDays} Days`, 120, 356);
    ctx.font = "normal 12px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillText("Duration", 120, 374);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(`${travelersCount} Travelers`, 300, 356);
    ctx.font = "normal 12px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillText("Group size", 300, 374);

    if (showBudget) {
      ctx.fillStyle = "#E8A66B";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText(`₹${estimatedBudget.toLocaleString()}`, 520, 356);
      ctx.font = "normal 12px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillText("Estimated Budget", 520, 374);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText("---", 520, 356);
      ctx.font = "normal 12px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillText("Estimated Budget", 520, 374);
    }

    // Separators inside pill
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(250, 325);
    ctx.lineTo(250, 375);
    ctx.moveTo(470, 325);
    ctx.lineTo(470, 375);
    ctx.stroke();

    // 5. Itinerary Experience highlights title
    if (showHighlights) {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText("DAILY ROUTE HIGHLIGHTS", 80, 440);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.moveTo(80, 455);
      ctx.lineTo(720, 455);
      ctx.stroke();

      // 6. Draw daily cards
      let currentY = 490;
      const maxDaysToDraw = Math.min(days.length, 4);

      for (let i = 0; i < maxDaysToDraw; i++) {
        const day = days[i];

        // Day counter sphere decoration
        ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
        ctx.beginPath();
        ctx.arc(100, currentY + 15, 20, 0, Math.PI * 2);
        ctx.fill();

        // Day counter text
        ctx.fillStyle = theme.canvasGlow1;
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`D${day.dayNumber}`, 100, currentY + 19);
        ctx.textAlign = "left";

        // Day Title Focus
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 16px system-ui, sans-serif";
        const displayDayTitle = day.title.length > 50 ? day.title.substring(0, 47) + "..." : day.title;
        ctx.fillText(displayDayTitle, 140, currentY + 12);

        // Activities bullet summary
        ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
        ctx.font = "normal 13px system-ui, sans-serif";
        const topActivities = day.activities ? day.activities.slice(0, 2).map((act: any) => act.title).join("  •  ") : "";
        const displayActivities = topActivities.length > 68 ? topActivities.substring(0, 65) + "..." : topActivities;
        ctx.fillText(displayActivities || "Cultural sightseeing & exploration tours", 140, currentY + 32);

        currentY += 80;
      }
    } else {
      // Draw massive decorative compass/globe icon instead of route highlights
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(400, 630, 110, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.font = "italic 16px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Adventure Awaits", 400, 625);
      ctx.font = "normal 12px monospace";
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fillText("Wanderlust mode unlocked • Curated trail active", 400, 650);
      ctx.textAlign = "left";
    }

    // 7. Footer brand watermark
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 860);
    ctx.lineTo(720, 860);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "normal 12px system-ui, sans-serif";
    ctx.fillText("Curated instantly via WanderWay's intelligent concierge planner.", 80, 895);
    ctx.fillText("Join & plan in real-time with your friends at wanderway.com", 80, 915);

    // Decorative digital signature badge
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(550, 882, 170, 44, 8);
    } else {
      ctx.rect(550, 882, 170, 44);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.canvasGlow1;
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(customBrandSignature.toUpperCase(), 635, 908);
    ctx.textAlign = "left";

    // Trigger Browser Image Download
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `wanderway_${displayName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_summary.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div 
      id="trip-summary-share-card" 
      className={`bg-gradient-to-br ${theme.bgClass} rounded-[24px] p-6 text-white border border-slate-700/60 shadow-xl space-y-5 relative overflow-hidden select-none transition-all duration-300`}
    >
      {/* Absolute graphic glowing accents based on selected theme */}
      <div className={`absolute -top-12 -left-12 w-40 h-40 ${theme.glow1} rounded-full blur-3xl pointer-events-none`}></div>
      <div className={`absolute -bottom-12 -right-12 w-40 h-40 ${theme.glow2} rounded-full blur-3xl pointer-events-none`}></div>

      {/* Header controls */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          <span className="font-display font-bold text-xs uppercase tracking-wider text-emerald-400">Shareable Trip Card</span>
        </div>

        <button
          onClick={() => setIsCustomizing(!isCustomizing)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-sans font-semibold cursor-pointer transition-all ${
            isCustomizing 
              ? "bg-emerald-500 border-emerald-500 text-slate-950" 
              : "bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300"
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>{isCustomizing ? "Close Options" : "Customize"}</span>
        </button>
      </div>

      {/* Customize Panel */}
      {isCustomizing && (
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 space-y-4 relative z-10 animate-fade-in text-xs font-sans">
          {/* Theme Selection */}
          <div className="space-y-1.5">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select Card Theme</span>
            <div className="flex gap-2">
              {(Object.keys(THEMES) as CardTheme[]).map((tKey) => (
                <button
                  key={tKey}
                  onClick={() => setActiveTheme(tKey)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-bold text-[11px] border transition-all cursor-pointer ${
                    activeTheme === tKey
                      ? "bg-white text-slate-950 border-white"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {tKey === "navy" ? "Midnight" : tKey === "coral" ? "Sunset" : tKey === "autumn" ? "Autumn" : "Forest"}
                </button>
              ))}
            </div>
          </div>

          {/* Input text controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Destination</label>
              <input
                type="text"
                value={customDest}
                onChange={(e) => setCustomDest(e.target.value)}
                placeholder="Destination Name"
                className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Card Subtitle</label>
              <input
                type="text"
                value={customTitleText}
                onChange={(e) => setCustomTitleText(e.target.value)}
                placeholder="e.g. Our Dream Vacation"
                className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Watermark/Signature</label>
              <input
                type="text"
                value={customBrandSignature}
                onChange={(e) => setCustomBrandSignature(e.target.value)}
                placeholder="e.g. AMIGOS ROUTE"
                className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
            {/* Toggles */}
            <div className="space-y-2 flex flex-col justify-end">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Show Budget Limit</span>
                <button
                  onClick={() => setShowBudget(!showBudget)}
                  className="text-slate-400 hover:text-white"
                >
                  {showBudget ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Show Route Previews</span>
                <button
                  onClick={() => setShowHighlights(!showHighlights)}
                  className="text-slate-400 hover:text-white"
                >
                  {showHighlights ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main card preview area */}
      <div className="space-y-4 relative z-10">
        <div>
          <h3 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
            {customDest || "Curated Getaway"}
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-medium italic">
            "{customTitleText || "Our Dream Getaway"}"
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800 text-center">
          <div>
            <span className="block text-[10px] text-slate-500 uppercase font-semibold">Duration</span>
            <span className="text-sm font-display font-bold text-slate-200 mt-0.5 block">{durationDays} Days</span>
          </div>
          <div className="border-x border-slate-800">
            <span className="block text-[10px] text-slate-500 uppercase font-semibold">Travelers</span>
            <span className="text-sm font-display font-bold text-slate-200 mt-0.5 block">{travelersCount} Adults</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 uppercase font-semibold">Est. Budget</span>
            <span className="text-sm font-display font-bold text-[#E8A66B] mt-0.5 block">
              {showBudget ? `₹${estimatedBudget.toLocaleString()}` : "---"}
            </span>
          </div>
        </div>

        {/* Daily stops previews */}
        {showHighlights ? (
          <div className="space-y-2.5">
            <span className="text-[9px] font-mono text-slate-500 font-bold tracking-wider block uppercase">Route Highlights preview</span>
            <div className="space-y-2">
              {days.slice(0, 3).map((day) => (
                <div key={day.dayNumber} className="flex gap-2.5 items-start text-xs">
                  <span className={`font-mono ${theme.textAccent} text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-black shrink-0 mt-0.5`}>D{day.dayNumber}</span>
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-display font-bold text-slate-200 truncate">{day.title}</p>
                    <p className="text-[10px] text-slate-400 truncate font-light">
                      {day.activities ? day.activities.slice(0, 2).map((a: any) => a.title).join(" • ") : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
            <Compass className="w-8 h-8 text-slate-600 mx-auto animate-spin-slow mb-1" />
            <p className="text-[10px] text-slate-500 font-mono">Custom Signature Enabled</p>
          </div>
        )}
      </div>

      {/* Signature branding display */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-850 pt-3 relative z-10">
        <span>Watermark:</span>
        <span className="font-mono font-bold text-slate-300 uppercase tracking-widest bg-slate-850 px-2 py-0.5 rounded">
          {customBrandSignature || "WANDERWAY SYNC"}
        </span>
      </div>

      <button
        onClick={handleDownloadImage}
        className={`w-full py-2.5 bg-gradient-to-r ${theme.btnGrad} text-slate-950 transition-all font-display font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] cursor-pointer text-center relative z-10`}
      >
        <Download className="w-4 h-4 text-slate-950 shrink-0" />
        <span>Download Share Card (PNG)</span>
      </button>
    </div>
  );
}

