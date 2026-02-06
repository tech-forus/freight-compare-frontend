import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  AlertCircle,
  Award,
  Box,
  Boxes,
  Building2,
  Calculator as CalculatorIcon,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  History,
  IndianRupee,
  Loader2,
  Lock,
  MapPin,
  MoveRight,
  Navigation,
  Package,
  PackageSearch,
  Plane,
  PlusCircle,
  Ruler,
  Save,
  Shield,
  Ship as ShipIcon,
  SlidersHorizontal,
  Sparkles,
  Train,
  Trash2,
  Truck,
  Weight,
  X,
  Zap,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";

// --- MODIFIED: Maximum dimension constants (in cm) ---
const MAX_DIMENSION_LENGTH = 1500;
const MAX_DIMENSION_WIDTH = 300; // Unchanged as per request
const MAX_DIMENSION_HEIGHT = 300;

// --- TYPE DEFINITIONS ---

type VendorQuote = {
  message: string;
  isHidden: any;
  transporterData: any;
  totalPrice: any;
  estimatedDelivery: any;
  companyName: string;
  price: any;
  transporterName: string;
  deliveryTime: string;
  estimatedTime?: number;
  // --- ADDED: New weight fields from backend ---
  actualWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  totalCharges: number;
  logoUrl?: string;
  isBestValue?: boolean;
  isTiedUp?: boolean;
};

type SavedBox = {
  _id: string;
  name: string;
  originPincode: number;
  destinationPincode: number;
  quantity: number;
  noofboxes: number;
  length: number;
  width: number;
  height: number;
  weight: number;
  modeoftransport: "Road" | "Rail" | "Air" | "Ship";
  description?: string;
};

type BoxDetails = {
  id: string;
  count: number | undefined;
  length: number | undefined;
  width: number | undefined;
  height: number | undefined;
  weight: number | undefined;
  description: string;
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

const InputField = (
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    icon?: React.ReactNode;
  }
) => (
  <div>
    {props.label && (
      <label
        htmlFor={props.id}
        className="block text-sm font-medium text-slate-600 mb-1.5"
      >
        {props.label}
      </label>
    )}
    <div className="relative">
      {props.icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400">
          {props.icon}
        </div>
      )}
      <input
        {...props}
        className={`block w-full py-2 bg-white border border-slate-300 rounded-lg text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition read-only:bg-slate-100 read-only:cursor-not-allowed disabled:bg-slate-100 disabled:border-slate-200 disabled:cursor-not-allowed ${
          props.icon ? "pl-10" : "px-4"
        }`}
      />
    </div>
  </div>
);

