import React from "react";
import { Compass } from "lucide-react";

interface LogoProps {
  className?: string;
  size?: number; // Size of the icon
  showText?: boolean;
}

export function WanderWayIcon({ className = "", size = 48 }: { className?: string; size?: number }) {
  return (
    <div 
      className={`relative rounded-2xl flex items-center justify-center bg-gradient-to-tr from-[#3B7A57] to-[#4FA8E0] shadow-md shadow-emerald-100 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <Compass 
        className="text-white animate-[spin_10s_linear_infinite]" 
        style={{ width: size * 0.55, height: size * 0.55 }} 
      />
    </div>
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
          <span className="font-display text-4xl font-black tracking-tight bg-gradient-to-r from-[#3B7A57] to-[#4FA8E0] bg-clip-text text-transparent">
            Way
          </span>
        </div>
      )}
    </div>
  );
}
