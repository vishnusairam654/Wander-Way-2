import React from "react";
import ingoudeLogo from "@/assets/Ingoude.png";

interface LogoProps {
  className?: string;
  size?: number; // Size of the icon
  showText?: boolean;
}

export function WanderWayIcon({ className = "", size = 48 }: { className?: string; size?: number }) {
  return (
    <img 
      src={ingoudeLogo} 
      alt="WanderWay Logo" 
      className={`rounded-2xl object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export default function WanderWayLogo({ className = "", size = 80, showText = true }: LogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* Premium Gradient Logo Icon */}
      <WanderWayIcon size={size} className="transition-transform duration-500 hover:scale-105" />

      {/* Modern High-Fidelity Typography */}
      {showText && (
        <div className="mt-4 flex items-center justify-center gap-1">
          <span className="font-display text-4xl font-black tracking-tight text-slate-900">
            Wander
          </span>
          <span className="font-display text-4xl font-black tracking-tight text-yellow-400">
            Way
          </span>
        </div>
      )}
    </div>
  );
}
