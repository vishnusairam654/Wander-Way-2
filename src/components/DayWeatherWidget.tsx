import React, { useState, useEffect } from "react";
import { Sun, Cloud, CloudRain, CloudLightning, Droplets, Thermometer } from "lucide-react";

interface DayWeatherWidgetProps {
  destination: string;
  dayIndex: number;
}

interface DailyWeather {
  tempMin: number;
  tempMax: number;
  code: number;
  pop: number; // probability of precipitation
  label: string;
  icon: React.ReactNode;
  bg: string;
  text: string;
}

const WEATHER_CODE_MAP: Record<number, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  0: { label: "Sunny", icon: <Sun className="w-4 h-4 text-amber-500 fill-amber-100 animate-spin-slow" />, bg: "bg-amber-50/50 border-amber-100/80", text: "text-amber-800" },
  1: { label: "Partly Cloudy", icon: <Cloud className="w-4 h-4 text-sky-400" />, bg: "bg-sky-50/50 border-sky-100/80", text: "text-sky-800" },
  2: { label: "Partly Cloudy", icon: <Cloud className="w-4 h-4 text-sky-400" />, bg: "bg-sky-50/50 border-sky-100/80", text: "text-sky-800" },
  3: { label: "Overcast", icon: <Cloud className="w-4 h-4 text-slate-400" />, bg: "bg-slate-50/60 border-slate-200/80", text: "text-slate-700" },
  45: { label: "Foggy", icon: <Cloud className="w-4 h-4 text-slate-300" />, bg: "bg-slate-50/60 border-slate-200/80", text: "text-slate-700" },
  48: { label: "Foggy", icon: <Cloud className="w-4 h-4 text-slate-300" />, bg: "bg-slate-50/60 border-slate-200/80", text: "text-slate-700" },
  51: { label: "Light Drizzle", icon: <CloudRain className="w-4 h-4 text-sky-400" />, bg: "bg-sky-50/50 border-sky-100/80", text: "text-sky-800" },
  53: { label: "Drizzle", icon: <CloudRain className="w-4 h-4 text-sky-400" />, bg: "bg-sky-50/50 border-sky-100/80", text: "text-sky-800" },
  55: { label: "Dense Drizzle", icon: <CloudRain className="w-4 h-4 text-sky-500" />, bg: "bg-sky-50/50 border-sky-100/80", text: "text-sky-800" },
  61: { label: "Slight Rain", icon: <CloudRain className="w-4 h-4 text-sky-500" />, bg: "bg-sky-50/50 border-sky-100/80", text: "text-sky-800" },
  63: { label: "Moderate Rain", icon: <CloudRain className="w-4 h-4 text-sky-600" />, bg: "bg-sky-100/30 border-sky-200/60", text: "text-sky-900" },
  65: { label: "Heavy Rain", icon: <CloudRain className="w-4 h-4 text-sky-700" />, bg: "bg-sky-100/40 border-sky-200/60", text: "text-sky-900" },
  80: { label: "Rain Showers", icon: <CloudRain className="w-4 h-4 text-sky-500" />, bg: "bg-sky-50/50 border-sky-100/80", text: "text-sky-800" },
  81: { label: "Heavy Showers", icon: <CloudRain className="w-4 h-4 text-sky-600" />, bg: "bg-sky-100/30 border-sky-200/60", text: "text-sky-900" },
  95: { label: "Thunderstorm", icon: <CloudLightning className="w-4 h-4 text-purple-600 animate-pulse" />, bg: "bg-purple-50/50 border-purple-100/80", text: "text-purple-800" },
  96: { label: "Thunderstorm", icon: <CloudLightning className="w-4 h-4 text-purple-700" />, bg: "bg-purple-50/50 border-purple-100/80", text: "text-purple-800" },
  99: { label: "Thunderstorm", icon: <CloudLightning className="w-4 h-4 text-purple-700" />, bg: "bg-purple-50/50 border-purple-100/80", text: "text-purple-800" }
};

const getCodeMeta = (code: number) => {
  return WEATHER_CODE_MAP[code] || {
    label: "Cloudy",
    icon: <Cloud className="w-4 h-4 text-slate-400" />,
    bg: "bg-slate-50/60 border-slate-100",
    text: "text-slate-700"
  };
};

export default function DayWeatherWidget({ destination, dayIndex }: DayWeatherWidgetProps) {
  const [weather, setWeather] = useState<DailyWeather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchDailyWeather() {
      try {
        setLoading(true);

        // 1. Resolve coordinates
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
          setWeather(null);
          return;
        }

        const lat = geoData.results[0].latitude;
        const lon = geoData.results[0].longitude;

        // 2. Fetch up to 7-day weather forecast
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        if (!active) return;

        if (weatherData.daily) {
          const daily = weatherData.daily;
          // Wrap with safety modulo check to avoid index out of bound for multi-day itineraries
          const index = dayIndex % daily.time.length;
          const code = daily.weathercode[index];
          const pop = daily.precipitation_probability_max ? daily.precipitation_probability_max[index] : 0;
          const meta = getCodeMeta(code);

          setWeather({
            tempMin: Math.round(daily.temperature_2m_min[index]),
            tempMax: Math.round(daily.temperature_2m_max[index]),
            code,
            pop,
            label: meta.label,
            icon: meta.icon,
            bg: meta.bg,
            text: meta.text
          });
        }
      } catch (err) {
        console.error("Failed to fetch daily itinerary weather:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchDailyWeather();

    return () => {
      active = false;
    };
  }, [destination, dayIndex]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 animate-pulse shrink-0">
        <div className="w-3.5 h-3.5 rounded-full bg-slate-200"></div>
        <div className="h-3 bg-slate-200 rounded w-12"></div>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border ${weather.bg} shrink-0 shadow-2xs font-sans text-xs`}>
      <div className="flex items-center gap-1">
        {weather.icon}
        <span className={`font-bold font-display ${weather.text} leading-none mt-0.5`}>
          {weather.label}
        </span>
      </div>
      <div className="h-3 w-[1px] bg-slate-200"></div>
      <div className="flex items-center gap-1.5 text-slate-600 font-semibold leading-none">
        <Thermometer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="font-mono">{weather.tempMax}° / {weather.tempMin}°C</span>
      </div>
      {weather.pop > 0 && (
        <>
          <div className="h-3 w-[1px] bg-slate-200"></div>
          <div className="flex items-center gap-1 text-sky-600 font-bold leading-none">
            <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{weather.pop}%</span>
          </div>
        </>
      )}
    </div>
  );
}
