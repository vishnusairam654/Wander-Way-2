import React from "react";
import { Compass, ArrowRight, FolderOpen, Users, Receipt, Luggage, Map } from "lucide-react";

interface NewUserPlaceholderProps {
    tab: "itinerary" | "map" | "collab" | "packing" | "documents" | "expenses";
    onStartPlanning: () => void;
    onGoDashboard: () => void;
}

const TAB_META: Record<NewUserPlaceholderProps["tab"], { title: string; text: string; icon: React.ReactNode }> = {
    itinerary: {
        title: "No itinerary yet",
        text: "Generate your first trip plan to unlock day-by-day activities, votes, and weather guidance.",
        icon: <Map className="w-5 h-5 text-emerald-600" />
    },
    map: {
        title: "Map view is waiting for your first trip",
        text: "Create a trip and this page will show route context, activity pins, and day snapshots.",
        icon: <Map className="w-5 h-5 text-sky-600" />
    },
    collab: {
        title: "Invite flow starts after trip creation",
        text: "Build one itinerary first, then share invite links and collaborate in real time.",
        icon: <Users className="w-5 h-5 text-indigo-600" />
    },
    packing: {
        title: "Packing assistant needs a destination",
        text: "Once your trip exists, this page auto-builds destination-aware packing checklists.",
        icon: <Luggage className="w-5 h-5 text-rose-600" />
    },
    documents: {
        title: "Trip documents will appear here",
        text: "After creating a trip, upload tickets and confirmations into a secure shared folder.",
        icon: <FolderOpen className="w-5 h-5 text-amber-600" />
    },
    expenses: {
        title: "No shared expenses yet",
        text: "Create a trip to start tracking spend, split costs, and settlement summaries.",
        icon: <Receipt className="w-5 h-5 text-teal-600" />
    }
};

export default function NewUserPlaceholder({ tab, onStartPlanning, onGoDashboard }: NewUserPlaceholderProps) {
    const meta = TAB_META[tab];

    return (
        <section className="bg-white rounded-3xl border border-slate-200 p-8 md:p-10 shadow-sm space-y-6 animate-fade-in">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                    {meta.icon}
                </div>
                <div className="space-y-1">
                    <h2 className="font-display text-xl font-bold text-slate-900">{meta.title}</h2>
                    <p className="font-sans text-sm text-slate-500 max-w-2xl">{meta.text}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Step 1</span>
                    <p className="text-xs font-semibold text-slate-700">Set destination, dates, and vibe</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Step 2</span>
                    <p className="text-xs font-semibold text-slate-700">Generate itinerary with AI planner</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Step 3</span>
                    <p className="text-xs font-semibold text-slate-700">Invite people and start planning together</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                <button
                    onClick={onStartPlanning}
                    className="bg-linear-to-r from-[#4FA8E0] to-[#3ACBB8] text-white px-5 py-2.5 rounded-xl font-display font-bold text-xs shadow-sm hover:brightness-105 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                    <Compass className="w-4 h-4 text-white" />
                    <span>Start Planning</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                </button>

                <button
                    onClick={onGoDashboard}
                    className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-display font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                    Go to Dashboard
                </button>
            </div>
        </section>
    );
}
