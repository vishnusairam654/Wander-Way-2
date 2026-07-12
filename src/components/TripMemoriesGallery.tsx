import React, { useState, useEffect } from "react";
import {
  Image as ImageIcon,
  Pin,
  Trash2,
  Plus,
  Compass,
  Check,
  UploadCloud
} from "lucide-react";

interface MemoryItem {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  isPinned: boolean;
  promptUsed?: string;
  dateGenerated?: string;
  isUploaded?: boolean;
}

const INITIAL_MEMORIES: MemoryItem[] = [];

export default function TripMemoriesGallery() {
  const [memories, setMemories] = useState<MemoryItem[]>(() => {
    const saved = localStorage.getItem("wanderway_trip_memories");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
    return INITIAL_MEMORIES;
  });

  const [activeFilter, setActiveFilter] = useState<"all" | "pinned">("all");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("Landscape");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("wanderway_trip_memories", JSON.stringify(memories));
  }, [memories]);

  const togglePin = (id: string) => {
    setMemories(prev =>
      prev.map(mem => mem.id === id ? { ...mem, isPinned: !mem.isPinned } : mem)
    );
    showToast("Memory board updated!");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleDelete = (id: string) => {
    setMemories(prev => prev.filter(mem => mem.id !== id));
    showToast("Memory card removed.");
  };

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("❌ Please select a valid image file.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showToast("⚠️ Image is large. Upload may take longer.");
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setUploadedImage(e.target.result as string);
        showToast("📸 Image selected successfully!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedImage) {
      showToast("❌ Please select or drag an image first.");
      return;
    }

    setIsUploading(true);
    const title = newTitle.trim() || `Memory: ${newCategory}`;
    const desc = newDescription.trim() || `A beautiful memory of our trip under the ${newCategory} category.`;

    setTimeout(() => {
      const newItem: MemoryItem = {
        id: `mem-${Date.now()}`,
        title,
        category: newCategory,
        description: desc,
        imageUrl: uploadedImage,
        isPinned: true, // pin newly uploaded items automatically
        dateGenerated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        isUploaded: true
      };

      setMemories(prev => [newItem, ...prev]);
      setNewTitle("");
      setNewDescription("");
      setUploadedImage(null);
      setIsUploading(false);
      showToast("✨ Memory uploaded & pinned to board!");
    }, 800);
  };

  const filteredMemories = memories.filter(mem => {
    if (activeFilter === "pinned") return mem.isPinned;
    return true;
  });

  return (
    <div id="trip-memories-gallery" className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm space-y-6 font-sans">

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-800 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Shared Board</span>
          </div>
          <h2 className="font-display font-bold text-lg text-slate-900">
            Trip Memories & Mood Board
          </h2>
          <p className="text-xs text-slate-500 max-w-xl">
            Upload, document, and pin visual highlights or destination photos from your user device. Curate an interactive aesthetic memory board together.
          </p>
        </div>

        {/* Board Filters */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${activeFilter === "all"
                ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200"
              }`}
          >
            All Memories
          </button>
          <button
            onClick={() => setActiveFilter("pinned")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${activeFilter === "pinned"
                ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200"
              }`}
          >
            <Pin className="w-3.5 h-3.5 fill-current" />
            <span>Pinned Board ({memories.filter(m => m.isPinned).length})</span>
          </button>
        </div>
      </div>

      {/* Primary Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left column: User Device Image Uploader */}
        <div className="lg:col-span-1 bg-slate-50/50 rounded-2xl border border-slate-200/60 p-5 space-y-4 self-start">
          <div className="flex items-center gap-2 text-indigo-700">
            <Compass className="w-5 h-5" />
            <h3 className="font-display font-extrabold text-sm uppercase tracking-wider">
              Upload Memory
            </h3>
          </div>

          <form onSubmit={handleUploadMemory} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Image Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Sunset Over The Old Town"
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-sans"
              >
                <option value="Landscape">Vivid Landscape</option>
                <option value="Architecture">Historic Architecture</option>
                <option value="Aerial">Aerial Drone Vista</option>
                <option value="Adventure">Outdoor Adventure</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Description / Story
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe this special trip memory..."
                rows={3}
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-sans resize-none"
              />
            </div>

            {/* Drag & Drop File Upload Component */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Upload Image File
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => document.getElementById("device-image-input")?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 min-h-[120px] ${isDragOver
                    ? "border-indigo-500 bg-indigo-50/50"
                    : uploadedImage
                      ? "border-emerald-400 bg-emerald-50/10"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-slate-100/50"
                  }`}
              >
                <input
                  type="file"
                  id="device-image-input"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                {uploadedImage ? (
                  <div className="relative w-full h-24 rounded-lg overflow-hidden flex items-center justify-center bg-slate-100">
                    <img
                      src={uploadedImage}
                      alt="Device preview"
                      className="h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-[10px] font-bold">Replace Image</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-slate-400" />
                    <div className="space-y-0.5">
                      <span className="block text-[10.5px] font-bold text-slate-700">
                        Drag & Drop or click to upload
                      </span>
                      <p className="text-[9px] text-slate-450 leading-none">
                        Supports PNG, JPG, JPEG (Max 3MB)
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isUploading || !uploadedImage}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-xl font-display font-bold text-xs shadow-md shadow-indigo-100 hover:shadow-lg hover:from-indigo-700 hover:to-indigo-900 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving to Board...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-white" />
                  <span>Pin to Memory Board</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right column: Gallery Display */}
        <div className="lg:col-span-2 space-y-4">
          {filteredMemories.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3">
              <ImageIcon className="w-10 h-10 text-slate-300" />
              <div className="space-y-1">
                <span className="block font-bold text-xs text-slate-700">No memories pinned yet</span>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Pin images in the general memory tab to have them show up on your curated board.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col group relative"
                >
                  {/* Category Pill Tag */}
                  <div className="absolute top-3 left-3 z-10 bg-black/55 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">
                    {mem.category}
                  </div>

                  {/* Actions Bar */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => togglePin(mem.id)}
                      className={`p-1.5 rounded-full backdrop-blur-xs shadow-sm transition-all border cursor-pointer ${mem.isPinned
                          ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600"
                          : "bg-black/40 text-white border-white/10 hover:bg-black/60"
                        }`}
                      title={mem.isPinned ? "Unpin from memory board" : "Pin to board"}
                    >
                      <Pin className={`w-3.5 h-3.5 ${mem.isPinned ? "fill-white" : ""}`} />
                    </button>
                    <button
                      onClick={() => handleDelete(mem.id)}
                      className="p-1.5 rounded-full bg-black/40 text-white border-white/10 hover:bg-red-500 hover:text-white backdrop-blur-xs transition-colors cursor-pointer"
                      title="Delete Memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Image container */}
                  <div className="h-44 bg-slate-100 relative overflow-hidden">
                    <img
                      src={mem.imageUrl}
                      alt={mem.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Content block */}
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>{mem.isUploaded ? "USER UPLOADED" : "SHARED HIGHLIGHT"}</span>
                        <span>{mem.dateGenerated || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                      <h4 className="font-display font-bold text-sm text-slate-900 leading-tight">
                        {mem.title}
                      </h4>
                      <p className="font-sans text-[11px] text-slate-500 leading-relaxed font-light">
                        {mem.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
