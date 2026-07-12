import React, { useState, useRef, useEffect } from "react";
import { Users, Link, Check, Mail, MessageSquare, ThumbsUp, ThumbsDown, Send, UserPlus } from "lucide-react";
import { Itinerary } from "../types";

interface CollabViewProps {
  currentUser: { email: string; name: string; avatar: string };
  activeItinerary: Itinerary;
  onlineUsers: any[];
  onVote: (dayNumber: number, activityId: string, voteType: "up" | "down") => void;
  onComment: (content: string) => void;
  onInvite: (email: string) => void;
}

export default function CollabView({
  currentUser,
  activeItinerary,
  onlineUsers,
  onVote,
  onComment,
  onInvite
}: CollabViewProps) {
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [commentText, setCommentText] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeItinerary?.comments]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes("@")) return;
    onInvite(inviteEmail.trim());
    setInviteSuccess(`Invitation sent to ${inviteEmail}!`);
    setInviteEmail("");
    setTimeout(() => setInviteSuccess(null), 3000);
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment(commentText.trim());
    setCommentText("");
  };

  const currentTripName = activeItinerary?.title || "Untitled Trip";
  const collaborators = activeItinerary?.collaborators || [];
  const comments = activeItinerary?.comments || [];
  const firstDay = activeItinerary?.days?.[0];
  const activities = firstDay?.activities || [];

  return (
    <div id="collab-screen" className="space-y-8 animate-fade-in">

      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Collaboration Portal: {currentTripName}
        </h1>
        <p className="font-sans text-xs text-slate-500 mt-1">
          Invite teammates, converse, and cast real-time votes to automatically align your vibes.
        </p>
      </div>

      {/* Top Banner Widget */}
      <section className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="space-y-2">
          <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Public Invitation Link
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/join/${activeItinerary?.id || "trip"}`}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-500 w-72 outline-none select-all truncate"
            />
            <button
              onClick={handleCopyLink}
              className={`p-2.5 rounded-xl border border-slate-200 flex items-center justify-center transition-colors cursor-pointer ${copied ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              title="Copy link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collaborators profile stack */}
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Total Collaborators ({collaborators.length})
            </span>
            <div className="flex -space-x-2 mt-1.5">
              {collaborators.map((c, idx) => (
                <img
                  key={c.email + idx}
                  src={c.avatar}
                  alt={c.name}
                  className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm"
                  title={`${c.name} (${c.email})`}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Active Online Now ({onlineUsers.length})
            </span>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-sans text-slate-600 font-semibold">
                {onlineUsers.map(u => u.name).join(", ") || "Just You"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Board Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Columns: Interactive Itinerary Voting and Invite */}
        <div className="lg:col-span-2 space-y-6">

          {/* Invite Form */}
          <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
            <h3 className="font-display font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-4.5 h-4.5 text-[#4FA8E0]" />
              <span>Invite New Collaborator</span>
            </h3>
            <form onSubmit={handleSendInvite} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email (e.g. priya@wanderway.com)"
                  className="w-full bg-slate-50 border border-transparent rounded-xl py-3 pl-11 pr-4 focus:border-[#4FA8E0] focus:bg-white focus:outline-none transition-all font-sans text-xs text-slate-800"
                />
              </div>
              <button
                type="submit"
                className="bg-gradient-to-r from-[#4FA8E0] to-[#3ACBB8] text-white px-5 rounded-xl font-display font-bold text-xs shadow-md shadow-sky-50 hover:brightness-105 active:scale-95 transition-all cursor-pointer"
              >
                Send Invite
              </button>
            </form>
            {inviteSuccess && (
              <p className="text-emerald-600 text-xs font-sans mt-2 animate-fade-in">{inviteSuccess}</p>
            )}
          </div>

          {/* Voting Board */}
          <div className="space-y-4">
            <div className="flex justify-between items-baseline px-1">
              <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#3ACBB8]" />
                <span>Day 1 Interactive Activities Consent</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium font-sans">Synced in real time</span>
            </div>

            {activities.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-xs font-sans">
                No activities generated on Day 1 to vote on yet. Create a trip or plan an itinerary!
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((act) => {
                  const votesUp = act.votesUp || 0;
                  const votesDown = act.votesDown || 0;
                  const totalVotes = votesUp + votesDown;
                  const yesPercent = totalVotes > 0 ? Math.round((votesUp / totalVotes) * 100) : 0;

                  // Detect user's current vote
                  const userVote = act.userVotes?.[currentUser.email] || null;

                  return (
                    <div key={act.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          {act.isMustSee && (
                            <span className="bg-red-50 text-red-500 font-sans font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                              Must See
                            </span>
                          )}
                          <h4 className="font-display font-bold text-sm text-slate-900 mt-1">
                            {act.title}
                          </h4>
                          <p className="font-sans text-xs text-slate-500 mt-0.5">
                            {act.time} • {act.cost || "Free"} • Rating: {act.rating}★
                          </p>
                          <p className="font-sans text-xs text-slate-500 mt-1 leading-relaxed">
                            {act.description}
                          </p>
                        </div>

                        <div className="flex-shrink-0 text-right">
                          <span className={`text-[10px] font-sans font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${yesPercent >= 70 ? "text-emerald-600 bg-emerald-50" : "text-slate-500 bg-slate-50"
                            }`}>
                            {yesPercent >= 70 ? "High Consent" : "Under Debate"}
                          </span>
                        </div>
                      </div>

                      {/* consensus agreement metric bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-sans text-slate-500 font-medium">
                          <span>Group Consensus Agreement</span>
                          <span className="text-[#3ACBB8] font-bold font-display">{yesPercent}% Agreement</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-gradient-to-r from-[#4FA8E0] to-[#3ACBB8] transition-all duration-300"
                            style={{ width: `${yesPercent}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>👍 {votesUp} Thumbs up</span>
                          <span>👎 {votesDown} Thumbs down</span>
                        </div>
                      </div>

                      {/* Interactive click toggles */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => onVote(firstDay.dayNumber, act.id, "up")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${userVote === "up"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                            }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{userVote === "up" ? "Supported" : "Support"}</span>
                        </button>

                        <button
                          onClick={() => onVote(firstDay.dayNumber, act.id, "down")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${userVote === "down"
                              ? "bg-red-50 text-red-500 border-red-200"
                              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                            }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>{userVote === "down" ? "Objected" : "Object"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Group discussion and Chat Logs */}
        <div className="space-y-4 flex flex-col h-[600px]">
          <h3 className="font-display font-bold text-base text-slate-900 px-1 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#FF8A65]" />
            <span>Real-time Chat Logs</span>
          </h3>

          <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <span className="block text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-wider">
                Discussion thread
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {comments.length} messages
              </span>
            </div>

            {/* Scrollable messages panel */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs p-4">
                  <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                  <p>No chat logs yet. Start the conversation by sending a message below!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5 items-start text-xs font-sans">
                    <img
                      src={comment.avatar}
                      alt={comment.author}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-slate-800">{comment.author}</span>
                        <span className="text-[9px] text-slate-400">{comment.timestamp}</span>
                      </div>
                      <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl rounded-tl-none leading-relaxed mt-1 whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Message input bar */}
            <form onSubmit={handleSendComment} className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type your group message..."
                className="flex-1 bg-slate-50 border border-transparent rounded-xl px-4 py-3 text-xs font-sans text-slate-800 focus:bg-white focus:border-[#FF8A65] focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#FF8A65] hover:bg-orange-500 text-white p-3 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                title="Send message"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