const SortOptionButton = ({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-center gap-2 flex-1 p-3 rounded-lg text-sm font-semibold transition-all duration-300 border-2 ${
      selected
        ? "bg-slate-900 border-slate-900 text-white shadow-md"
        : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const CalculatorPage: React.FC = () => {
  const { user } = useAuth();
  const customer = (user as any)?.customer;
  const navigate = useNavigate();
  const token = Cookies.get("authToken");

  // --- COMPONENT STATE ---
  const presetRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [sortBy, setSortBy] = useState<"price" | "time" | "rating">("price");
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [data, setData] = useState<VendorQuote[] | null>(null);
  const [hiddendata, setHiddendata] = useState<VendorQuote[] | null>(null);

  // --- FORM STATE ---
  const createNewBox = (): BoxDetails => ({
    id: `box-${Date.now()}-${Math.random()}`,
    count: undefined,
    length: undefined,
    width: undefined,
    height: undefined,
    weight: undefined,
    description: "",
  });

  const [modeOfTransport, setModeOfTransport] = useState<
    "Road" | "Rail" | "Air" | "Ship"
  >("Road");
  const [fromPincode, setFromPincode] = useState("");
  const [toPincode, setToPincode] = useState("");
  const [areDimensionsSame, setAreDimensionsSame] = useState(false);
  const [boxes, setBoxes] = useState<BoxDetails[]>([createNewBox()]);
  const [calculationTarget, setCalculationTarget] = useState<"all" | number>(
    "all"
  );

  const boxFormRefs = useRef<(HTMLDivElement | null)[]>([]);

  // --- SAVED PRESETS STATE & REFS ---
  const [savedBoxes, setSavedBoxes] = useState<SavedBox[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [boxIndexToSave, setBoxIndexToSave] = useState<number | null>(null);
  const [openPresetDropdownIndex, setOpenPresetDropdownIndex] = useState<
    number | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");
  const presetsContainerRef = useRef<HTMLDivElement>(null);

  // --- FINE-TUNE FILTERING STATE & REFS ---
  const [isFineTuneOpen, setIsFineTuneOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(10000000);
  const [maxTime, setMaxTime] = useState(300);
  const [minRating, setMinRating] = useState(0);
  const fineTuneRef = useRef<HTMLDivElement>(null);

  // --- ADDED: Validation logic for dimensions ---
  const isAnyDimensionExceeded = useMemo(
    () =>
      boxes.some(
        (box) =>
          (box.length ?? 0) > MAX_DIMENSION_LENGTH ||
          (box.width ?? 0) > MAX_DIMENSION_WIDTH ||
          (box.height ?? 0) > MAX_DIMENSION_HEIGHT
      ),
    [boxes]
  );

  useEffect(() => {
    if (customer?.pincode) {
      setFromPincode(customer.pincode);
    }
  }, [customer?.pincode]);

  const handlePincodeChange = (
    raw: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const digitsOnly = raw.replace(/\D/g, "").slice(0, 6);
    setter(digitsOnly);
  };
  const handleDimensionChange = (
    index: number,
    field: 'length' | 'width' | 'height',
    value: string,
    maxLength: number,
    maxValue: number // We've added this to check the value
  ) => {
    if (value) {
      // First, still limit the number of digits
      let finalValueStr = value.slice(0, maxLength);

      // Next, check if the numeric value exceeds the maximum allowed value
      if (Number(finalValueStr) > maxValue) {
        // If it does, clamp it down to the max value
        finalValueStr = String(maxValue);
      }
      
      // Finally, update the state with the corrected value
      updateBox(index, field, Number(finalValueStr));
    } else {
      // This allows the user to clear the input field
      updateBox(index, field, undefined);
    }
  };
  // --- BACKEND & DATA FUNCTIONS ---
  const fetchSavedBoxes = async () => {
    if (!user || !token) return;
    try {
      const response = await axios.get(
        `localhost:8000/api/transporter/getpackinglist?customerId=${
          (user as any).customer._id
        }`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSavedBoxes(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      console.error("Failed to fetch saved boxes:", err);
    }
  };

  const handleSavePreset = async (presetName: string) => {
    if (boxIndexToSave === null || !user || !token) {
      setError("An error occurred. Please try again.");
      return;
    }
    const boxToSave = boxes[boxIndexToSave];

    if (!fromPincode || fromPincode.length !== 6 || !toPincode || toPincode.length !== 6) {
        setError("Please enter valid 6-digit Origin and Destination pincodes before saving a preset.");
        setIsModalOpen(false);
        setBoxIndexToSave(null);
        return;
    }

    const payload = {
      name: presetName,
      description: presetName,
      customerId: (user as any).customer._id,
      originPincode: Number(fromPincode),
      destinationPincode: Number(toPincode),
      length: boxToSave.length!,
      width: boxToSave.width!,
      height: boxToSave.height!,
      weight: boxToSave.weight!,
      modeoftransport: modeOfTransport,
      noofboxes: boxToSave.count || 1,
      quantity: boxToSave.count || 1,
    };

    try {
      await axios.post(
        `localhost:8000/api/transporter/savepackinglist`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsModalOpen(false);
      setBoxIndexToSave(null);
      await fetchSavedBoxes();
    } catch (err: any) {
      console.error("Failed to save preset:", err);
      setError(`Could not save preset: ${err.response?.data?.message || err.message}`);
    }
  };

  // --- NEW: Handler to delete a saved preset ---
  const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the dropdown from closing
    if (window.confirm("Are you sure you want to delete this preset permanently?")) {
        try {
            setError(null);
            await axios.delete(`localhost:8000/api/transporter/deletepackinglist/${presetId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchSavedBoxes(); // Refresh the list
        } catch (err: any) {
            console.error("Failed to delete preset:", err);
            setError(`Could not delete preset: ${err.response?.data?.message || err.message}`);
        }
    }
  };
  
  const triggerSavePresetForBox = (index: number) => {
    const boxToSave = boxes[index];
    if (!boxToSave.length || !boxToSave.width || !boxToSave.height || !boxToSave.weight) {
      setError("Please fill in all dimensions and weight for the box before saving.");
      editBox(index);
      return;
    }
    setError(null);
    setBoxIndexToSave(index);
    setIsModalOpen(true);
  };
   // ——— HANDLER FUNCTIONS & EFFECTS ———
  const handleSelectPresetForBox = (index: number, boxPreset: SavedBox) => {
    const updated = [...boxes];
    updated[index] = {
      ...updated[index],
      length: boxPreset.length,
      width: boxPreset.width,
      height: boxPreset.height,
      weight: boxPreset.weight,
      description: boxPreset.name, // MODIFIED: Use preset name for the input field
    };
    setBoxes(updated);

    if (index === 0 || areDimensionsSame) {
      setFromPincode(boxPreset.originPincode.toString());
      // The line below has been removed to prevent auto-filling the destination pincode.
      // setToPincode(boxPreset.destinationPincode.toString()); 
      setModeOfTransport(boxPreset.modeoftransport);
    }
    setOpenPresetDropdownIndex(null);
    setSearchTerm("");
  };

  const handleDimensionTypeChange = (isSame: boolean) => {
    setAreDimensionsSame(isSame);
    setBoxes([createNewBox()]);
    setCalculationTarget("all");
    setOpenPresetDropdownIndex(null);
    setSearchTerm("");
  };

  const addBoxType = () => setBoxes([...boxes, createNewBox()]);
  const updateBox = (i: number, field: keyof BoxDetails, v: any) => {
    const copy = [...boxes];
    copy[i] = { ...copy[i], [field]: v };
    setBoxes(copy);
  };
  const removeBox = (i: number) => {
    if (boxes.length <= 1) return;
    if (window.confirm("Are you sure you want to delete this box type?")) {
      setBoxes(boxes.filter((_, j) => j !== i));
      setCalculationTarget("all");
    }
  };
  
  const editBox = (index: number) => {
    const el = boxFormRefs.current[index];
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  };

  const handleForceWeight = (index: number) => {
    const box = boxes[index];
    const qty = box.count || 0;
    const currentTotal = ((box.weight || 0) * qty).toFixed(2);
    const input = prompt(
      `Override total weight for "${box.description || `Type ${index + 1}`}" (kg):`,
      currentTotal
    );
    if (input !== null && !isNaN(+input)) {
      const newTotal = parseFloat(input);
      const perBox = qty > 0 ? newTotal / qty : 0;
      updateBox(index, "weight", perBox);
    }
    editBox(index);
  };

  useEffect(() => {
    fetchSavedBoxes();
  }, [user]);

  useEffect(() => {
    const onClickOutside = (ev: MouseEvent) => {
      if (
        openPresetDropdownIndex !== null &&
        presetsContainerRef.current &&
        !presetsContainerRef.current.contains(ev.target as Node)
      ) {
        setOpenPresetDropdownIndex(null);
      }
      if (
        fineTuneRef.current &&
        !fineTuneRef.current.contains(ev.target as Node)
      ) {
        setIsFineTuneOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openPresetDropdownIndex]);

  // ——— CALCULATION & API CALL ———
  const calculateQuotes = async () => {
    setError(null);
    setData(null);
    setHiddendata(null);

    const pinRx = /^\d{6}$/;
    if (!pinRx.test(fromPincode) || !pinRx.test(toPincode)) {
      setError("Please enter valid 6-digit Origin and Destination Pincodes.");
      return;
    }

    const boxesToCalc =
      calculationTarget === "all" ? boxes : [boxes[calculationTarget]];
    
    // --- MODIFIED: Validate boxes before preparing payload ---
    const shipmentPayload = [];
    for (const box of boxesToCalc) {
      if (!box.count || !box.length || !box.width || !box.height || !box.weight) {
        const name = box.description || `Box Type ${boxes.indexOf(box) + 1}`;
        setError(`Please fill in all details for "${name}".`);
        return;
      }
      shipmentPayload.push({
        count: box.count,
        length: box.length,
        width: box.width,
        height: box.height,
        weight: box.weight,
      });
    }

    setIsCalculating(true);
    setCalculationProgress("Fetching quotes from vendors...");

    try {
      // --- MODIFIED: This is the new, correct API call structure ---
      const resp = await axios.post(
        "localhost:8000/api/transporter/calculate", // Ensure this endpoint matches your backend
        {
          // --- Main details ---
          customerID: (user as any).customer._id,
          userogpincode: (user as any).customer.pincode,
          modeoftransport: modeOfTransport,
          fromPincode,
          toPincode,
          // --- NEW PAYLOAD ---
          // Send the detailed array instead of a single pre-calculated weight
          shipment_details: shipmentPayload,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // --- REMOVED: Old frontend calculation logic ---
      // The old logic that calculated totalChargeable here has been deleted.
      
      const all = [
        ...(resp.data.tiedUpResult || []).map((q: VendorQuote) => ({
          ...q,
          isTiedUp: true,
        })),
        ...(resp.data.companyResult || []).map((q: VendorQuote) => ({
          ...q,
          isTiedUp: false,
        })),
      ];
      setData(all.filter((q) => q.isTiedUp));
      setHiddendata(all.filter((q) => !q.isTiedUp));

      // Save to recent searches
      const bestQuote = all.length > 0
        ? all.reduce((prev, curr) => prev.totalCharges < curr.totalCharges ? prev : curr)
        : null;

      const recentSearch = {
        id: `search-${Date.now()}`,
        fromPincode,
        toPincode,
        modeOfTransport,
        boxes: boxesToCalc.map(b => ({
          count: b.count || 0,
          length: b.length || 0,
          width: b.width || 0,
          height: b.height || 0,
          weight: b.weight || 0,
          description: b.description || "",
        })),
        totalWeight,
        totalBoxes,
        bestQuote: bestQuote ? {
          companyName: bestQuote.companyName,
          totalCharges: bestQuote.totalCharges,
          estimatedTime: bestQuote.estimatedTime || 0,
        } : undefined,
        timestamp: new Date().toISOString(),
      };

      try {
        const stored = localStorage.getItem("recentFreightSearches");
        const existing = stored ? JSON.parse(stored) : [];
        const updated = [recentSearch, ...existing.slice(0, 19)]; // Keep max 20
        localStorage.setItem("recentFreightSearches", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save recent search:", err);
      }
    } catch (e: any) {
      if (e.response?.status === 401) {
        setError("Authentication failed. Please log out and log back in.");
      } else {
        setError(`Failed to get rates. Error: ${e.message}`);
      }
    }

    setCalculationProgress("");
    setIsCalculating(false);
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  
  // ——— SUMMARY VALUES ———
  const totalWeight = boxes.reduce(
    (sum, b) => sum + (b.weight || 0) * (b.count || 0),
    0
  );
  const totalBoxes = boxes.reduce((sum, b) => sum + (b.count || 0), 0);
  const displayableBoxes = savedBoxes.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

// ... inside your component function ...

// This is the state you're already using to track the open dropdown
// const [openPresetDropdownIndex, setOpenPresetDropdownIndex] = useState(null);

// This is the ref array you're already populating
// const presetRefs = useRef([]);


// --- ADD THIS CODE ---
useEffect(() => {
    /**
     * Handles clicks outside of the currently open preset dropdown.
     */
    function handleClickOutside(event) {
      // Proceed only if a dropdown is open (index is not null)
      if (openPresetDropdownIndex !== null) {
        
        // Get the DOM element for the currently open dropdown using its index
        const currentDropdownRef = presetRefs.current[openPresetDropdownIndex];

        // If that element exists and the click was *not* inside it
        if (currentDropdownRef && !currentDropdownRef.contains(event.target)) {
          setOpenPresetDropdownIndex(null); // Close the dropdown
        }
      }
    }

    // This line tells the browser to start listening for clicks.
    document.addEventListener("mousedown", handleClickOutside);

    // This 'return' function is the cleanup step.
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
    
}, [openPresetDropdownIndex]);

  // --- JSX RENDER ---
  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans">
      <div
        className="absolute top-0 left-0 w-full h-80 bg-gradient-to-br from-blue-50 to-purple-50"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 65%, 0% 100%)" }}
      ></div>
      <div className="relative max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <header className="text-center py-8">
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight"
          >
            Freight Rate Calculator
          </motion.h1>
          <motion.p
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto"
          >
            Instantly compare quotes from multiple vendors to find the best rate
            for your shipment.
          </motion.p>
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4"
          >
            <Link
              to="/recent-searches"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <History size={18} />
              View Saved Presets & Recent Searches
            </Link>
          </motion.div>
        </header>

        <Card>
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center">
            <Navigation size={22} className="mr-3 text-blue-600" /> Mode & Route
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Select your mode of transport and enter the pickup and destination
            pincodes.
          </p>
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: "Road", icon: Truck, isAvailable: true },
                { name: "Rail", icon: Train, isAvailable: false },
                { name: "Air", icon: Plane, isAvailable: false },
                { name: "Ship", icon: ShipIcon, isAvailable: false },
              ].map((mode) => (
                <button
                  key={mode.name}
                  onClick={() =>
                    mode.isAvailable ? setModeOfTransport(mode.name as any) : null
                  }
                  className={`relative group w-full p-4 rounded-xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 focus-visible:ring-blue-600 ${
                    modeOfTransport === mode.name
                      ? "bg-blue-600 text-white shadow-lg"
                      : mode.isAvailable
                      ? "bg-white text-slate-700 border border-slate-300 hover:border-blue-600 hover:text-blue-700"
                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  }`}
                  disabled={!mode.isAvailable}
                  aria-label={
                    mode.isAvailable
                      ? `Select ${mode.name} transport`
                      : `${mode.name} transport (Coming Soon)`
                  }
                >
                  <div
                    className={`flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                      !mode.isAvailable && "opacity-50"
                    }`}
                  >
                    <mode.icon size={24} className="mx-auto" />
                    <span className="text-sm font-semibold">{mode.name}</span>
                  </div>
                  {!mode.isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                      <span className="text-xs font-bold text-white uppercase tracking-wider bg-slate-800/70 px-3 py-1 rounded-full">
                        Coming Soon
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <InputField
                label="Origin Pincode"
                id="fromPincode"
                value={fromPincode}
                placeholder="e.g., 400001"
                maxLength={6}
                icon={<MapPin />}
                inputMode="numeric"
                pattern="\d{6}"
                onChange={(e) =>
                  handlePincodeChange(e.target.value, setFromPincode)
                }
              />
              <InputField
                label="Destination Pincode"
                id="toPincode"
                value={toPincode}
                placeholder="e.g., 110001"
                maxLength={6}
                icon={<MapPin />}
                inputMode="numeric"
                pattern="\d{6}"
                onChange={(e) =>
                  handlePincodeChange(e.target.value, setToPincode)
                }
              />
            </div>
          </div>
        </Card>
<Card>
    {/* Header */}
    <div className="mb-6">
    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
        <Boxes size={22} className="text-blue-600" /> Shipment Details
    </h2>
    <p className="text-sm text-slate-500">
        Enter dimensions and weight, or select a saved preset to auto‑fill.
    </p>
    </div>

    {/* Box Forms */}
    <div className="space-y-6">
    <AnimatePresence>
        {boxes.map((box, index) => (
        <motion.div
            key={box.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="p-5 bg-slate-50 border border-slate-200 rounded-xl relative"
        >
            <button
            onClick={() => {
                if (boxes.length > 1) {
                removeBox(index);
                } else {
                setBoxes([createNewBox()]);
                }
            }}
            title={
                boxes.length > 1
                ? "Remove this box type"
                : "Clear all fields"
            }
            className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 rounded-full transition-colors"
            >
            <Trash2 size={18} />
            </button>

            {/* Row 1: Preset │ Number of Boxes │ Weight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative text-sm" ref={el => { if (el) presetRefs.current[index] = el; }}>
                <InputField
                label="Box Name"
                id={`preset-${index}`}
                placeholder="Select or type to search..."
                value={
                    box.description ||
                    (openPresetDropdownIndex === index ? searchTerm : "")
                }
                onChange={e => {
                    updateBox(index, "description", e.target.value);
                    setSearchTerm(e.target.value);
                }}
                onFocus={() => {
                    setOpenPresetDropdownIndex(index);
                    setSearchTerm("");
                }}
                icon={<PackageSearch size={16} />}
                className="text-sm"
                autoComplete="off"
                required
                />
                <AnimatePresence>
                {openPresetDropdownIndex === index && (
                    <motion.ul
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-20 w-full mt-1 border border-slate-200 rounded-lg max-h-48 overflow-y-auto bg-white shadow-lg"
                    >
                    {displayableBoxes.length > 0 ? (
                        displayableBoxes.map((preset) => (
                        <li
                            key={preset._id}
                            onClick={() => handleSelectPresetForBox(index, preset)}
                            className="group flex justify-between items-center px-3 py-2 hover:bg-blue-50 cursor-pointer text-slate-700 text-sm transition-colors"
                        >
                            <span>{preset.name}</span>
                            <button
                            onClick={(e) => handleDeletePreset(preset._id, e)}
                            className="p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:text-red-600 hover:bg-red-100 rounded-full transition-all duration-200"
                            title={`Delete "${preset.name}"`}
                            >
                            <Trash2 size={14} />
                            </button>
                        </li>
                        ))
                    ) : (
                        <li className="px-4 py-2 italic text-sm text-slate-500">
                        {savedBoxes.length === 0
                            ? "No presets saved yet."
                            : "No matches found."}
                        </li>
                    )}
                    </motion.ul>
                )}
                </AnimatePresence>
            </div>

            <InputField
                label="Number of Boxes"
                id={`count-${index}`}
                type="number"
                min={1}
                value={box.count ?? ""}
                onChange={(e) =>
                updateBox(
                    index,
                    "count",
                    e.target.valueAsNumber ?? undefined
                )
                }
                placeholder="e.g., 10"
                required
            />

            <InputField
                label="Weight (kg)"
                id={`weight-${index}`}
                type="number"
                min={0}
                step="0.01"
                value={box.weight ?? ""}
                onChange={(e) =>
                updateBox(
                    index,
                    "weight",
                    e.target.valueAsNumber ?? undefined
                )
                }
                placeholder="e.g., 5.5"
                required
            />
            </div>

            {/* Row 2: Dimensions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <InputField
                    label="Length (cm)"
                    id={`length-${index}`}
                    type="number"
                    min={0}
                    value={box.length ?? ""}
                    // --- MODIFIED: Handler now also checks the max value ---
                    onChange={(e) => handleDimensionChange(index, 'length', e.target.value, 4, MAX_DIMENSION_LENGTH)}
                    placeholder="Length"
                    required
                    />
                    {(box.length ?? 0) > MAX_DIMENSION_LENGTH && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={14} />
                        Max length is {MAX_DIMENSION_LENGTH} cm.
                    </p>
                    )}
                </div>
                
                <div>
                    <InputField
                    label="Width (cm)"
                    id={`width-${index}`}
                    type="number"
                    min={0}
                    value={box.width ?? ""}
                    // --- MODIFIED: Handler now also checks the max value ---
                    onChange={(e) => handleDimensionChange(index, 'width', e.target.value, 3, MAX_DIMENSION_WIDTH)}
                    placeholder="Width"
                    required
                    />
                    {(box.width ?? 0) > MAX_DIMENSION_WIDTH && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={14} />
                        Max width is {MAX_DIMENSION_WIDTH} cm.
                    </p>
                    )}
                </div>
                
                <div>
                    <InputField
                    label="Height (cm)"
                    id={`height-${index}`}
                    type="number"
                    min={0}
                    value={box.height ?? ""}
                    // --- MODIFIED: Handler now also checks the max value ---
                    onChange={(e) => handleDimensionChange(index, 'height', e.target.value, 3, MAX_DIMENSION_HEIGHT)}
                    placeholder="Height"
                    required
                    />
                    {(box.height ?? 0) > MAX_DIMENSION_HEIGHT && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={14} />
                        Max height is {MAX_DIMENSION_HEIGHT} cm.
                    </p>
                    )}
                </div>
            </div>

            <div className="mt-4 flex justify-end">
            <button
                onClick={() => triggerSavePresetForBox(index)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
                title="Save this box configuration as a new preset"
            >
                <Save size={14} />
                Save as Preset
            </button>
            </div>
        </motion.div>
        ))}
    </AnimatePresence>

    <div className="flex justify-between items-center pt-6 border-t border-slate-200">
        <button
        onClick={addBoxType}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 transition-colors"
        >
        <PlusCircle size={18} /> Add Another Box Type
        </button>
        
        {totalWeight > 0 && (
        <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="text-right"
        >
            <p className="text-sm font-medium text-slate-500">Total Weight</p>
            <p className="text-2xl font-bold text-slate-800">
            {totalWeight.toFixed(2)}
            <span className="text-base font-semibold text-slate-600 ml-1">kg</span>
            </p>
        </motion.div>
        )}
    </div>

    <div className="text-center pt-6 mt-6 border-t border-slate-200">
        {error && (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 bg-red-100 text-red-800 font-semibold px-4 py-3 rounded-xl mb-6 shadow-sm"
        >
            <AlertCircle size={20} />
            {error}
        </motion.div>
        )}
        {isAnyDimensionExceeded && !error && (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 bg-yellow-100 text-yellow-800 font-semibold px-4 py-3 rounded-xl mb-6 shadow-sm"
        >
            <AlertCircle size={20} />
            One or more box dimensions exceed the allowed limit. Please correct them to proceed.
        </motion.div>
        )}
        <motion.button
        onClick={calculateQuotes}
        disabled={isCalculating || isAnyDimensionExceeded}
        whileHover={{ scale: (isCalculating || isAnyDimensionExceeded) ? 1 : 1.05 }}
        whileTap={{ scale: (isCalculating || isAnyDimensionExceeded) ? 1 : 0.95 }}
        className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-full shadow-lg shadow-blue-600/50 hover:bg-blue-700 transition-all duration-300 disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed"
        >
        {isCalculating ? (
            <Loader2 className="animate-spin" />
        ) : (
            <CalculatorIcon />
        )}
        {isCalculating
            ? calculationProgress || "Calculating Rates..."
            : "Calculate Freight Cost"}
        </motion.button>
    </div>
    </div>
</Card>
        
        {totalBoxes > 0 && (
          <Card>
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Package size={22} className="mr-3 text-blue-600" /> Shipment
              Summary
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100 rounded-t-lg">
                  <tr>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Total Weight</th>
                    {/* MODIFIED: Volume unit changed to cm³ */}
                    <th className="px-4 py-3">Volume (cm³)</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  <AnimatePresence>
                    {boxes.map((box, index) => {
                      const qty = box.count || 0;
                      const totalW = ((box.weight || 0) * qty).toFixed(2);
                      {/* MODIFIED: Volume calculation updated to cm³ and formatted */}
                      const totalV = (
                        (box.length || 0) *
                        (box.width || 0) *
                        (box.height || 0) *
                        qty
                      ).toLocaleString();

                      return (
                        <motion.tr
                          key={box.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, x: -30 }}
                          className="bg-white border-b border-slate-200 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            {box.description ||
                              (areDimensionsSame
                                ? "Standard Box"
                                : `Type ${index + 1}`)}
                          </td>
                          <td className="px-4 py-3">{qty}</td>
                          <td className="px-4 py-3">{totalW} kg</td>
                          {/* MODIFIED: Volume display updated to cm³ */}
                          <td className="px-4 py-3">{totalV} cm³</td>
                          <td className="px-4 py-3 flex justify-end items-center gap-2">
                            <button
                              onClick={() => editBox(index)}
                              title="Edit"
                              className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-100 rounded-full transition-colors"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => removeBox(index)}
                              disabled={boxes.length <= 1}
                              title="Delete"
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>

                <tfoot>
                  <tr className="font-semibold text-slate-800 bg-slate-50">
                    <td colSpan={1} className="px-4 py-3 text-right">
                      Grand Total
                    </td>
                    <td className="px-4 py-3">{totalBoxes} Boxes</td>
                    <td className="px-4 py-3">{totalWeight.toFixed(2)} kg</td>
                    <td className="px-4 py-3">
                      {/* MODIFIED: Grand total volume calculation updated to cm³ */}
                      {boxes
                        .reduce(
                          (sum, b) =>
                            sum +
                            ((b.length || 0) *
                              (b.width || 0) *
                              (b.height || 0) *
                              (b.count || 0)),
                          0
                        )
                        .toLocaleString()}{" "}
                      cm³
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}

        {/* --- MOVED: The content of this div is now inside the "Shipment Details" Card --- */}
        <div className="text-center pt-4 pb-8" style={{ display: "none" }}></div>

        {(data || hiddendata) && (
          <>
            <Card>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center">
                    <Award size={22} className="mr-3 text-blue-600" /> Sort &
                    Filter Results
                  </h2>
                  <p className="text-sm text-slate-500 mb-6">
                    Quickly organize quotes by price, speed, or vendor rating.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-grow w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <SortOptionButton
                    label="Lowest Price"
                    icon={<IndianRupee size={16} />}
                    selected={sortBy === "price"}
                    onClick={() => setSortBy("price")}
                  />
                  <SortOptionButton
                    label="Fastest"
                    icon={<Zap size={16} />}
                    selected={sortBy === "time"}
                    onClick={() => setSortBy("time")}
                  />
                  <SortOptionButton
                    label="Highest Rated"
                    icon={<Award size={16} />}
                    selected={sortBy === "rating"}
                    onClick={() => setSortBy("rating")}
                  />
                </div>
                <div className="relative w-full sm:w-auto" ref={fineTuneRef}>
                  <button
                    onClick={() => setIsFineTuneOpen((prev) => !prev)}
                    className="w-full px-5 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors border border-slate-300"
                  >
                    Fine-Tune Sort
                  </button>
                  <AnimatePresence>
                    {isFineTuneOpen && (
                      <FineTuneModal
                        isOpen={isFineTuneOpen}
                        filters={{ maxPrice, maxTime, minRating }}
                        onFilterChange={{
                          setMaxPrice,
                          setMaxTime,
                          setMinRating,
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </Card>
            <div id="results" className="space-y-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="space-y-8"
              >
                {(() => {
                  const allQuotes = [
                    ...(data || []),
                    ...(hiddendata || []),
                  ].filter((q) => q.message !== "service not available");
                  const bestValueQuote =
                    allQuotes.length > 0
                      ? allQuotes.reduce((prev, current) =>
                          prev.totalCharges < current.totalCharges ? prev : current
                        )
                      : null;
                  const unlockedQuotes = allQuotes.filter(
                    (q) => !q.isHidden && typeof q.estimatedTime === "number"
                  );
                  const fastestQuote =
                    unlockedQuotes.length > 0
                      ? unlockedQuotes.reduce((prev, current) =>
                          prev.estimatedTime! < current.estimatedTime!
                            ? prev
                            : current
                        )
                      : null;
                  const processQuotes = (quotes: VendorQuote[] | null) => {
                    if (!quotes) return [];
                    const filtered = quotes.filter((q) => {
                      const rating = q.transporterData?.rating ?? 0;
                      if (q.isHidden) return q.totalCharges <= maxPrice;
                      return (
                        q.totalCharges <= maxPrice &&
                        (q.estimatedTime ?? Infinity) <= maxTime &&
                        rating >= minRating
                      );
                    });
                    return filtered.sort((a, b) => {
                      switch (sortBy) {
                        case "time":
                          if (a.isHidden && !b.isHidden) return 1;
                          if (!a.isHidden && b.isHidden) return -1;
                          return (
                            (a.estimatedTime ?? Infinity) -
                            (b.estimatedTime ?? Infinity)
                          );
                        case "rating":
                          const ratingA = a.transporterData?.rating ?? 0;
                          const ratingB = b.transporterData?.rating ?? 0;
                          return ratingB - ratingA;
                        case "price":
                        default:
                          return a.totalCharges - b.totalCharges;
                      }
                    });
                  };
                  const tiedUpVendors = processQuotes(data);
                  const otherVendors = processQuotes(hiddendata);
                  

                  if (isCalculating) return null; // Don't render results while calculating

                  return (
                    <>
                      {tiedUpVendors.length > 0 && (
                        <section>
                          <h2 className="text-2xl font-extrabold text-slate-900 mb-5 border-l-[6px] border-blue-600 pl-4 py-2 bg-blue-50/50 rounded-r-lg">
                            Your tied up vendors
                          </h2>
                          <div className="space-y-4">
                            {tiedUpVendors.map((item, index) => (
                              <VendorResultCard
                                key={`tied-up-${index}`}
                                quote={item}
                                isBestValue={item === bestValueQuote}
                                isFastest={item === fastestQuote}
                              />
                            ))}
                          </div>
                        </section>
                      )}
                      {otherVendors.length > 0 && (
                        <section>
                          <h2 className="text-2xl font-extrabold text-slate-900 mb-5 border-l-[6px] border-slate-500 pl-4 py-2 bg-slate-50/50 rounded-r-lg">
                            Our available Vendors
                          </h2>
                          <div className="space-y-4">
                            {otherVendors.map((item, index) => (
                              <VendorResultCard
                                key={`other-${index}`}
                                quote={item}
                                isBestValue={item === bestValueQuote}
                                isFastest={item === fastestQuote}
                              />
                            ))}
                          </div>
                        </section>
                      )}
                      {tiedUpVendors.length === 0 &&
                        otherVendors.length === 0 && (
                          <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-300">
                            <PackageSearch className="mx-auto h-12 w-12 text-slate-400" />
                            <h3 className="mt-4 text-xl font-semibold text-slate-700">
                              No Quotes Available
                            </h3>
                            <p className="mt-1 text-base text-slate-500">
                              We couldn't find vendors for the details provided.
                              Try adjusting your filter criteria.
                            </p>
                          </div>
                        )}
                    </>
                  );
                })()}
              </motion.div>
            </div>
          </>
        )}
      </div>
      <SavePresetModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setBoxIndexToSave(null);
        }}
        onSave={handleSavePreset}
      />
    </div>
  );
};


// --- CHILD COMPONENTS ---

const FineTuneModal = ({
    isOpen, filters, onFilterChange
  }: {
    isOpen: boolean;
    filters: { maxPrice: number; maxTime: number; minRating: number };
    onFilterChange: { setMaxPrice: (val: number) => void; setMaxTime: (val: number) => void; setMinRating: (val: number) => void; };
  }) => {
  
  const formatPrice = (value: number) => {
    if (value >= 10000000) return "Any";
    if (value >= 100000) return `${(value / 100000).toFixed(1)} Lakh`;
    return new Intl.NumberFormat('en-IN').format(value);
  };

  const formatTime = (value: number) => {
      if (value >= 300) return "Any";
      return `${value} Days`;
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-20 p-5 space-y-5"
    >
      <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
              <label htmlFor="maxPrice" className="font-semibold text-slate-700">Max Price</label>
              <span className="font-bold text-blue-600">₹ {formatPrice(filters.maxPrice)}</span>
          </div>
          <input
              id="maxPrice" type="range" min="1000" max="10000000" step="1000"
              value={filters.maxPrice} onChange={(e) => onFilterChange.setMaxPrice(e.target.valueAsNumber)}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
      </div>

      <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
              <label htmlFor="maxTime" className="font-semibold text-slate-700">Max Delivery Time</label>
              <span className="font-bold text-blue-600">{formatTime(filters.maxTime)}</span>
          </div>
          <input
              id="maxTime" type="range" min="1" max="300" step="1"
              value={filters.maxTime} onChange={(e) => onFilterChange.setMaxTime(e.target.valueAsNumber)}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
      </div>
      
      <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
              <label htmlFor="minRating" className="font-semibold text-slate-700">Min Vendor Rating</label>
              <span className="font-bold text-blue-600">{filters.minRating.toFixed(1)} / 5.0</span>
          </div>
          <input
              id="minRating" type="range" min="0" max="5" step="0.1"
              value={filters.minRating} onChange={(e) => onFilterChange.setMinRating(e.target.valueAsNumber)}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
      </div>
    </motion.div>
  );
};


const SavePresetModal = ({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}) => {
  const [name, setName] = useState("");
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center">
            <Save size={18} className="mr-2 text-blue-600" /> Save Box Preset
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Give this box configuration a name for future use. The dimensions,
          weight, pincodes, and transport mode will be saved.
        </p>
        <InputField
          label="Preset Name"
          id="preset-name"
          type="text"
          placeholder="e.g., My Standard Box"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(name);
              setName("");
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Preset
          </button>
        </div>
      </motion.div>
    </div>
  );
};


const BifurcationDetails = ({ quote }: { quote: any }) => {
  const formatCurrency = (value: number | undefined) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(value || 0);

  const chargeItems = [
    { label: "Base Freight", key: "baseFreight" },
    { label: "Docket Charge", key: "docketCharge" },
    { label: "DACC Charges", key: "daccCharges" },
    { label: "ODA Charges", key: "odaCharges" },
    { label: "Fuel Surcharge", key: "fuelCharges" },
    { label: "Handling Charges", key: "handlingCharges" },
    { label: "Insurance Charges", key: "insuranceCharges" },
    { label: "Green Tax", key: "greenTax" },
    { label: "Appointment Charges", key: "appointmentCharges" },
    { label: "Minimum Charges", key: "minCharges" },
    { label: "ROV Charges", key: "rovCharges" },
    { label: "FM Charges", key: "fmCharges" },
    { label: "Miscellaneous Charges", key: "miscCharges" },
  ];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="border-t border-slate-200 mt-4 pt-4">
        <h4 className="font-semibold text-slate-700 mb-3">Cost Breakdown</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          {chargeItems.map((item) => (
            item.key in quote && quote[item.key] > 0 && (
              <div key={item.key} className="flex justify-between">
                <span className="text-slate-500">{item.label}:</span>
                <span className="font-medium text-slate-800">
                  {formatCurrency(quote[item.key])}
                </span>
              </div>
            )
          ))}
        </div>
        <div className="border-t border-slate-200 mt-4 pt-4">
            <h4 className="font-semibold text-slate-700 mb-3">Shipment Info</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Chargeable Wt:</span><span className="font-medium text-slate-800">{quote.chargeableWeight.toFixed(2)} Kg</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Distance:</span><span className="font-medium text-slate-800">{quote.distance}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Origin:</span><span className="font-medium text-slate-800">{quote.originPincode}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Destination:</span><span className="font-medium text-slate-800">{quote.destinationPincode}</span></div>
            </div>
        </div>
      </div>
    </motion.div>
  );
};


const VendorResultCard = ({
  quote,
  isBestValue,
  isFastest,
}: {
  quote: any;
  isBestValue?: boolean;
  isFastest?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleMoreDetailsClick = () => {
    const isSubscribed = (user as any)?.customer?.isSubscribed;

    if (isSubscribed) {
      const transporterId = quote.transporterData?._id;
      if (transporterId) {
        navigate(`/transporterdetails/${transporterId}`);
      } else {
        console.error("Transporter ID is missing from the quote data.");
        alert("Sorry, the transporter details could not be retrieved.");
      }
    } else {
      navigate("/buy-subscription-plan");
    }
  };

  if (quote.isHidden) {
    return (
      <div
        className={`relative bg-white p-5 rounded-2xl border-2 transition-all duration-300 ${
          isBestValue ? "border-green-400 shadow-lg" : "border-slate-200"
        }`}
      >
        <div className="relative z-0 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-slate-200 flex items-center justify-center border border-slate-300">
              <Lock className="text-slate-500" size={28} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-700">
                {quote.companyName}
              </h3>
              <p className="text-sm text-slate-500">
                Time & Details are Hidden
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 font-bold text-3xl text-slate-900">
              <IndianRupee size={22} className="text-slate-600" />
              <span>
                {new Intl.NumberFormat("en-IN").format(quote.totalCharges)}
              </span>
            </div>
            <div className="text-xs text-slate-500 -mt-1">Total Charges</div>
          </div>
          <button className="px-5 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
            Unlock to Book
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-white p-5 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        isBestValue ? "border-green-400 shadow-lg" : "border-slate-200"
      }`}
    >
      <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
        {isFastest && (
          <div className="flex items-center gap-1.5 bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1.5 rounded-full">
            <Zap size={14} />
            <span>Fastest Delivery</span>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-start justify-between gap-5">
        <div className="flex-1 flex items-start gap-4">
          <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
            <Building2 className="text-slate-500" size={28} />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-lg text-slate-800 pr-28 md:pr-0">
              {quote.companyName}
            </h3>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 flex items-center gap-1.5 text-blue-600 font-semibold text-sm hover:text-blue-800 transition-colors"
            >
              {isExpanded ? "Hide Details" : "Show Bifurcation"}
              <ChevronRight
                size={16}
                className={`transition-transform duration-300 ${
                  isExpanded ? "rotate-90" : "rotate-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex flex-row md:flex-col items-end gap-x-6 md:gap-y-1 w-full md:w-auto text-right">
          <div className="flex-1 md:flex-initial">
            <div className="flex items-center justify-end gap-1 font-bold text-3xl text-slate-900">
              <IndianRupee size={22} className="text-slate-600" />
              <span>
                {new Intl.NumberFormat("en-IN", {
                    maximumFractionDigits: 2,
                }).format(quote.totalCharges)}
              </span>
            </div>
            
            <div className="flex items-center justify-end gap-x-2 -mt-1">
                <span className="text-xs text-slate-500">Total Charges</span>
                <span className="text-slate-300">·</span>
                <button
                onClick={handleMoreDetailsClick}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                Contact Now
                </button>
            </div>
          </div>

          <div className="flex-1 md:flex-initial mt-0 md:mt-2">
            <div className="flex items-center justify-end gap-2 font-semibold text-slate-700 text-lg">
              <Clock size={16} className="text-slate-500" />
              <span>
    {Math.ceil(quote.estimatedTime)} {Math.ceil(quote.estimatedTime) === 1 ? 'Day' : 'Days'}
  </span>
            </div>
            <div className="text-xs text-slate-500">Est. Delivery</div>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && <BifurcationDetails quote={quote} />}
      </AnimatePresence>
    </div>
  );
};

export default CalculatorPage;