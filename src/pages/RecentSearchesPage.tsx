import React, { useState, useEffect } from "react";
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
  Laptop,
  Shirt,
  FileText,
  Apple,
  Wrench,
  Wine,
  ShoppingBag,
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  getBoxLibraries,
  createBoxLibrary,
  updateBoxLibrary,
  deleteBoxLibrary,
} from "../services/api";

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
  _id?: string; // MongoDB ID (used as primary key when available)
  name: string;
  category: string;
  boxes: BoxItem[];
  createdAt: string;
};

type RecentSearch = {
  id: string;
  fromPincode: string;
  toPincode: string;
  modeOfTransport: "Road" | "Rail" | "Air" | "Ship";
  boxes: {
    count: number;
    length: number;
    width: number;
    height: number;
    weight: number;
    description: string;
  }[];
  totalWeight: number;
  totalBoxes: number;
  bestQuote?: {
    companyName: string;
    totalCharges: number;
    estimatedTime: number;
  };
  timestamp: string;
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

const TransportIcon = ({ mode }: { mode: string }) => {
  const iconMap: Record<string, React.ReactNode> = {
    Road: <Truck size={18} />,
    Rail: <Train size={18} />,
    Air: <Plane size={18} />,
    Ship: <Ship size={18} />,
  };
  return <>{iconMap[mode] || <Truck size={18} />}</>;
};

const RecentSearchesPage: React.FC = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [libraries, setLibraries] = useState<BoxLibrary[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"libraries" | "recent">("libraries");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLibraries, setExpandedLibraries] = useState<Set<string>>(new Set());

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

  // --- LOAD DATA ---
  const loadLibraries = async () => {
    try {
      const apiLibraries = await getBoxLibraries();
      // Transform API response to local format
      const transformed: BoxLibrary[] = apiLibraries.map((lib) => ({
        id: lib._id, // Use MongoDB _id as id
        _id: lib._id,
        name: lib.name,
        category: lib.category,
        boxes: lib.boxes.map((box) => ({
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

  const loadRecentSearches = () => {
    const stored = localStorage.getItem("recentFreightSearches");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentSearches(Array.isArray(parsed) ? parsed : []);
      } catch {
        setRecentSearches([]);
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadLibraries();
      loadRecentSearches();
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

  // Helper from compareCache
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
    // Open modal instead of redirecting immediately
    setLibraryToUse(library);
    // Default select all
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

    const startIdx = 1; // start naming from 1
    const mappedBoxes = boxesToUse.map((b, i) => ({
      id: `box-${Date.now()}-${i}`,
      count: b.quantity || 1,
      length: b.length,
      width: b.width,
      height: b.height,
      weight: b.weight,
      description: b.name || `Box ${startIdx + i}`,
    }));

    // Save to the key that CalculatorPage actually reads ("fc:form")
    saveFormStateToStorage({
      boxes: mappedBoxes
    });

    // Also support legacy key just in case
    sessionStorage.setItem(
      "prefilledSearch",
      JSON.stringify({
        boxes: mappedBoxes
      })
    );

    navigate("/compare");
  };

  const cancelUseLibrary = () => {
    setLibraryToUse(null);
    setSelectedBoxIdsForUse(new Set());
  };

  // --- RECENT SEARCH HANDLERS ---
  const handleDeleteRecentSearch = (searchId: string) => {
    const updated = recentSearches.filter((s) => s.id !== searchId);
    setRecentSearches(updated);
    localStorage.setItem("recentFreightSearches", JSON.stringify(updated));
  };

  const handleClearAllRecent = () => {
    if (window.confirm("Clear all recent searches?")) {
      setRecentSearches([]);
      localStorage.removeItem("recentFreightSearches");
    }
  };

  const handleRepeatSearch = (search: RecentSearch) => {
    sessionStorage.setItem(
      "prefilledSearch",
      JSON.stringify({
        fromPincode: search.fromPincode,
        toPincode: search.toPincode,
        modeOfTransport: search.modeOfTransport,
        boxes: search.boxes,
      })
    );
    navigate("/compare");
  };

  // --- FILTERED DATA ---
  const filteredLibraries = libraries.filter((lib) =>
    lib.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lib.boxes.some(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSearches = recentSearches.filter(
    (s) =>
      s.fromPincode.includes(searchTerm) ||
      s.toPincode.includes(searchTerm) ||
      s.boxes.some((b) =>
        b.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const getCategoryInfo = (categoryId: string) => {
    return LIBRARY_CATEGORIES.find(c => c.id === categoryId) || LIBRARY_CATEGORIES[7];
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
                placeholder="Search libraries or boxes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
              />
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("libraries")}
                className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "libraries"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                  }`}
              >
                <Package size={16} className="inline mr-2" />
                Libraries ({libraries.length})
              </button>
              <button
                onClick={() => setActiveTab("recent")}
                className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "recent"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                  }`}
              >
                <Clock size={16} className="inline mr-2" />
                Recent ({recentSearches.length})
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
          /* Box Libraries Tab */
          <div className="space-y-6">
            {/* Create New Library Button */}
            <Card>
              <button
                onClick={() => setShowNewLibraryModal(true)}
                className="w-full flex items-center justify-center gap-3 py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
              >
                <FolderPlus size={24} />
                <span className="text-lg font-semibold">Create New Library</span>
              </button>
            </Card>

            {/* Libraries List */}
            {filteredLibraries.length === 0 ? (
              <Card className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold text-slate-700">
                  No Libraries Yet
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Create your first library to organize your box presets.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredLibraries.map((library) => {
                  const category = getCategoryInfo(library.category);
                  const CategoryIcon = category.icon;
                  const isExpanded = expandedLibraries.has(library.id);

                  return (
                    <Card key={library.id} className="!p-0 overflow-hidden">
                      {/* Library Header */}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUseLibrary(library);
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Use <ArrowRight size={14} className="inline ml-1" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLibrary(library.id);
                            }}
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

                      {/* Expanded Content */}
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
                              {/* Existing Boxes */}
                              {library.boxes.map((box) => (
                                <div
                                  key={box.id}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                                >
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

                              {/* Add Box Form */}
                              {addingBoxToLibrary === library.id ? (
                                <div className="p-4 bg-white rounded-lg border-2 border-blue-200 space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <input
                                      type="text"
                                      placeholder="Box name *"
                                      value={newBox.name || ""}
                                      onChange={(e) => setNewBox({ ...newBox, name: e.target.value })}
                                      className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Weight (kg) *"
                                      value={newBox.weight || ""}
                                      onChange={(e) => setNewBox({ ...newBox, weight: parseFloat(e.target.value) || undefined })}
                                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Quantity"
                                      value={newBox.quantity || ""}
                                      onChange={(e) => setNewBox({ ...newBox, quantity: parseInt(e.target.value) || 1 })}
                                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                  <p className="text-xs text-slate-500">Volumetric dimensions (required):</p>
                                  <div className="grid grid-cols-3 gap-3">
                                    <input
                                      type="number"
                                      placeholder="L (cm) *"
                                      value={newBox.length || ""}
                                      onChange={(e) => setNewBox({ ...newBox, length: parseFloat(e.target.value) || undefined })}
                                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    />
                                    <input
                                      type="number"
                                      placeholder="W (cm) *"
                                      value={newBox.width || ""}
                                      onChange={(e) => setNewBox({ ...newBox, width: parseFloat(e.target.value) || undefined })}
                                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    />
                                    <input
                                      type="number"
                                      placeholder="H (cm) *"
                                      value={newBox.height || ""}
                                      onChange={(e) => setNewBox({ ...newBox, height: parseFloat(e.target.value) || undefined })}
                                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => {
                                        setAddingBoxToLibrary(null);
                                        setNewBox({ name: "", weight: undefined, length: undefined, width: undefined, height: undefined, quantity: 1 });
                                      }}
                                      className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleAddBox(library.id)}
                                      disabled={!newBox.name?.trim() || !newBox.weight || !newBox.length || !newBox.width || !newBox.height}
                                      className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Add Box
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAddingBoxToLibrary(library.id)}
                                  className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all text-sm"
                                >
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
        ) : (
          /* Recent Searches Tab */
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Clock size={22} className="text-blue-600" />
                Recent Searches
              </h2>
              {recentSearches.length > 0 && (
                <button
                  onClick={handleClearAllRecent}
                  className="text-sm text-slate-500 hover:text-red-600 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {filteredSearches.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold text-slate-700">
                  No Recent Searches
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Your freight calculations will appear here.
                </p>
                <button
                  onClick={() => navigate("/compare")}
                  className="mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Calculate Freight
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSearches.map((search) => (
                  <motion.div
                    key={search.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
                            <MapPin size={18} className="text-blue-600" />
                            {search.fromPincode}
                            <ArrowRight size={16} className="text-slate-400" />
                            {search.toPincode}
                          </div>
                          <span className="px-2 py-1 bg-slate-200 text-slate-600 text-xs font-semibold rounded-full flex items-center gap-1">
                            <TransportIcon mode={search.modeOfTransport} />
                            {search.modeOfTransport}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Package size={14} />
                            {search.totalBoxes} boxes
                          </span>
                          <span>{search.totalWeight.toFixed(2)} kg total</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Calendar size={14} />
                            {new Date(search.timestamp).toLocaleDateString()}
                          </span>
                        </div>

                        {search.bestQuote && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <span className="text-sm text-green-800">
                              Best: <strong>{search.bestQuote.companyName}</strong> -
                              <span className="font-bold ml-1">
                                <IndianRupee size={12} className="inline" />
                                {search.bestQuote.totalCharges.toLocaleString()}
                              </span>
                              <span className="text-green-600 ml-2">
                                ({search.bestQuote.estimatedTime} days)
                              </span>
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRepeatSearch(search)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <RefreshCw size={14} />
                          Repeat
                        </button>
                        <button
                          onClick={() => handleDeleteRecentSearch(search.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
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
                <button
                  onClick={() => setShowNewLibraryModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Library Name
                  </label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category
                  </label>
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
                <button
                  onClick={() => setShowNewLibraryModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLibrary}
                  disabled={!newLibraryName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Library
                </button>
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
                <button
                  onClick={cancelUseLibrary}
                  className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 border border-slate-200 shadow-sm transition-colors"
                >
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
                      className={`
                          flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer group
                          ${isSelected
                          ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/20'
                          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                        }
                        `}
                    >
                      <div className={`
                          flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors
                          ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-white text-transparent group-hover:border-blue-300'}
                        `}>
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
                            <span className="text-slate-400 border-l border-slate-200 pl-3">
                              {box.length} × {box.width} × {box.height} cm
                            </span>
                          ) : <span className="text-slate-400 italic">No dims</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={cancelUseLibrary}
                  className="flex-1 px-4 py-3 border border-slate-200 bg-white text-slate-600 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUseLibrary}
                  // disabled={selectedBoxIdsForUse.size === 0}
                  className="flex-[2] px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:transform-none flex items-center justify-center gap-2"
                >
                  <span>Use {selectedBoxIdsForUse.size} Boxes</span>
                  <ArrowRight size={18} />
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
