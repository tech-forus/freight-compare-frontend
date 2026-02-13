import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  Package,
  MapPin,
  Truck,
  Train,
  Plane,
  Ship,
  Trash2,
  Search,
  RefreshCw,
  IndianRupee,
  Calendar,
  ArrowRight,
  Plus,
  FolderPlus,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Laptop,
  Shirt,
  FileText,
  Apple,
  Wrench,
  Wine,
  ShoppingBag,
  Layers,
  Download,
  Upload,
  Loader2,
  CheckCircle,
  Route,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";
import {
  getBoxLibraries,
  createBoxLibrary,
  updateBoxLibrary,
  deleteBoxLibrary,
  getSearchHistory,
  deleteSearchHistoryEntry,
  clearAllSearchHistory,
  type SearchHistoryEntry,
} from "../services/api";
import {
  generateBoxLibraryTemplate,
  parseExcelToBoxes,
  isExcelFile,
  BoxExcelRow,
} from "../utils/excelConverter";

// --- LIBRARY CATEGORIES ---
const LIBRARY_CATEGORIES = [
  { id: "electronics", name: "Electronics & Appliances", icon: Laptop, color: "blue" },
  { id: "textiles", name: "Textiles & Garments", icon: Shirt, color: "purple" },
  { id: "documents", name: "Documents & Papers", icon: FileText, color: "amber" },
  { id: "perishables", name: "Food & Perishables", icon: Apple, color: "green" },
  { id: "machinery", name: "Machinery & Equipment", icon: Wrench, color: "slate" },
  { id: "fragile", name: "Fragile Items", icon: Wine, color: "red" },
  { id: "general", name: "General Merchandise", icon: ShoppingBag, color: "teal" },
  { id: "custom", name: "Custom", icon: Layers, color: "indigo" },
];

// --- TYPE DEFINITIONS ---
type BoxItem = {
  id: string;
  name: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  quantity: number;
};

type BoxLibrary = {
  id: string;
  _id?: string;
  name: string;
  category: string;
  boxes: BoxItem[];
  createdAt: string;
};

// --- STYLED HELPER COMPONENTS ---
const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    className={`bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-200/80 ${className}`}
  >
    {children}
  </motion.div>
);

const TransportIcon = ({ mode, size = 18 }: { mode: string; size?: number }) => {
  const iconMap: Record<string, React.ReactNode> = {
    Road: <Truck size={size} />,
    Rail: <Train size={size} />,
    Air: <Plane size={size} />,
    Ship: <Ship size={size} />,
  };
  return <>{iconMap[mode] || <Truck size={size} />}</>;
};

