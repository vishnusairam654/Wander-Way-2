import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Search,
  Plane,
  Home,
  Ticket,
  FileCheck,
  Folder,
  ShieldAlert,
  Plus,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Itinerary, TravelDocument } from "../types";
import { callApi } from "../lib/callApi";
import { auth } from "../config/firebase";

interface DocumentsViewProps {
  tripId: string;
  itinerary: Itinerary;
  currentUser: { email: string; name: string; avatar: string } | null;
  wsMessage?: any; // To listen for live document updates
}

interface RequiredDocument {
  id: string;
  name: string;
  reason: string;
  category: TravelDocument["category"];
  required: boolean;
}

export default function DocumentsView({ tripId, itinerary, currentUser, wsMessage }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [checkedRequiredDocs, setCheckedRequiredDocs] = useState<string[]>(() => {
    const saved = localStorage.getItem(`wanderway_required_docs_${tripId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Form State for upload
  const [uploadCategory, setUploadCategory] = useState<"boarding-pass" | "hotel" | "ticket" | "id" | "other">("boarding-pass");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const destination = itinerary.destination || "Destination";
  const originLocation = itinerary.originLocation || "";
  const routeLabel = originLocation ? `${originLocation} to ${destination}` : destination;
  const travelMode = itinerary.travelMode || "mixed";

  useEffect(() => {
    const saved = localStorage.getItem(`wanderway_required_docs_${tripId}`);
    setCheckedRequiredDocs(saved ? JSON.parse(saved) : []);
  }, [tripId]);

  useEffect(() => {
    localStorage.setItem(`wanderway_required_docs_${tripId}`, JSON.stringify(checkedRequiredDocs));
  }, [checkedRequiredDocs, tripId]);

  const getRequiredDocuments = (): RequiredDocument[] => {
    return (itinerary.documentsList || []).map((doc, index) => ({
      id: `ai-doc-${index}`,
      name: doc.name,
      reason: doc.reason,
      category: "other",
      required: true
    }));
  };

  const requiredDocuments = getRequiredDocuments();
  const toggleRequiredDoc = (id: string) => {
    setCheckedRequiredDocs(prev => prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]);
  };

  // Fetch documents on mount or tripId change
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await callApi<{ documents?: TravelDocument[] }>(`/api/trips/${tripId}/documents`);
      setDocuments(data.documents || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to fetch travel documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      fetchDocuments();
    }
  }, [tripId]);

  // Listen for WebSocket live updates for files
  useEffect(() => {
    if (wsMessage && wsMessage.type === "documents_updated" && wsMessage.tripId === tripId) {
      setDocuments(wsMessage.documents || []);
    }
  }, [wsMessage, tripId]);

  // Handle manual file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      uploadFile(file);
    }
  };

  // Upload file to server as base64
  const uploadFile = (file: File) => {
    if (!currentUser) {
      setError("You must be logged in to upload documents.");
      return;
    }

    // Limit to 5MB to preserve memory inside sandbox container JSON
    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit.");
      return;
    }

    setUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Content = e.target?.result as string;

        const payload = {
          name: file.name,
          category: uploadCategory,
          size: file.size,
          uploadedBy: currentUser.name,
          content: base64Content
        };

        const data = await callApi<{ document: TravelDocument }>(`/api/trips/${tripId}/documents`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setDocuments(prev => [...prev, data.document]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: any) {
        console.error(err);
        setError(err.message || "File upload failed.");
      } finally {
        setUploading(false);
      }
    };

    reader.onerror = () => {
      setError("Error reading file.");
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      uploadFile(file);
    }
  };

  // Download a base64 document
  const handleDownload = async (doc: TravelDocument) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("You are not authenticated.");
      }

      const res = await fetch(`/api/documents/${doc.storageKey}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error("Download failed.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Could not download file.");
    }
  };

  // Delete a document from server
  const handleDelete = async (docId: string) => {
    try {
      await callApi<{ success: boolean }>(`/api/trips/${tripId}/documents/${docId}`, {
        method: "DELETE"
      });
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not delete document.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  // Get icons based on document category
  const getDocIcon = (category: string) => {
    switch (category) {
      case "boarding-pass":
        return <Plane className="w-5 h-5 text-indigo-500" />;
      case "hotel":
        return <Home className="w-5 h-5 text-amber-500" />;
      case "ticket":
        return <Ticket className="w-5 h-5 text-sky-500" />;
      case "id":
        return <ShieldAlert className="w-5 h-5 text-rose-500" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "boarding-pass": return "Boarding Pass";
      case "hotel": return "Hotel confirmation";
      case "ticket": return "Activity / Transit Ticket";
      case "id": return "ID / Passport";
      default: return "Document File";
    }
  };

  // Search/Filter logic
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="documents-screen" className="space-y-8 animate-fade-in print:hidden">

      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Travel Documents
          </h1>
          <p className="font-sans text-xs text-slate-500 mt-1">
            Securely upload, store, and share digital travel tickets, passes, and booking confirmations.
          </p>
        </div>
        <span className="font-sans text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full font-bold shadow-sm">
          Collaborative Hub
        </span>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-sans">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-extrabold text-sm text-slate-900">
              Required for {routeLabel}
            </h2>
            <p className="font-sans text-[11px] text-slate-500 mt-0.5">
              Checklist adapts to origin, destination, and preferred mode: {travelMode.replace("-", " ")}.
            </p>
          </div>
          <span className="font-mono text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            {checkedRequiredDocs.length}/{requiredDocuments.length} ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requiredDocuments.map((doc) => {
            const checked = checkedRequiredDocs.includes(doc.id);
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => toggleRequiredDoc(doc.id)}
                className={`text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${checked
                  ? "bg-emerald-50/70 border-emerald-200"
                  : "bg-slate-50/60 border-slate-200 hover:bg-white"
                  }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${checked ? "bg-emerald-100" : "bg-white border border-slate-200"}`}>
                  {checked ? <FileCheck className="w-4 h-4 text-emerald-700" /> : getDocIcon(doc.category)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-xs text-slate-900">{doc.name}</h3>
                    {doc.required && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-[10px] text-slate-500 leading-relaxed mt-1">{doc.reason}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Upload Column */}
        <div className="space-y-5">
          <h3 className="font-display font-bold text-sm text-slate-800 px-1">
            Upload Travel Document
          </h3>

          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">

            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="font-sans text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Document Category
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#4FA8E0] focus:bg-white rounded-xl px-3 py-2.5 text-xs font-sans font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="boarding-pass">✈️ Boarding Pass</option>
                <option value="hotel">🏨 Hotel Booking / Check-in</option>
                <option value="ticket">🎟️ Transit / Activity Ticket</option>
                <option value="id">🪪 Identity Card / Passport copy</option>
                <option value="other">📄 Other Trip PDF / Note</option>
              </select>
            </div>

            {/* Drag & Drop zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[18px] p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${isDragActive
                ? "border-emerald-500 bg-emerald-50/20"
                : "border-slate-300 hover:border-[#4FA8E0] hover:bg-slate-50/50"
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              />

              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-[#4FA8E0] animate-spin" />
                  <div>
                    <span className="block font-display font-bold text-xs text-slate-700">Uploading File...</span>
                    <span className="block font-sans text-[10px] text-slate-400 mt-1">Storing securely...</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <Upload className="w-6 h-6 text-slate-500" />
                  </div>
                  <div>
                    <span className="block font-display font-bold text-xs text-slate-800">
                      Drag & drop your file here
                    </span>
                    <span className="block font-sans text-[10px] text-slate-400 mt-1">
                      or click to browse local files (PDF, PNG, JPG, DOC up to 5MB)
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* List Files Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <h3 className="font-display font-bold text-sm text-slate-800">
              Trip Folder Explorer
            </h3>

            {/* Inline search and category filter */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl pl-8.5 pr-3 py-1.5 text-xs font-sans outline-none w-44 focus:border-[#4FA8E0] focus:w-52 transition-all shadow-sm"
                />
              </div>

              {/* Category selector */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-sans font-semibold text-slate-600 outline-none shadow-sm cursor-pointer"
              >
                <option value="all">📁 All Categories</option>
                <option value="boarding-pass">✈️ Boarding Passes</option>
                <option value="hotel">🏨 Hotel Bookings</option>
                <option value="ticket">🎟️ Tickets</option>
                <option value="id">🪪 ID / Passports</option>
                <option value="other">📄 Others</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-4 divide-y divide-slate-100 min-h-[300px] flex flex-col justify-start">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-2">
                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                <span className="font-sans text-xs text-slate-400">Loading trip folder...</span>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-slate-300" />
                </div>
                <h4 className="font-display font-bold text-xs text-slate-800">No Documents Found</h4>
                <p className="font-sans text-[11px] text-slate-400 mt-1 max-w-sm">
                  {searchQuery || selectedCategory !== "all"
                    ? "Adjust your filters or search query to find documents."
                    : "Upload travel confirmations, flight tickets, or check-in schedules so your trip team can easily view them."}
                </p>
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <div key={doc.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      {getDocIcon(doc.category)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display font-bold text-sm text-slate-800 truncate" title={doc.name}>
                        {doc.name}
                      </h4>
                      <p className="font-sans text-[10px] text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold uppercase tracking-wider text-[8px]">
                          {getCategoryLabel(doc.category)}
                        </span>
                        <span>•</span>
                        <span>{formatFileSize(doc.size)}</span>
                        <span>•</span>
                        <span>Uploaded by <strong>{doc.uploadedBy}</strong></span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Download Button */}
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-sm"
                      title="Download File"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 rounded-xl border border-rose-100 bg-rose-50/30 hover:bg-rose-50 text-rose-600 transition-all cursor-pointer shadow-sm md:opacity-0 md:group-hover:opacity-100"
                      title="Delete File"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
