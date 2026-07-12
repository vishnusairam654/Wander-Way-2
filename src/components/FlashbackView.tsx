import React from "react";
import { Sparkles, Map, Award, Share2, Download, Flame, Compass } from "lucide-react";

export default function FlashbackView() {
  const currentYear = new Date().getFullYear();
  const stats = [
    { label: "Kilometers Traveled", value: "12,450 km", icon: Compass, color: "text-[#4FA8E0] bg-sky-50" },
    { label: "Unforgettable Trips", value: "8 Trips", icon: Map, color: "text-[#E8A66B] bg-orange-50" },
    { label: "Places Explored", value: "15 Cities", icon: Sparkles, color: "text-[#8FBF7F] bg-green-50" },
  ];

  return (
    <div id="flashback-screen" className="space-y-10 animate-fade-in max-w-4xl mx-auto">

      {/* Title Header Section */}
      <section className="text-center space-y-2.5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 text-[#E8A66B] text-xs font-bold uppercase tracking-wider">
          <Flame className="w-4 h-4 text-[#E8A66B]" />
          <span>Your Year in Travel</span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
          {currentYear}: A Year of Epic Discoveries
        </h1>
        <p className="font-sans text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          You've scaled peaks, walked historic stone pathways, and watched sunsets over spectacular horizons. Here's your annual recap.
        </p>
      </section>

      {/* Glassmorphic Statistics Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow group cursor-default"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wide">
                  {stat.label}
                </span>
                <span className="font-display font-black text-2xl text-slate-900">
                  {stat.value}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Unlockable Badge Section */}
      <section className="bg-gradient-to-r from-sky-50 to-teal-50 rounded-[24px] border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#3ACBB8] shadow-md shadow-teal-100">
            <Award className="w-8 h-8 text-[#3ACBB8] animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">Achievement unlocked</span>
            <h4 className="font-display font-extrabold text-slate-900 text-sm mt-0.5">
              Badge Unlocked: Nature & Heritage Explorer
            </h4>
            <p className="font-sans text-xs text-slate-500 leading-relaxed font-light mt-0.5">
              Rewarded for mapping over 5 historic UNESCO sites and beach reserves in a calendar year.
            </p>
          </div>
        </div>

        <button
          onClick={() => alert("Reward claimed! Check your email coupon code.")}
          className="bg-white hover:bg-slate-50 text-slate-800 font-display font-bold text-xs px-5 py-3 rounded-xl shadow-sm cursor-pointer whitespace-nowrap border border-slate-200"
        >
          Claim Reward
        </button>
      </section>

      {/* Top Destinations Grid Bento box */}
      <section className="space-y-4">
        <h3 className="font-display font-bold text-base text-slate-900 px-1">
          Your Top {currentYear} Destinations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* #1 Favorite */}
          <div className="col-span-1 md:col-span-2 bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm flex flex-col group">
            <div className="h-56 relative overflow-hidden bg-slate-100">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBg6jTgdTFRP_rwPKvaxTjw1oodBxPeupesWY2I2wIvHr-gqYMK96m_C9qunpT83wjePddcXd3ceL2uSvbyb5Nf02WnnKnKDmrBdXG3RggIRd7PwtivIsW2gb-DBG_MjB_2FvtGULY-s8aSzd4M2dzHUNjRuUtV7giH7D9zZhLmR6tpFWPdsAavPGarq2138Vfut0T9ulNug9zFcAe2XKQzbmjcI2Qz490jB1-8SBz_XubQxcYvHOEedEVpHvhaVSrbXTJYMcO8vcc"
                alt="Top destination"
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
              />
              <span className="absolute top-4 left-4 bg-amber-500 text-white font-display font-black text-xs px-3.5 py-1.5 rounded-full shadow-md uppercase tracking-wider">
                👑 #1 Favorite
              </span>
            </div>
            <div className="p-6 space-y-2">
              <h4 className="font-display font-bold text-base text-slate-900">
                Heritage Trail, India
              </h4>
              <p className="font-sans text-xs text-slate-500 leading-relaxed">
                An unforgettable dive into monolithic boulder hills, ancient stepped tanks, royal elephant stables, and river coracle crossings.
              </p>
            </div>
          </div>

          {/* #2 Favorite: Kyoto */}
          <div className="col-span-1 bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between group">
            <div className="h-36 relative overflow-hidden bg-slate-100">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYUUVfR9NEH2KcZ_PdQKAukV9-ijMMNFjxn-jGopMXErzvs7czIJ5eAz21q-Lu5XvSPjqR4keHcmCou4bZTLfAKQe_IFWJzfDc1blwlcFW-CR-WFxtFoVfGb7fjEtiQzTDj2iRPzZJjJxkSCtZQussnv7FXXCqiw1F5BieEAmOW8eOeclFO7o-i--EW24c77bx5M9I1mbUgYPsJJH_beU3_SANcAyzkSmOQC6sh-mtSx9lRQREFiD0EbYkuA8XO2NNY0prlZ1s0sw"
                alt="Kyoto bamboo forest"
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
              />
              <span className="absolute top-3 left-3 bg-slate-800 text-white font-display font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">
                #2 Kyoto
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="font-display font-bold text-sm text-slate-900">
                  Kyoto Cherry Blossoms
                </h4>
                <p className="font-sans text-xs text-slate-500 leading-normal">
                  Strolling through giant towering green bamboo forests.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Share wrap and save image actions */}
      <section className="flex flex-col md:flex-row justify-center gap-4 pt-4 border-t border-slate-200">
        <button
          id="btn-flashback-share"
          onClick={() => alert("WanderWay Wrap link copied! Show your friends on WhatsApp or Instagram.")}
          className="px-6 py-3.5 bg-gradient-to-r from-[#4FA8E0] to-[#3ACBB8] text-white rounded-xl font-display font-semibold text-xs shadow-md shadow-sky-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Share2 className="w-4.5 h-4.5 text-white" />
          <span>Share {currentYear} Wrapped</span>
        </button>

        <button
          id="btn-flashback-download"
          onClick={() => alert("Wrapped summary card downloaded. Check your device gallery!")}
          className="px-6 py-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-display font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Download className="w-4.5 h-4.5 text-slate-500" />
          <span>Save Summary Image</span>
        </button>
      </section>

    </div>
  );
}
