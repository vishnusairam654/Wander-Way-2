import React, { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain, CloudLightning, CloudSnow, Wind, Droplets, MapPin, Thermometer } from "lucide-react";

interface WeatherWidgetProps {
  destination: string;
}

interface WeatherData {
  temp: number;
  windSpeed: number;
  humidity: number;
  description: string;
  icon: React.ReactNode;
  forecast: Array<{
    dayName: string;
    tempMin: number;
    tempMax: number;
    code: number;
    icon: React.ReactNode;
  }>;
}

const WEATHER_CODE_MAP: Record<number, { label: string; icon: React.ReactNode }> = {
  0: { label: "Clear sky", icon: <Sun className="w-8 h-8 text-amber-500 fill-amber-100" /> },
  1: { label: "Partly cloudy", icon: <Cloud className="w-8 h-8 text-sky-400" /> },
  2: { label: "Partly cloudy", icon: <Cloud className="w-8 h-8 text-sky-400" /> },
  3: { label: "Overcast", icon: <Cloud className="w-8 h-8 text-slate-400" /> },
  45: { label: "Foggy", icon: <Cloud className="w-8 h-8 text-slate-300" /> },
  48: { label: "Foggy", icon: <Cloud className="w-8 h-8 text-slate-300" /> },
  51: { label: "Light drizzle", icon: <CloudRain className="w-8 h-8 text-sky-500" /> },
  53: { label: "Drizzle", icon: <CloudRain className="w-8 h-8 text-sky-500" /> },
  55: { label: "Dense drizzle", icon: <CloudRain className="w-8 h-8 text-sky-600" /> },
  61: { label: "Slight rain", icon: <CloudRain className="w-8 h-8 text-sky-500" /> },
  63: { label: "Moderate rain", icon: <CloudRain className="w-8 h-8 text-sky-600" /> },
  65: { label: "Heavy rain", icon: <CloudRain className="w-8 h-8 text-sky-700" /> },
  80: { label: "Rain showers", icon: <CloudRain className="w-8 h-8 text-sky-500" /> },
  81: { label: "Heavy showers", icon: <CloudRain className="w-8 h-8 text-sky-600" /> },
  95: { label: "Thunderstorm", icon: <CloudLightning className="w-8 h-8 text-purple-600" /> },
  96: { label: "Thunderstorm", icon: <CloudLightning className="w-8 h-8 text-purple-700" /> },
  99: { label: "Thunderstorm", icon: <CloudLightning className="w-8 h-8 text-purple-700" /> }
};

const getCodeMeta = (code: number) => {
  return WEATHER_CODE_MAP[code] || { label: "Cloudy", icon: <Cloud className="w-8 h-8 text-slate-400" /> };
};

export default function WeatherWidget({ destination }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchWeather() {
      try {
        setLoading(true);
        setError(null);

        // 1. Resolve coordinates via geocoding API
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
          throw new Error("location_not_found");
        }

        const lat = geoData.results[0].latitude;
        const lon = geoData.results[0].longitude;

        // 2. Fetch current weather and 3-day forecast from Open-Meteo
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        if (!active) return;

        if (weatherData.current) {
          const current = weatherData.current;
          const currentMeta = getCodeMeta(current.weather_code);

          // Map forecast days
          const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const forecast = [];
          if (weatherData.daily) {
            const maxDays = Math.min(3, weatherData.daily.time.length);
            for (let i = 0; i < maxDays; i++) {
              const dateObj = new Date(weatherData.daily.time[i]);
              const dayName = i === 0 ? "Today" : daysOfWeek[dateObj.getDay()];
              const code = weatherData.daily.weathercode[i];
              forecast.push({
                dayName,
                tempMin: Math.round(weatherData.daily.temperature_2m_min[i]),
                tempMax: Math.round(weatherData.daily.temperature_2m_max[i]),
                code,
                icon: getCodeMeta(code).icon
              });
            }
          }

          setWeather({
            temp: Math.round(current.temperature_2m),
            windSpeed: Math.round(current.wind_speed_10m),
            humidity: Math.round(current.relative_humidity_2m),
            description: currentMeta.label,
            icon: currentMeta.icon,
            forecast
          });
        } else {
          throw new Error("Invalid weather data payload");
        }
      } catch (err) {
        console.error("Weather fetch failure:", err);
        if (active) {
          const text = err instanceof Error && err.message === "location_not_found"
            ? "Location not found"
            : "Failed to fetch real-time weather forecasts.";
          setError(text);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchWeather();

    return () => {
      active = false;
    };
  }, [destination]);

  if (loading) {
    return (
      <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm space-y-4 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-1/3"></div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full"></div>
          <div className="space-y-2 flex-1">
            <div className="h-6 bg-slate-100 rounded w-2/3"></div>
            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm text-center py-6">
        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mx-auto text-amber-600 mb-2">
          <Sun className="w-5 h-5" />
        </div>
        <h4 className="font-display font-bold text-xs text-slate-800">Weather Forecast</h4>
        <p className="font-sans text-[11px] text-slate-400 mt-1">{error || "Real-time weather unavailable."}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1.5 text-slate-900">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-display font-bold text-xs">Weather in {destination}</span>
        </div>
        <span className="font-sans text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
          Live Forecast
        </span>
      </div>

      {/* Main Temp Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-xl bg-slate-50 border border-slate-100">
            {weather.icon}
          </div>
          <div>
            <div className="flex items-baseline leading-none">
              <span className="font-display font-extrabold text-3xl text-slate-950">{weather.temp}</span>
              <span className="font-display text-sm font-semibold text-slate-500">°C</span>
            </div>
            <span className="font-sans text-xs text-slate-500 font-semibold">{weather.description}</span>
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium justify-end">
            <Wind className="w-3.5 h-3.5 text-slate-400" />
            <span>{weather.windSpeed} km/h</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium justify-end">
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
            <span>{weather.humidity}% Hum</span>
          </div>
        </div>
      </div>

      {/* 3-day simple forecast row */}
      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-100">
        {weather.forecast.map((f, idx) => (
          <div key={idx} className="bg-slate-50/50 rounded-xl p-2 border border-slate-100 text-center flex flex-col items-center">
            <span className="font-sans text-[10px] font-bold text-slate-500 block mb-1">{f.dayName}</span>
            <div className="my-1 scale-75 transform origin-center">{f.icon}</div>
            <div className="flex items-center gap-1 justify-center mt-1">
              <span className="font-mono text-[10px] font-bold text-slate-800">{f.tempMax}°</span>
              <span className="font-mono text-[9px] text-slate-400">{f.tempMin}°</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
