import React from "react";
import { 
  Home, 
  Compass, 
  Map, 
  Users, 
  Luggage, 
  Receipt, 
  History, 
  LogOut, 
  Plus, 
  Bell,
  FolderOpen
} from "lucide-react";
import { WanderWayIcon } from "./Logo";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onNewTripClick: () => void;
  currentUser: { email: string; name: string; avatar: string } | null;
  onSignOut: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, onNewTripClick, currentUser, onSignOut }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "planner", label: "AI Planner", icon: Compass },
    { id: "itinerary", label: "Itinerary", icon: Map },
    { id: "collab", label: "Group Collab", icon: Users },
    { id: "documents", label: "Documents", icon: FolderOpen },
    { id: "packing", label: "Packing List", icon: Luggage },
    { id: "expenses", label: "Expenses", icon: Receipt },
    { id: "flashback", label: "2023 Wrapped", icon: History },
  ];

  return (
    <>
      {/* Desktop Sidebar - Persistent on md+ */}
      <nav 
        aria-label="Desktop Navigation" 
        className="hidden md:flex flex-col h-screen py-8 bg-white w-64 border-r border-slate-200 z-30 flex-shrink-0 fixed left-0 top-0"
      >
        {/* Brand Header */}
        <div className="px-6 mb-8 flex items-center gap-2.5">
          <WanderWayIcon size={38} className="shrink-0" />
          <div className="flex items-baseline gap-1 leading-none">
            <span className="font-display text-2xl font-black tracking-tight text-slate-800">Wander</span>
            <span className="font-display text-2xl font-black tracking-tight bg-gradient-to-r from-[#3B7A57] to-[#4FA8E0] bg-clip-text text-transparent">Way</span>
          </div>
        </div>

        {/* New Trip CTA with Accent sunset gradient */}
        <div className="px-6 mb-8">
          <button 
            id="btn-sidebar-new-trip"
            onClick={onNewTripClick}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold bg-gradient-to-r from-[#FF8A65] to-[#FFB74D] shadow-lg shadow-orange-100 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>New Trip</span>
          </button>
        </div>

        {/* Scrollable Navigation Menu */}
        <div className="flex-1 px-4 space-y-1 overflow-y-auto hide-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer text-left font-sans text-sm ${
                  isActive 
                    ? "bg-slate-100 text-slate-900 font-medium" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-[#4FA8E0]" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Card */}
        {currentUser && (
          <div className="px-6 py-4 mx-4 mb-2 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-10 h-10 rounded-full object-cover border border-slate-200"
            />
            <div className="min-w-0 flex-1">
              <p className="font-sans font-bold text-xs text-slate-800 truncate">{currentUser.name}</p>
              <p className="font-sans text-[10px] text-slate-400 truncate">{currentUser.email}</p>
            </div>
          </div>
        )}

        {/* Desktop Sidebar Footer */}
        <div className="px-4 mt-auto pt-2 border-t border-slate-100 space-y-1">
          <button 
            id="nav-logout-btn"
            onClick={onSignOut}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer text-left text-sm"
          >
            <LogOut className="w-5 h-5 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Mobile Top App Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 z-30 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <WanderWayIcon size={32} className="shrink-0" />
          <div className="flex items-baseline leading-none gap-0.5">
            <span className="font-display text-xl font-black tracking-tight text-slate-800">Wander</span>
            <span className="font-display text-xl font-black tracking-tight bg-gradient-to-r from-[#3B7A57] to-[#4FA8E0] bg-clip-text text-transparent">Way</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            aria-label="Notification bell" 
            className="p-1.5 rounded-full text-slate-500 hover:bg-slate-50 relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
          </button>
          {currentUser && (
            <button 
              onClick={() => setCurrentTab("dashboard")} 
              className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 cursor-pointer"
              title={currentUser.name}
            >
              <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
            </button>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar - Fixed at Bottom */}
      <nav 
        aria-label="Mobile Bottom Navigation" 
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-30 px-3 flex items-center justify-start overflow-x-auto gap-1 hide-scrollbar shadow-lg snap-x"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[76px] px-2 h-full py-1 text-center transition-all relative snap-center ${
                isActive ? "text-slate-900 font-semibold" : "text-slate-400"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-[#4FA8E0]" : ""}`} />
              <span className="text-[10px] tracking-tight whitespace-nowrap">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-[#4FA8E0]"></span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
