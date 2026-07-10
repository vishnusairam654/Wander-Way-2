import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  FileText, 
  X, 
  Plus, 
  Search, 
  Trash2, 
  Sparkles, 
  Pin,
  Clipboard,
  Check,
  Tag
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  category: "Idea" | "Place" | "Food" | "Packing" | "General";
  createdAt: string;
  isPinned: boolean;
}

interface QuickNotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickNotesPanel({ isOpen, onClose }: QuickNotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState<Note["category"]>("General");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem("wanderway_quick_notes");
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error("Error parsing saved quick notes:", e);
      }
    } else {
      // Seed initial sample notes so the panel doesn't look empty and is highly intuitive
      const initialNotes: Note[] = [
        {
          id: "note-1",
          title: "Mango Tree Restaurant Recommendation",
          content: "Rahul mentioned Mango Tree has amazing local thalis and authentic banana flower curry! Right near the river.",
          category: "Food",
          createdAt: new Date().toLocaleDateString(),
          isPinned: true
        },
        {
          id: "note-2",
          title: "Matanga Hill Sunrise Tip",
          content: "Start the hike at 5:00 AM sharp to catch the red sun rising behind the Virupaksha Temple tower. Bring a flashlight!",
          category: "Idea",
          createdAt: new Date().toLocaleDateString(),
          isPinned: false
        }
      ];
      setNotes(initialNotes);
      localStorage.setItem("wanderway_quick_notes", JSON.stringify(initialNotes));
    }
  }, []);

  // Save notes to localStorage
  const saveNotesToStorage = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem("wanderway_quick_notes", JSON.stringify(updatedNotes));
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: noteTitle.trim() || "Untitled Note",
      content: noteContent.trim(),
      category: noteCategory,
      createdAt: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isPinned: false
    };

    const updated = [newNote, ...notes];
    saveNotesToStorage(updated);

    // Reset inputs
    setNoteTitle("");
    setNoteContent("");
    setNoteCategory("General");
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notes.filter(n => n.id !== id);
    saveNotesToStorage(updated);
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notes.map(n => {
      if (n.id === id) {
        return { ...n, isPinned: !n.isPinned };
      }
      return n;
    });
    saveNotesToStorage(updated);
  };

  const handleCopyNote = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `[${note.category}] ${note.title}\n${note.content}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Sort notes so pinned ones are always at the top
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const filteredNotes = sortedNotes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryBadgeClass = (category: Note["category"]) => {
    switch (category) {
      case "Idea":
        return "bg-amber-50 text-amber-600 border-amber-100";
      case "Place":
        return "bg-indigo-50 text-indigo-600 border-indigo-100";
      case "Food":
        return "bg-rose-50 text-rose-600 border-rose-100";
      case "Packing":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        id="quick-notes-backdrop"
        onClick={onClose} 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity animate-fade-in"
      />

      {/* Slide-out Panel */}
      <motion.div 
        id="quick-notes-slideout"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="fixed top-0 right-0 h-screen w-full sm:w-[420px] bg-[#FAFAF8] shadow-2xl border-l border-slate-200 z-50 flex flex-col outline-none"
      >
        {/* Header */}
        <header className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3B7A57] to-[#4FA8E0] flex items-center justify-center text-white shadow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                Quick Scratchpad
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              </h2>
              <p className="font-sans text-[10px] text-slate-400 font-medium">
                Save ideas, addresses, and scratch notes on the fly
              </p>
            </div>
          </div>
          <button 
            id="quick-notes-close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Note Adder Section */}
        <section className="p-5 bg-white border-b border-slate-200 shadow-xs space-y-3 shrink-0">
          <form onSubmit={handleAddNote} className="space-y-3">
            <input 
              id="quick-note-title"
              type="text"
              placeholder="Note Title (optional)"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full bg-slate-50 border border-transparent focus:border-[#4FA8E0] focus:bg-white rounded-xl px-3 py-2 text-xs font-sans font-semibold text-slate-800 outline-none transition-all"
            />
            
            <textarea
              id="quick-note-content"
              required
              rows={3}
              placeholder="Jot down a quick thought, link, or location..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full bg-slate-50 border border-transparent focus:border-[#4FA8E0] focus:bg-white rounded-xl px-3 py-2.5 text-xs font-sans text-slate-700 outline-none transition-all resize-none"
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              {/* Category Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 cursor-pointer">
                <Tag className="w-3 h-3 text-slate-400" />
                <select
                  id="quick-note-category"
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as any)}
                  className="bg-transparent font-sans text-[10px] font-bold text-slate-500 outline-none border-none p-0 pr-4 cursor-pointer"
                >
                  <option value="General">💡 General</option>
                  <option value="Idea">💡 Idea</option>
                  <option value="Place">📍 Place</option>
                  <option value="Food">🍽️ Food</option>
                  <option value="Packing">🎒 Packing</option>
                </select>
              </div>

              {/* Add Button */}
              <button
                id="quick-note-add-btn"
                type="submit"
                className="bg-[#4FA8E0] hover:bg-[#3db3e6] text-white px-3.5 py-1.5 rounded-xl font-display font-bold text-[10px] shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>Save Note</span>
              </button>
            </div>
          </form>
        </section>

        {/* Search Notes bar */}
        <div className="p-4 shrink-0 bg-[#FAFAF8] border-b border-slate-200">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="quick-notes-search"
              type="text"
              placeholder="Search your scratchpad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-8.5 pr-3 py-1.5 text-xs font-sans outline-none focus:border-[#4FA8E0] transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Notes List Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center h-full">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-slate-300" />
              </div>
              <h4 className="font-display font-bold text-xs text-slate-700">Scratchpad is empty</h4>
              <p className="font-sans text-[10px] text-slate-400 mt-1 max-w-[220px]">
                {searchQuery ? "No matches found." : "Your temporary list is clean. Jot down anything you don't want to forget!"}
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div 
                key={note.id} 
                className={`p-4 rounded-2xl bg-white border border-slate-150 shadow-xs hover:shadow-sm hover:border-slate-200 transition-all flex flex-col justify-between gap-3 relative group ${
                  note.isPinned ? "border-amber-100/70 bg-amber-50/5" : ""
                }`}
              >
                {/* Note Header & Pinned Tag */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`inline-block border rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider mb-1.5 ${getCategoryBadgeClass(note.category)}`}>
                      {note.category}
                    </span>
                    <h4 className="font-display font-bold text-xs text-slate-800 break-words">
                      {note.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1 opacity-60 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleTogglePin(note.id, e)}
                      className={`p-1 rounded-md hover:bg-slate-50 cursor-pointer ${
                        note.isPinned ? "text-amber-500" : "text-slate-400 hover:text-slate-600"
                      }`}
                      title={note.isPinned ? "Unpin Note" : "Pin Note"}
                    >
                      <Pin className={`w-3.5 h-3.5 ${note.isPinned ? "fill-current" : ""}`} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="p-1 rounded-md hover:bg-slate-50 text-slate-400 hover:text-rose-500 cursor-pointer"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <p className="font-sans text-xs text-slate-600 whitespace-pre-wrap leading-relaxed break-words">
                  {note.content}
                </p>

                {/* Footer bar */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 shrink-0">
                  <span className="font-sans text-[8px] text-slate-400 font-medium">
                    {note.createdAt}
                  </span>

                  <button
                    onClick={(e) => handleCopyNote(note, e)}
                    className="flex items-center gap-1 font-sans text-[9px] font-bold text-slate-400 hover:text-[#4FA8E0] cursor-pointer"
                    title="Copy to Clipboard"
                  >
                    {copiedId === note.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-3 h-3 text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}