const RecentSearchesPage: React.FC = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [libraries, setLibraries] = useState<BoxLibrary[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"libraries" | "recent" | "completed">("libraries");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLibraries, setExpandedLibraries] = useState<Set<string>>(new Set());
  const [expandedSearches, setExpandedSearches] = useState<Set<string>>(new Set());

  // New library modal state
  const [showNewLibraryModal, setShowNewLibraryModal] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [newLibraryCategory, setNewLibraryCategory] = useState("general");

  // New box state
  const [addingBoxToLibrary, setAddingBoxToLibrary] = useState<string | null>(null);
  const [newBox, setNewBox] = useState<Partial<BoxItem>>({
    name: "",
    weight: undefined,
    length: undefined,
    width: undefined,
    height: undefined,
    quantity: 1,
  });

  // Excel upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLibraryName, setUploadLibraryName] = useState("");
  const [uploadLibraryCategory, setUploadLibraryCategory] = useState("general");
  const [parsedBoxes, setParsedBoxes] = useState<BoxExcelRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LOAD DATA ---
  const loadLibraries = async () => {
    try {
      const apiLibraries = await getBoxLibraries();
      const transformed: BoxLibrary[] = apiLibraries.map((lib) => ({
        id: lib._id,
        _id: lib._id,
        name: lib.name,
        category: lib.category,
        boxes: (lib.boxes || []).map((box) => ({
          id: box._id || `box-${Date.now()}-${Math.random()}`,
          name: box.name,
          weight: box.weight,
          length: box.length,
          width: box.width,
          height: box.height,
          quantity: box.quantity,
        })),
        createdAt: lib.createdAt,
      }));
      setLibraries(transformed);
    } catch (error) {
      console.error("Failed to load libraries:", error);
      setLibraries([]);
    }
  };

  const loadSearchHistory = async () => {
    try {
      const entries = await getSearchHistory();
      setSearchHistory(entries);
    } catch (error) {
      console.error("Failed to load search history:", error);
      setSearchHistory([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadLibraries(), loadSearchHistory()]);
      setIsLoading(false);
    };
    init();
  }, []);

  // --- LIBRARY HANDLERS ---
  const handleCreateLibrary = async () => {
    if (!newLibraryName.trim()) return;

    const created = await createBoxLibrary(newLibraryName.trim(), newLibraryCategory, []);
    if (created) {
      const newLib: BoxLibrary = {
        id: created._id,
        _id: created._id,
        name: created.name,
        category: created.category,
        boxes: [],
        createdAt: created.createdAt,
      };
      setLibraries([newLib, ...libraries]);
      setNewLibraryName("");
      setNewLibraryCategory("general");
      setShowNewLibraryModal(false);
      setExpandedLibraries(new Set([...expandedLibraries, newLib.id]));
    }
  };

  const handleDeleteLibrary = async (libId: string) => {
    if (window.confirm("Delete this library and all its boxes?")) {
      const success = await deleteBoxLibrary(libId);
      if (success) {
        setLibraries(libraries.filter(l => l.id !== libId));
      }
    }
  };

  const toggleLibraryExpand = (libId: string) => {
    const newExpanded = new Set(expandedLibraries);
    if (newExpanded.has(libId)) {
      newExpanded.delete(libId);
    } else {
      newExpanded.add(libId);
    }
    setExpandedLibraries(newExpanded);
  };

  const toggleSearchExpand = (searchId: string) => {
    const newExpanded = new Set(expandedSearches);
    if (newExpanded.has(searchId)) {
      newExpanded.delete(searchId);
    } else {
      newExpanded.add(searchId);
    }
    setExpandedSearches(newExpanded);
  };

  // --- BOX HANDLERS ---
  const handleAddBox = async (libId: string) => {
    if (!newBox.name?.trim() || !newBox.weight || !newBox.length || !newBox.width || !newBox.height) return;

    const box: BoxItem = {
      id: `box-${Date.now()}`,
      name: newBox.name.trim(),
      weight: newBox.weight,
      length: newBox.length,
      width: newBox.width,
      height: newBox.height,
      quantity: newBox.quantity || 1,
    };

    const library = libraries.find(l => l.id === libId);
    if (!library) return;

    const updatedBoxes = [...library.boxes, box];
    const apiBoxes = updatedBoxes.map(b => ({
      name: b.name,
      weight: b.weight,
      length: b.length,
      width: b.width,
      height: b.height,
      quantity: b.quantity,
    }));

    const result = await updateBoxLibrary(libId, { boxes: apiBoxes });
    if (result) {
      setLibraries(libraries.map(lib =>
        lib.id === libId ? { ...lib, boxes: updatedBoxes } : lib
      ));
    }

    setNewBox({ name: "", weight: undefined, length: undefined, width: undefined, height: undefined, quantity: 1 });
    setAddingBoxToLibrary(null);
  };

  const handleDeleteBox = async (libId: string, boxId: string) => {
    const library = libraries.find(l => l.id === libId);
    if (!library) return;

    const updatedBoxes = library.boxes.filter(b => b.id !== boxId);
    const apiBoxes = updatedBoxes.map(b => ({
      name: b.name,
      weight: b.weight,
      length: b.length,
      width: b.width,
      height: b.height,
      quantity: b.quantity,
    }));

    const result = await updateBoxLibrary(libId, { boxes: apiBoxes });
    if (result) {
      setLibraries(libraries.map(lib =>
        lib.id === libId ? { ...lib, boxes: updatedBoxes } : lib
      ));
    }
  };

  // --- USE LIBRARY LOGIC ---
  const [libraryToUse, setLibraryToUse] = useState<BoxLibrary | null>(null);
  const [selectedBoxIdsForUse, setSelectedBoxIdsForUse] = useState<Set<string>>(new Set());

  const saveFormStateToStorage = (state: any) => {
    try {
      const prevStr = sessionStorage.getItem("fc:form");
      const prev = prevStr ? JSON.parse(prevStr) : {};
      const merged = { ...prev, ...state };
      sessionStorage.setItem("fc:form", JSON.stringify(merged));
    } catch (e) {
      console.error("Failed to save form state", e);
    }
  };

  const handleUseLibrary = (library: BoxLibrary) => {
    if (library.boxes.length === 0) return;
    setLibraryToUse(library);
    setSelectedBoxIdsForUse(new Set(library.boxes.map(b => b.id)));
  };

  const toggleBoxSelectionForUse = (boxId: string) => {
    const newSet = new Set(selectedBoxIdsForUse);
    if (newSet.has(boxId)) {
      newSet.delete(boxId);
    } else {
      newSet.add(boxId);
    }
    setSelectedBoxIdsForUse(newSet);
  };

  const confirmUseLibrary = () => {
    if (!libraryToUse) return;

    const boxesToUse = libraryToUse.boxes.filter(b => selectedBoxIdsForUse.has(b.id));

    if (boxesToUse.length === 0) {
      if (!window.confirm("No boxes selected. Proceed anyway?")) return;
    }

    const startIdx = 1;
    const mappedBoxes = boxesToUse.map((b, i) => ({
      id: `box-${Date.now()}-${i}`,
      count: b.quantity || 1,
      length: b.length,
      width: b.width,
      height: b.height,
      weight: b.weight,
      description: b.name || `Box ${startIdx + i}`,
    }));

    saveFormStateToStorage({ boxes: mappedBoxes });
    sessionStorage.setItem("prefilledSearch", JSON.stringify({ boxes: mappedBoxes }));
    navigate("/compare");
  };

  const cancelUseLibrary = () => {
    setLibraryToUse(null);
    setSelectedBoxIdsForUse(new Set());
  };

  // --- SEARCH HISTORY HANDLERS ---
  const handleDeleteSearch = async (id: string) => {
    const success = await deleteSearchHistoryEntry(id);
    if (success) {
      setSearchHistory(searchHistory.filter(s => s._id !== id));
    }
  };

  const handleClearAllHistory = async () => {
    if (window.confirm("Clear all recent searches?")) {
      const success = await clearAllSearchHistory();
      if (success) {
        setSearchHistory([]);
      }
    }
  };

  const handleSearchAgain = (search: SearchHistoryEntry) => {
    const formData = {
      fromPincode: search.fromPincode,
      toPincode: search.toPincode,
      modeOfTransport: search.modeOfTransport,
      boxes: search.boxes.map((b, i) => ({
        id: `box-${Date.now()}-${i}`,
        count: b.count || 1,
        length: b.length || 0,
        width: b.width || 0,
        height: b.height || 0,
        weight: b.weight || 0,
        description: b.description || `Box ${i + 1}`,
      })),
    };
    saveFormStateToStorage(formData);
    sessionStorage.setItem("prefilledSearch", JSON.stringify(formData));
    navigate("/compare");
  };

  // --- EXCEL HANDLERS ---
  const handleDownloadTemplate = () => {
    try {
      generateBoxLibraryTemplate();
    } catch (error) {
      console.error('Failed to generate template:', error);
      alert('Failed to generate Excel template. Please try again.');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!isExcelFile(file)) {
      alert('Please upload an Excel file (.xlsx or .xls)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Parse the Excel file
      const boxes = await parseExcelToBoxes(file);

      if (boxes.length === 0) {
        throw new Error('No valid boxes found in the Excel file');
      }

      // Store parsed boxes and show modal for library naming
      setParsedBoxes(boxes);
      setShowUploadModal(true);
      setUploadLibraryName('');
      setUploadLibraryCategory('general');
    } catch (error) {
      console.error('Excel parsing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse Excel file';
      setUploadError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      // Clear file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateLibraryFromExcel = async () => {
    if (!uploadLibraryName.trim()) {
      alert('Please enter a library name');
      return;
    }

    if (parsedBoxes.length === 0) {
      alert('No boxes to create');
      return;
    }

    setIsUploading(true);

    try {
      // Transform parsed boxes to API format
      const apiBoxes = parsedBoxes.map(box => ({
        name: box.name,
        weight: box.weight,
        length: box.length,
        width: box.width,
        height: box.height,
        quantity: box.quantity || 1,
      }));

      // Create library with boxes
      const created = await createBoxLibrary(
        uploadLibraryName.trim(),
        uploadLibraryCategory,
        apiBoxes
      );

      if (created) {
        // Refresh libraries list
        await loadLibraries();

        // Close modal and reset state
        setShowUploadModal(false);
        setParsedBoxes([]);
        setUploadLibraryName('');
        setUploadLibraryCategory('general');

        alert(`Successfully created library "${uploadLibraryName}" with ${parsedBoxes.length} boxes`);
      } else {
        throw new Error('Failed to create library');
      }
    } catch (error) {
      console.error('Error creating library from Excel:', error);
      alert('Failed to create library. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const cancelUploadModal = () => {
    setShowUploadModal(false);
    setParsedBoxes([]);
    setUploadLibraryName('');
    setUploadError(null);
  };


  // --- FILTERED DATA ---
  const filteredLibraries = libraries.filter((lib) =>
    (lib.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lib.boxes || []).some(b => (b.name || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSearches = searchHistory.filter((s) =>
    !s.isBooked && (
      (s.fromPincode || "").includes(searchTerm) ||
      (s.toPincode || "").includes(searchTerm) ||
      (s.fromCity || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.toCity || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.boxes || []).some((b) => b.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  const completedTransactions = searchHistory.filter((s) => s.isBooked);

  const getCategoryInfo = (categoryId: string) => {
    return LIBRARY_CATEGORIES.find(c => c.id === categoryId) || LIBRARY_CATEGORIES[7];
  };

  const formatLocation = (pincode: string, city: string, state: string) => {
    if (city && state) return `${city}, ${state} (${pincode})`;
    if (city) return `${city} (${pincode})`;
    return pincode;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans">
      <div
        className="absolute top-0 left-0 w-full h-80 bg-gradient-to-br from-blue-50 to-slate-100"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 65%, 0% 100%)" }}
      ></div>

      <div className="relative max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <header className="text-center py-8">
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight"
          >
            Box Libraries & History
          </motion.h1>
          <motion.p
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto"
          >
            Organize your frequently shipped items into libraries for quick calculations.
          </motion.p>
        </header>

        {/* Search Bar & Tabs */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder={activeTab === "libraries" ? "Search libraries or boxes..." : "Search by pincode, city, or description..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
              />
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("libraries")}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "libraries"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                  }`}
              >
                <Package size={16} className="inline mr-1.5" />
                Libraries ({libraries.length})
              </button>
              <button
                onClick={() => setActiveTab("recent")}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "recent"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                  }`}
              >
                <Clock size={16} className="inline mr-1.5" />
                Recent ({filteredSearches.length})
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "completed"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                  }`}
              >
                <CheckCircle size={16} className="inline mr-1.5" />
                Completed ({completedTransactions.length})
              </button>
            </div>
          </div>
        </Card>

        {/* Content */}
        {isLoading ? (
          <Card className="text-center py-12">
            <RefreshCw className="mx-auto h-8 w-8 text-slate-400 animate-spin" />
            <p className="mt-4 text-slate-600">Loading...</p>
          </Card>
        ) : activeTab === "libraries" ? (
          /* ============================================================ */
          /* Box Libraries Tab (unchanged)                                */
          /* ============================================================ */
          <div className="space-y-6">
            {/* Create New Library Button + Excel Actions */}
            <Card>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setShowNewLibraryModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all">
                  <FolderPlus size={20} />
                  <span className="text-sm font-semibold">Create Library</span>
                </button>

                <button
                  onClick={handleDownloadTemplate}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-green-50 border-2 border-green-300 rounded-xl text-green-700 hover:bg-green-100 hover:border-green-400 transition-all">
                  <Download size={20} />
                  <span className="text-sm font-semibold">Download Template</span>
                </button>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-blue-50 border-2 border-blue-300 rounded-xl text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {isUploading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span className="text-sm font-semibold">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      <span className="text-sm font-semibold">Upload Excel</span>
                    </>
                  )}
                </button>
              </div>
            </Card>

            {filteredLibraries.length === 0 ? (
              <Card className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold text-slate-700">No Libraries Yet</h3>
                <p className="mt-1 text-sm text-slate-500">Create your first library to organize your box presets.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredLibraries.map((library) => {
                  const category = getCategoryInfo(library.category);
                  const CategoryIcon = category.icon;
                  const isExpanded = expandedLibraries.has(library.id);

                  return (
                    <Card key={library.id} className="!p-0 overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleLibraryExpand(library.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-${category.color}-100`}>
                            <CategoryIcon size={20} className={`text-${category.color}-600`} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">{library.name}</h3>
                            <p className="text-xs text-slate-500">
                              {category.name} · {library.boxes.length} box{library.boxes.length !== 1 ? 'es' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {library.boxes.length > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUseLibrary(library); }}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Use <ArrowRight size={14} className="inline ml-1" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteLibrary(library.id); }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                          <ChevronRight
                            size={20}
                            className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-slate-200"
                          >
                            <div className="p-4 bg-slate-50/50 space-y-3">
                              {library.boxes.map((box) => (
                                <div key={box.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-800">{box.name}</p>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                                      <span>Qty: {box.quantity}</span>
                                      <span>Weight: {box.weight} kg</span>
                                      {box.length && box.width && box.height && (
                                        <span>Dims: {box.length}x{box.width}x{box.height} cm</span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteBox(library.id, box.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}

                              {addingBoxToLibrary === library.id ? (
                                <div className="p-4 bg-white rounded-lg border-2 border-blue-200 space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Box name *" value={newBox.name || ""} onChange={(e) => setNewBox({ ...newBox, name: e.target.value })} className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                                    <input type="number" placeholder="Weight (kg) *" value={newBox.weight || ""} onChange={(e) => setNewBox({ ...newBox, weight: parseFloat(e.target.value) || undefined })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                                    <input type="number" placeholder="Quantity" value={newBox.quantity || ""} onChange={(e) => setNewBox({ ...newBox, quantity: parseInt(e.target.value) || 1 })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                                  </div>
                                  <p className="text-xs text-slate-500">Volumetric dimensions (required):</p>
                                  <div className="grid grid-cols-3 gap-3">
                                    <input type="number" placeholder="L (cm) *" value={newBox.length || ""} onChange={(e) => setNewBox({ ...newBox, length: parseFloat(e.target.value) || undefined })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                                    <input type="number" placeholder="W (cm) *" value={newBox.width || ""} onChange={(e) => setNewBox({ ...newBox, width: parseFloat(e.target.value) || undefined })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                                    <input type="number" placeholder="H (cm) *" value={newBox.height || ""} onChange={(e) => setNewBox({ ...newBox, height: parseFloat(e.target.value) || undefined })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button onClick={() => { setAddingBoxToLibrary(null); setNewBox({ name: "", weight: undefined, length: undefined, width: undefined, height: undefined, quantity: 1 }); }} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                    <button onClick={() => handleAddBox(library.id)} disabled={!newBox.name?.trim() || !newBox.weight || !newBox.length || !newBox.width || !newBox.height} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Add Box</button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => setAddingBoxToLibrary(library.id)} className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all text-sm">
                                  <Plus size={16} />
                                  Add Box to Library
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "recent" ? (
          /* ============================================================ */
          /* Recent Searches Tab (Enhanced)                               */
          /* ============================================================ */
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Clock size={22} className="text-blue-600" />
                Recent Searches
                <span className="text-sm font-normal text-slate-400 ml-2">(Last 7 days)</span>
              </h2>
              {filteredSearches.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="text-sm text-slate-500 hover:text-red-600 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {filteredSearches.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold text-slate-700">No Recent Searches</h3>
                <p className="mt-1 text-sm text-slate-500">Your freight calculations from the last 7 days will appear here.</p>
                <button
                  onClick={() => navigate("/compare")}
                  className="mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Calculate Freight
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSearches.map((search) => {
                  const isExpanded = expandedSearches.has(search._id);
                  return (
                    <motion.div
                      key={search._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
                    >
                      {/* Collapsed Header */}
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => toggleSearchExpand(search._id)}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex-1">
                            {/* Route */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <MapPin size={16} className="text-blue-600 flex-shrink-0" />
                              <span className="font-bold text-slate-800">
                                {formatLocation(search.fromPincode, search.fromCity, search.fromState)}
                              </span>
                              <ArrowRight size={14} className="text-slate-400 flex-shrink-0" />
                              <span className="font-bold text-slate-800">
                                {formatLocation(search.toPincode, search.toCity, search.toState)}
                              </span>
                            </div>

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-semibold rounded-full">
                                <TransportIcon mode={search.modeOfTransport} size={14} />
                                {search.modeOfTransport}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package size={14} />
                                {search.totalBoxes} boxes
                              </span>
                              <span>{search.totalWeight?.toFixed(1)} kg</span>
                              {search.distanceKm > 0 && (
                                <span className="flex items-center gap-1">
                                  <Route size={14} />
                                  {Math.round(search.distanceKm).toLocaleString("en-IN")} km
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-slate-400">
                                <Calendar size={14} />
                                {formatDate(search.createdAt)}
                              </span>
                            </div>

                            {/* Best quote preview */}
                            {search.topQuotes && search.topQuotes.length > 0 && (
                              <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                                <Star size={14} className="text-green-600 fill-green-600" />
                                Best: <strong>{search.topQuotes[0].companyName}</strong>
                                <span className="font-bold ml-1">
                                  <IndianRupee size={12} className="inline" />
                                  {search.topQuotes[0].totalCharges.toLocaleString("en-IN")}
                                </span>
                                <span className="text-green-500 ml-1">
                                  ({search.topQuotes[0].estimatedTime} days)
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSearchAgain(search); }}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <RefreshCw size={14} />
                              Search Again
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSearch(search._id); }}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                            <ChevronDown
                              size={20}
                              className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-slate-200"
                          >
                            <div className="p-4 space-y-4">
                              {/* Packing Details */}
                              <div>
                                <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                  <Package size={15} className="text-slate-500" />
                                  Packing Details
                                </h4>
                                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-600 text-xs uppercase">
                                        <th className="text-left px-3 py-2 font-semibold">#</th>
                                        <th className="text-left px-3 py-2 font-semibold">Description</th>
                                        <th className="text-center px-3 py-2 font-semibold">Qty</th>
                                        <th className="text-center px-3 py-2 font-semibold">Dimensions (cm)</th>
                                        <th className="text-right px-3 py-2 font-semibold">Weight</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(search.boxes || []).map((box, idx) => (
                                        <tr key={idx} className="border-t border-slate-100">
                                          <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                          <td className="px-3 py-2 text-slate-700 font-medium">{box.description || `Box ${idx + 1}`}</td>
                                          <td className="px-3 py-2 text-center text-slate-600">{box.count}</td>
                                          <td className="px-3 py-2 text-center text-slate-500 font-mono text-xs">
                                            {box.length > 0 ? `${box.length} x ${box.width} x ${box.height}` : "-"}
                                          </td>
                                          <td className="px-3 py-2 text-right text-slate-600">{box.weight} kg</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Top Quotes */}
                              {search.topQuotes && search.topQuotes.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                    <IndianRupee size={15} className="text-slate-500" />
                                    Top {search.topQuotes.length} Vendor Quotes
                                  </h4>
                                  <div className="space-y-2">
                                    {search.topQuotes.map((quote, idx) => (
                                      <div
                                        key={idx}
                                        className={`flex items-center justify-between px-4 py-3 rounded-lg border ${idx === 0
                                          ? "bg-green-50 border-green-200"
                                          : "bg-white border-slate-200"
                                          }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx === 0
                                            ? "bg-green-600 text-white"
                                            : "bg-slate-200 text-slate-600"
                                            }`}>
                                            {idx + 1}
                                          </span>
                                          <div>
                                            <span className={`font-semibold ${idx === 0 ? "text-green-800" : "text-slate-800"}`}>
                                              {quote.companyName}
                                            </span>
                                            {quote.isTiedUp && (
                                              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                                                Tied
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className="text-sm text-slate-500">
                                            {quote.estimatedTime} {quote.estimatedTime === 1 ? "day" : "days"}
                                          </span>
                                          <span className={`font-bold text-lg ${idx === 0 ? "text-green-700" : "text-slate-800"}`}>
                                            <IndianRupee size={14} className="inline" />
                                            {quote.totalCharges.toLocaleString("en-IN")}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        ) : (
          /* ============================================================ */
          /* Completed Transactions Tab (UI Shell)                        */
          /* ============================================================ */
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle size={22} className="text-green-600" />
                Completed Transactions
              </h2>
            </div>

            {completedTransactions.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle className="mx-auto h-16 w-16 text-slate-200" />
                <h3 className="mt-6 text-xl font-semibold text-slate-700">
                  No Completed Transactions
                </h3>
                <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                  Your booked and completed shipments will appear here. Start by calculating freight and booking a vendor.
                </p>
                <button
                  onClick={() => navigate("/compare")}
                  className="mt-8 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
                >
                  Calculate Freight
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {completedTransactions.map((tx) => (
                  <div
                    key={tx._id}
                    className="p-4 bg-green-50 border border-green-200 rounded-xl"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={16} className="text-green-600" />
                      <span className="font-bold text-slate-800">
                        {formatLocation(tx.fromPincode, tx.fromCity, tx.fromState)}
                      </span>
                      <ArrowRight size={14} className="text-slate-400" />
                      <span className="font-bold text-slate-800">
                        {formatLocation(tx.toPincode, tx.toCity, tx.toState)}
                      </span>
                    </div>
                    {tx.bookedQuote && (
                      <div className="text-sm text-green-800">
                        Booked with <strong>{tx.bookedQuote.companyName}</strong> -
                        <span className="font-bold ml-1">
                          <IndianRupee size={12} className="inline" />
                          {tx.bookedQuote.totalCharges.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>{tx.totalBoxes} boxes</span>
                      <span>{tx.totalWeight?.toFixed(1)} kg</span>
                      <span>{formatDate(tx.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* New Library Modal */}
      <AnimatePresence>
        {showNewLibraryModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">Create New Library</h3>
                <button onClick={() => setShowNewLibraryModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Library Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Monthly Electronics Shipment"
                    value={newLibraryName}
                    onChange={(e) => setNewLibraryName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LIBRARY_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setNewLibraryCategory(cat.id)}
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${newLibraryCategory === cat.id
                            ? "border-blue-600 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300"
                            }`}
                        >
                          <Icon size={18} className={newLibraryCategory === cat.id ? "text-blue-600" : "text-slate-500"} />
                          <span className={`text-sm font-medium ${newLibraryCategory === cat.id ? "text-blue-600" : "text-slate-700"}`}>
                            {cat.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowNewLibraryModal(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreateLibrary} disabled={!newLibraryName.trim()} className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Create Library</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* USE LIBRARY SELECTION MODAL */}
        {libraryToUse && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Select Boxes to Use</h3>
                  <p className="text-xs text-slate-500 mt-1">From library: <span className="font-semibold text-blue-600">{libraryToUse.name}</span></p>
                </div>
                <button onClick={cancelUseLibrary} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 border border-slate-200 shadow-sm transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{libraryToUse.boxes.length} Boxes Available</span>
                  <button
                    onClick={() => {
                      if (selectedBoxIdsForUse.size === libraryToUse.boxes.length) {
                        setSelectedBoxIdsForUse(new Set());
                      } else {
                        setSelectedBoxIdsForUse(new Set(libraryToUse.boxes.map(b => b.id)));
                      }
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {selectedBoxIdsForUse.size === libraryToUse.boxes.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {libraryToUse.boxes.map((box) => {
                  const isSelected = selectedBoxIdsForUse.has(box.id);
                  return (
                    <div
                      key={box.id}
                      onClick={() => toggleBoxSelectionForUse(box.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer group ${isSelected
                        ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/20'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                        }`}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-white text-transparent group-hover:border-blue-300'}`}>
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className={`font-semibold text-sm ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{box.name}</h4>
                          <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">x{box.quantity}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex gap-3">
                          <span className="flex items-center gap-1"><span className="font-medium">{box.weight}</span> kg</span>
                          {(box.length && box.width && box.height) ? (
                            <span className="text-slate-400 border-l border-slate-200 pl-3">{box.length} x {box.width} x {box.height} cm</span>
                          ) : <span className="text-slate-400 italic">No dims</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button onClick={cancelUseLibrary} className="flex-1 px-4 py-3 border border-slate-200 bg-white text-slate-600 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">Cancel</button>
                <button
                  onClick={confirmUseLibrary}
                  className="flex-[2] px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:transform-none flex items-center justify-center gap-2"
                >
                  <span>Use {selectedBoxIdsForUse.size} Boxes</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* EXCEL UPLOAD MODAL */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold text-slate-800">Create Library from Excel</h2>
              <p className="text-slate-500 mt-2">
                Found <strong className="text-blue-600">{parsedBoxes.length} boxes</strong> in the uploaded file.
                <br />
                Give your library a name to continue.
              </p>

              {uploadError && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                  {uploadError}
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Library Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Electronics Boxes"
                  value={uploadLibraryName}
                  onChange={(e) => setUploadLibraryName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LIBRARY_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setUploadLibraryCategory(cat.id)}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${uploadLibraryCategory === cat.id
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <Icon size={18} className={uploadLibraryCategory === cat.id ? "text-blue-600" : "text-slate-500"} />
                        <span className={`text-xs font-medium ${uploadLibraryCategory === cat.id ? "text-blue-600" : "text-slate-700"}`}>
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={cancelUploadModal}
                  disabled={isUploading}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                  Cancel
                </button>
                <button
                  onClick={handleCreateLibraryFromExcel}
                  disabled={!uploadLibraryName.trim() || isUploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Library'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecentSearchesPage;
