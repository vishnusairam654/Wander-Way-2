import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Sidebar from "./components/Sidebar";
import LoginView from "./components/LoginView";
import Dashboard from "./components/Dashboard";
import PlannerFormView from "./components/PlannerFormView";
import ItineraryView from "./components/ItineraryView";
import MapView from "./components/MapView";
import ExpensesView from "./components/ExpensesView";
import CollabView from "./components/CollabView";
import PackingListView from "./components/PackingListView";
import DocumentsView from "./components/DocumentsView";
import NewUserPlaceholder from "./components/NewUserPlaceholder";
import { Itinerary } from "./types";
import {
  FileText,
  Users,
  Compass,
  Map,
  FolderOpen,
  Luggage,
  Receipt,
  History,
  Sparkles,
  Home,
  AlertCircle
} from "lucide-react";
import QuickNotesPanel from "./components/QuickNotesPanel";
import { useAuth } from "./hooks/useAuth";
import { callApi } from "./lib/callApi";

const TRIPS_CACHE_KEY = "wanderway_cached_trips";
const ACTIVE_TRIP_CACHE_KEY = "wanderway_active_trip_id";
const PLANNING_NAV_NOTICE = "Your trip is still being planned. Please wait until WanderWay finishes before changing pages.";

function readCachedTrips(): Itinerary[] {
  try {
    const saved = localStorage.getItem(TRIPS_CACHE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const { user: firebaseAuthUser, loading: authLoading, signOut: firebaseSignOut, getIdToken } = useAuth();

  const [currentTab, setCurrentTab] = useState("dashboard");
  const [tripsList, setTripsList] = useState<Itinerary[]>(() => readCachedTrips());
  const [activeItinerary, setActiveItinerary] = useState<Itinerary | null>(() => {
    const cachedTrips = readCachedTrips();
    const activeId = localStorage.getItem(ACTIVE_TRIP_CACHE_KEY);
    return cachedTrips.find(trip => trip.id === activeId) || cachedTrips[0] || null;
  });
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isPlanningInProgress, setIsPlanningInProgress] = useState(false);
  const [planningNotice, setPlanningNotice] = useState<string | null>(null);

  // Real-time Collaboration States
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [latestWsMessage, setLatestWsMessage] = useState<any>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch trips list upon successful login
  const fetchTripsList = async () => {
    try {
      const data = await callApi<{ trips: Itinerary[] }>("/api/trips");
      if (data.trips && data.trips.length > 0) {
        setTripsList((cached) => {
          const merged = [...data.trips];
          cached.forEach((trip) => {
            if (trip.id && !merged.some(serverTrip => serverTrip.id === trip.id)) {
              merged.push(trip);
            }
          });
          return merged;
        });
        const defaultTrip = [...data.trips].sort((a, b) => {
          const ta = new Date(a.createdAt || 0).getTime();
          const tb = new Date(b.createdAt || 0).getTime();
          return tb - ta;
        })[0];
        setActiveItinerary((current) => current || defaultTrip || null);
      } else {
        setTripsList((cached) => cached);
        setActiveItinerary((current) => current);
      }
    } catch (err) {
      console.error("Error retrieving trips database:", err);
    }
  };

  useEffect(() => {
    localStorage.setItem(TRIPS_CACHE_KEY, JSON.stringify(tripsList));
  }, [tripsList]);

  useEffect(() => {
    if (activeItinerary?.id) {
      localStorage.setItem(ACTIVE_TRIP_CACHE_KEY, activeItinerary.id);
    }
  }, [activeItinerary?.id]);

  useEffect(() => {
    if (!planningNotice) return;

    const timeout = window.setTimeout(() => {
      setPlanningNotice(null);
    }, 4200);

    return () => window.clearTimeout(timeout);
  }, [planningNotice]);

  useEffect(() => {
    if (!isPlanningInProgress) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isPlanningInProgress]);

  // Reactively fetch trips when Firebase auth user changes
  useEffect(() => {
    let ignore = false;

    if (authLoading) {
      return () => {
        ignore = true;
      };
    }

    if (firebaseAuthUser) {
      (async () => {
        await fetchTripsList();
        if (ignore) return;
      })();
    } else {
      setTripsList([]);
      setActiveItinerary(null);
      setCurrentTab("dashboard");
    }

    return () => {
      ignore = true;
    };
  }, [authLoading, firebaseAuthUser?.email]);

  // Derive current user from Firebase auth state for downstream components
  const currentUser = firebaseAuthUser;
  const isLoggedIn = !!firebaseAuthUser;

  const handleSignOut = async () => {
    await firebaseSignOut();
    setTripsList([]);
    setActiveItinerary(null);
    setCurrentTab("dashboard");
  };

  const requestTabChange = (tab: string) => {
    if (isPlanningInProgress && currentTab === "planner" && tab !== "planner") {
      setPlanningNotice(PLANNING_NAV_NOTICE);
      return;
    }

    setCurrentTab(tab);
  };

  const handleNewTripClick = () => {
    requestTabChange("planner");
  };

  const handleItineraryGenerated = (itinerary: Itinerary) => {
    const generatedItinerary = {
      ...itinerary,
      createdAt: itinerary.createdAt || new Date().toISOString()
    };

    // Insert new generated trip into current local trips list state
    setTripsList((prev) => [generatedItinerary, ...prev.filter(trip => trip.id !== generatedItinerary.id)]);
    setActiveItinerary(generatedItinerary);
    setIsPlanningInProgress(false);
    setPlanningNotice(null);
    setCurrentTab("itinerary");
  };

  const handleItineraryUpdated = (itinerary: Itinerary) => {
    setActiveItinerary(itinerary);
    setTripsList((prev) => [itinerary, ...prev.filter(trip => trip.id !== itinerary.id)]);
  };

  const handleViewItinerary = (itinerary: Itinerary) => {
    setActiveItinerary(itinerary);
    requestTabChange("itinerary");
  };

  // Real-time Websocket Connection Management
  useEffect(() => {
    if (!isLoggedIn || !currentUser || !activeItinerary?.id) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.port === "4000" ? "localhost:3000" : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}`;

    let closedByEffect = false;
    let reconnectTimeout: number | null = null;
    let reconnectAttempt = 0;

    const connect = () => {
      console.log("Establishing WanderWay Sync connection with:", wsUrl);
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = async () => {
        reconnectAttempt = 0;
        setIsReconnecting(false);
        const token = await getIdToken();
        if (!token) {
          socket.close();
          return;
        }

        socket.send(JSON.stringify({
          type: "join",
          tripId: activeItinerary.id,
          token
        }));
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          setLatestWsMessage(msg);

          if (msg.type === "presence") {
            setOnlineUsers(msg.users);
          } else if (msg.type === "itinerary_updated") {
            setActiveItinerary((prev) => {
              if (!prev || prev.id !== msg.tripId) return prev;
              setTripsList(prevList => [msg.itinerary, ...prevList.filter(t => t.id !== msg.tripId)]);
              return msg.itinerary;
            });
          } else if (msg.type === "vote_updated") {
            setActiveItinerary((prev) => {
              if (!prev) return prev;
              if (prev.id !== msg.tripId) return prev;
              const updatedDays = prev.days.map((day) => {
                if (day.dayNumber === msg.dayNumber) {
                  return {
                    ...day,
                    activities: day.activities.map((act) => {
                      if (act.id === msg.activityId) {
                        const userVote = msg.userVotes?.[currentUser.email] || null;
                        return {
                          ...act,
                          votesUp: msg.votesUp,
                          votesDown: msg.votesDown,
                          userVotes: msg.userVotes,
                          userVote: userVote
                        };
                      }
                      return act;
                    })
                  };
                }
                return day;
              });

              const updated = { ...prev, days: updatedDays };
              // Keep tripsList fully synchronized
              setTripsList(prevList => prevList.map(t => t.id === prev.id ? updated : t));
              return updated;
            });
          } else if (msg.type === "comment_added") {
            setActiveItinerary((prev) => {
              if (!prev) return prev;
              if (prev.id !== msg.tripId) return prev;
              if (prev.comments?.some(c => c.id === msg.comment.id)) return prev;
              const updated = {
                ...prev,
                comments: [...(prev.comments || []), msg.comment]
              };
              setTripsList(prevList => prevList.map(t => t.id === prev.id ? updated : t));
              return updated;
            });
          } else if (msg.type === "collaborator_invited") {
            setActiveItinerary((prev) => {
              if (!prev) return prev;
              if (prev.id !== msg.tripId) return prev;
              if (prev.collaborators?.some(c => c.email.toLowerCase() === msg.collaborator.email.toLowerCase())) return prev;
              const updated = {
                ...prev,
                collaborators: [...(prev.collaborators || []), msg.collaborator]
              };
              setTripsList(prevList => prevList.map(t => t.id === prev.id ? updated : t));
              return updated;
            });
          } else if (msg.type === "documents_updated") {
            setActiveItinerary((prev) => {
              if (!prev) return prev;
              if (prev.id !== msg.tripId) return prev;
              const updated = {
                ...prev,
                documents: msg.documents
              };
              setTripsList(prevList => prevList.map(t => t.id === prev.id ? updated : t));
              return updated;
            });
          }
        } catch (err) {
          console.error("Failed to parse collaborative update payload:", err);
        }
      };

      socket.onerror = (err) => {
        console.error("WanderWay WebSocket error:", err);
      };

      socket.onclose = () => {
        if (closedByEffect) return;
        reconnectAttempt += 1;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 10000);
        setIsReconnecting(true);
        reconnectTimeout = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimeout !== null) {
        window.clearTimeout(reconnectTimeout);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isLoggedIn, activeItinerary?.id, currentUser?.email]);

  // Outgoing Collaborative Events Broadcast
  const handleVote = useCallback((dayNumber: number, activityId: string, voteType: "up" | "down") => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentUser && activeItinerary?.id) {
      wsRef.current.send(JSON.stringify({
        type: "vote",
        tripId: activeItinerary.id,
        dayNumber,
        activityId,
        voteType,
        email: currentUser.email
      }));
    }
  }, [currentUser, activeItinerary?.id]);

  const handleComment = useCallback((content: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentUser && activeItinerary?.id) {
      wsRef.current.send(JSON.stringify({
        type: "comment",
        tripId: activeItinerary.id,
        comment: {
          author: currentUser.name,
          avatar: currentUser.avatar,
          content
        }
      }));
    }
  }, [currentUser, activeItinerary?.id]);

  const handleInvite = useCallback((email: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeItinerary?.id) {
      wsRef.current.send(JSON.stringify({
        type: "invite",
        tripId: activeItinerary.id,
        email
      }));
    }
  }, [activeItinerary?.id]);

  // Connects Day schedule view's simple upvote clicks with WebSocket channels
  const handleActivityVote = useCallback((dayIdx: number, actIdx: number, voteType: "up" | "down") => {
    if (!activeItinerary) return;
    const day = activeItinerary.days[dayIdx];
    const activity = day.activities[actIdx];
    if (day && activity) {
      handleVote(day.dayNumber, activity.id, voteType);
    }
  }, [activeItinerary, handleVote]);

  const getTabHeaderDetails = () => {
    switch (currentTab) {
      case "dashboard":
        return {
          title: "Workspace Dashboard",
          tagline: "Explore your curated adventures, real-time trip synchronizations, and active getaways.",
          icon: <Home className="w-5 h-5 text-indigo-500 shrink-0" />,
          color: "bg-indigo-50/80 border-indigo-100 text-indigo-800"
        };
      case "planner":
        return {
          title: "AI Travel Planner",
          tagline: "Harness the power of Gemini AI to draft bespoke, day-by-day itineraries tailored to your style.",
          icon: <Compass className="w-5 h-5 text-violet-500 shrink-0 animate-spin" style={{ animationDuration: "12s" }} />,
          color: "bg-violet-50/80 border-violet-100 text-violet-800"
        };
      case "itinerary":
        return {
          title: "Curated Itinerary",
          tagline: "Your daily path, timing highlights, and real-time community schedule voting.",
          icon: <Map className="w-5 h-5 text-emerald-600 shrink-0" />,
          color: "bg-emerald-50/80 border-emerald-100 text-emerald-800"
        };
      case "collab":
        return {
          title: "Group Collaboration Hub",
          tagline: "Invite friends, vote on activities, and leave live coordinates comment logs.",
          icon: <Users className="w-5 h-5 text-sky-500 shrink-0" />,
          color: "bg-sky-50/80 border-sky-100 text-sky-800"
        };
      case "documents":
        return {
          title: "Documents Cabinet",
          tagline: "Safeguard your boarding passes, reservation sheets, and local permit files securely.",
          icon: <FolderOpen className="w-5 h-5 text-amber-500 shrink-0" />,
          color: "bg-amber-50/80 border-amber-100 text-amber-800"
        };
      case "packing":
        return {
          title: "Concierge Packing List",
          tagline: "Smart luggage checklist analyzed against local weather forecasts and active excursions.",
          icon: <Luggage className="w-5 h-5 text-rose-500 shrink-0" />,
          color: "bg-rose-50/80 border-rose-100 text-rose-800"
        };
      case "expenses":
        return {
          title: "Expenses Ledger",
          tagline: "Track collaborative financial ledgers, splits, and custom currency computations.",
          icon: <Receipt className="w-5 h-5 text-emerald-500 shrink-0" />,
          color: "bg-emerald-50/80 border-emerald-100 text-emerald-800"
        };
      default:
        return {
          title: "Wanderway Portal",
          tagline: "Curate your customized travel pathways intelligently.",
          icon: <Sparkles className="w-5 h-5 text-[#4FA8E0] shrink-0" />,
          color: "bg-slate-50/80 border-slate-100 text-slate-800"
        };
    }
  };

  const renderActiveTab = () => {
    const noTripPlaceholder = (tab: "itinerary" | "map" | "collab" | "packing" | "documents" | "expenses") => (
      <NewUserPlaceholder
        tab={tab}
        onStartPlanning={() => requestTabChange("planner")}
        onGoDashboard={() => requestTabChange("dashboard")}
      />
    );

    switch (currentTab) {
      case "dashboard":
        return (
          <Dashboard
            onPlanNewTrip={() => requestTabChange("planner")}
            onViewItinerary={handleViewItinerary}
            tripsList={tripsList}
            currentUser={currentUser}
          />
        );
      case "planner":
        return (
          <PlannerFormView
            onItineraryGenerated={handleItineraryGenerated}
            onPlanningStatusChange={setIsPlanningInProgress}
          />
        );
      case "itinerary":
        if (!activeItinerary) return noTripPlaceholder("itinerary");
        return (
          <ItineraryView
            itinerary={activeItinerary}
            onActivityVote={handleActivityVote}
            onItineraryUpdated={handleItineraryUpdated}
          />
        );
      case "map":
        if (!activeItinerary) return noTripPlaceholder("map");
        return <MapView itinerary={activeItinerary} />;
      case "collab":
        if (!activeItinerary) return noTripPlaceholder("collab");
        return (
          <CollabView
            currentUser={currentUser!}
            activeItinerary={activeItinerary}
            onlineUsers={onlineUsers}
            onVote={handleVote}
            onComment={handleComment}
            onInvite={handleInvite}
          />
        );
      case "packing":
        if (!activeItinerary) return noTripPlaceholder("packing");
        return <PackingListView itinerary={activeItinerary} />;
      case "documents":
        if (!activeItinerary?.id) return noTripPlaceholder("documents");
        return (
          <DocumentsView
            tripId={activeItinerary.id}
            itinerary={activeItinerary}
            currentUser={currentUser}
            wsMessage={latestWsMessage}
          />
        );
      case "expenses":
        if (!activeItinerary) return noTripPlaceholder("expenses");
        return <ExpensesView itinerary={activeItinerary} />;
      default:
        return (
          <Dashboard
            onPlanNewTrip={() => requestTabChange("planner")}
            onViewItinerary={handleViewItinerary}
            tripsList={tripsList}
            currentUser={currentUser}
          />
        );
    }
  };

  // Show loading spinner while Firebase auth state is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#FAFAF7] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-[#4FA8E0] rounded-full animate-spin" />
        <p className="font-sans text-sm text-slate-400 font-medium">Loading WanderWay...</p>
      </div>
    );
  }

  // Render Login view for unauthenticated users
  if (!isLoggedIn || !currentUser) {
    return <LoginView onLoginSuccess={() => { /* handled reactively by useAuth */ }} />;
  }

  const tabHeader = getTabHeaderDetails();

  return (
    <div className="min-h-screen bg-linear-to-tr from-[#FAFAF7] via-[#F4F7F5] to-[#EFF5FA] font-sans flex text-slate-800 relative overflow-x-hidden">

      {/* Decorative Elegant Soft Glow Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#E8A66B]/6 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] bg-[#4FA8E0]/6 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Sidebar - Desktop and Mobile adaptive navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={requestTabChange}
        onNewTripClick={handleNewTripClick}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 pb-20 md:pb-6 relative z-10">

        {/* Top Spacer block matching mobile top app bar */}
        <div className="h-16 md:hidden shrink-0"></div>

        {/* Redesigned Dynamic Content Container */}
        <main className="flex-1 px-4 py-6 md:px-8 max-w-360 mx-auto w-full space-y-6">

          {/* Unified Premium Redesigned Page Header */}
          <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in print:hidden">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center border border-slate-200 shadow-xs shrink-0">
                {tabHeader.icon}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                    {tabHeader.title}
                  </h1>
                  <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    Core V1.2
                  </span>
                </div>
                <p className="font-sans text-xs text-slate-500 max-w-xl">
                  {tabHeader.tagline}
                </p>
              </div>
            </div>

            {/* Right details / status widgets */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-white/80 border border-slate-200/80 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[11px] font-medium text-slate-600 shadow-3xs">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>
                  Active: <strong className="font-bold text-slate-800">
                    {activeItinerary
                      ? activeItinerary.originLocation
                        ? `${activeItinerary.originLocation} to ${activeItinerary.destination || "Destination"}`
                        : activeItinerary.destination || "Trip selected"
                      : "No trip selected"}
                  </strong>
                </span>
              </div>
              <div className="bg-emerald-50/80 border border-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[11px] font-bold text-emerald-800 shadow-3xs">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isReconnecting ? "Reconnecting..." : onlineUsers.length > 0 ? `${onlineUsers.length} active` : "Synced"}</span>
              </div>
            </div>
          </div>

          <div className="w-full">
            <AnimatePresence>
              {planningNotice && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl px-4 py-3 flex items-start gap-3 shadow-sm print:hidden"
                  role="status"
                  aria-live="polite"
                >
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-display text-sm font-bold">Planning in progress</p>
                    <p className="font-sans text-xs text-amber-800 mt-0.5">{planningNotice}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="w-full"
              >
                {renderActiveTab()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Floating Quick Notes Trigger Button */}
      <button
        id="floating-quick-notes-btn"
        onClick={() => setIsNotesOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-linear-to-tr from-[#3B7A57] to-[#4FA8E0] text-white p-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer flex items-center justify-center group"
        title="Open Scratchpad"
      >
        <FileText className="w-5 h-5 text-white" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-display font-bold text-xs text-white whitespace-nowrap">
          Quick Notes
        </span>
      </button>

      {/* Global Quick Notes Slide-out Panel */}
      <AnimatePresence>
        {isNotesOpen && (
          <QuickNotesPanel
            isOpen={isNotesOpen}
            onClose={() => setIsNotesOpen(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
