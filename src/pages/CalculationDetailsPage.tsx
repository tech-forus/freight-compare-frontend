
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Calculator,
    Fuel,
    Info,
    Truck,
    BookOpen,
    X,
    Sigma
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface FormulaParams {
    source: 'MongoDB' | 'UTSF';
    kFactor: number;
    fuelPercent: number;
    docketCharge: number;
    rovPercent: number;
    rovFixed: number;
    minCharges: number;
    odaConfig: {
        isOda: boolean;
        fixed: number;
        variable: number;
    };
    unitPrice: number;
    baseFreight: number;
    effectiveBaseFreight: number;
}

// --- Components ---

// 1. Formula Guide Sidebar (The "Studious" A-Z Guide)
const FormulaGuide = ({ isOpen, onClose, quote }: { isOpen: boolean; onClose: () => void; quote: any }) => {
    const [activeTab, setActiveTab] = useState<'glossary' | 'example'>('example');
    const params: FormulaParams = quote?.formulaParams || {};

    // Helper to format currency
    const formatMoney = (amount: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);

    const glossary = [
        {
            term: "Actual Weight",
            def: "The physical weight of the shipment as measured on a scale.",
            formula: "Measured in kg"
        },
        {
            term: "Volumetric Weight",
            def: "Weight calculated based on the dimensions of the package. Lighter but bulky items are charged by this weight.",
            formula: "(Length × Width × Height) / kFactor (usually 5000)"
        },
        {
            term: "Chargeable Weight",
            def: "The weight used to calculate the Base Freight. It is the higher of the Actual Weight or Volumetric Weight.",
            formula: "MAX(Actual Weight, Volumetric Weight)"
        },
        {
            term: "Base Freight",
            def: "The core transport cost derived from the zone-to-zone rate card.",
            formula: "Chargeable Weight × Rate per kg"
        },
        {
            term: "Minimum Freight (Min Charge)",
            def: "The minimum amount a transporter charges for a shipment, regardless of weight.",
            formula: "If Base Freight < Min Charge, then Min Charge is applied."
        },
        {
            term: "Fuel Surcharge",
            def: "A variable surcharge to account for fluctuating fuel prices.",
            formula: "Effective Base Freight × Fuel %"
        },
        {
            term: "Docket Charge",
            def: "A fixed administrative fee for issuing the consignment note (LR/Docket).",
            formula: "Fixed Amount"
        },
        {
            term: "ROV (Risk on Value)",
            def: "Liability coverage for the shipment value (Carrier's Risk).",
            formula: "MAX(Invoice Value × ROV %, Fixed ROV Amount)"
        },
        {
            term: "ODA (Out of Delivery Area)",
            def: "Extra charge for deliveries to remote or non-serviceable locations.",
            formula: "Fixed ODA + (Chargeable Weight × Variable ODA %)"
        },
        {
            term: "Handling Charge",
            def: "Fee for loading/unloading or special handling of cargo.",
            formula: "Fixed + ((Weight - Threshold) × Variable %)"
        },
        {
            term: "Appointment Charge",
            def: "Fee for shipments requiring a specific delivery appointment.",
            formula: "MAX(Base Freight × Appt %, Fixed Appt Amount)"
        },
        {
            term: "Invoice Value Charge",
            def: "Additional surcharge based on total property value.",
            formula: "MAX(Invoice Value × %, Min Amount)"
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black z-40"
                    />
                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white z-50 shadow-2xl overflow-y-auto flex flex-col"
                    >
                        <div className="p-6 sticky top-0 bg-white z-10 border-b border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <BookOpen className="text-blue-600" />
                                    Formula Guide
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex p-1 bg-slate-100 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('example')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'example'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Worked Example
                                </button>
                                <button
                                    onClick={() => setActiveTab('glossary')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'glossary'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    A-Z Glossary
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {activeTab === 'example' ? (
                                <div className="space-y-6 text-sm">
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                        <h3 className="font-bold text-slate-800 mb-1">Current Scenario</h3>
                                        <p className="text-slate-600">
                                            Shipment of <span className="font-mono font-bold text-slate-900">{quote.actualWeight} kg</span> (Actual) / <span className="font-mono font-bold text-slate-900">{quote.volumetricWeight} kg</span> (Volumetric).
                                        </p>
                                    </div>

                                    {/* Step 1 */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                                            <span className="bg-blue-100 text-blue-700 w-5 h-5 flex items-center justify-center rounded text-xs">1</span>
                                            Chargeable Weight Logic
                                        </h4>
                                        <div className="pl-3 border-l-2 border-slate-100 space-y-4">
                                            <div>
                                                <div className="flex justify-between text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Actual Weight</div>
                                                <div className="font-mono text-slate-700">{quote.actualWeight} kg</div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Volumetric Weight</div>

                                                {quote.boxes && quote.boxes.length > 0 && (
                                                    <div className="bg-white p-2 rounded border border-slate-200 mb-2">
                                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                                                            Dimensions ({quote.boxes.length} {quote.boxes.length === 1 ? 'Box' : 'Boxes'})
                                                        </div>
                                                        <div className="space-y-1">
                                                            {quote.boxes.map((box: any, idx: number) => (
                                                                <div key={idx} className="flex justify-between text-xs text-slate-600 font-mono">
                                                                    <span>
                                                                        {box.length}×{box.width}×{box.height}
                                                                    </span>
                                                                    <span className="text-slate-400">
                                                                        ({box.count}x)
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="font-mono text-slate-600 mb-1">(L×B×H) / {params.kFactor}</div>
                                                <div className="font-mono text-slate-800">= {quote.volumetricWeight} kg</div>
                                            </div>
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                                <div className="text-blue-800 font-bold mb-1">Chargeable Weight</div>
                                                <div className="font-mono text-blue-900">
                                                    = MAX({quote.actualWeight}, {quote.volumetricWeight}) = <b>{quote.chargeableWeight} kg</b>
                                                </div>
                                                <div className="text-xs text-blue-600 mt-1">
                                                    Checkmark: {quote.actualWeight >= quote.volumetricWeight ? "Actual" : "Volumetric"} Weight Applied
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step 2 */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                                            <span className="bg-blue-100 text-blue-700 w-5 h-5 flex items-center justify-center rounded text-xs">2</span>
                                            Base Freight
                                        </h4>
                                        <div className="pl-3 border-l-2 border-slate-100 space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Rate</span>
                                                <span className="font-mono">{formatMoney(params.unitPrice)} / kg</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Calculated ({quote.chargeableWeight} × {params.unitPrice})</span>
                                                <span className="font-mono">{formatMoney(quote.chargeableWeight * params.unitPrice)}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-400 text-xs">
                                                <span>Minimum Floor</span>
                                                <span>{formatMoney(params.minCharges)}</span>
                                            </div>
                                            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800">
                                                <span>Effective Base Freight</span>
                                                <span>{formatMoney(params.baseFreight)}</span>
                                            </div>
                                            <div className="text-xs text-slate-400 italic">
                                                (MAX of Calculated vs Minimum)
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step 3 */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                                            <span className="bg-blue-100 text-blue-700 w-5 h-5 flex items-center justify-center rounded text-xs">3</span>
                                            Surcharges
                                        </h4>
                                        <div className="pl-3 border-l-2 border-slate-100 space-y-3">
                                            {quote.docketCharge > 0 && (
                                                <div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-700 font-medium">Docket Charge</span>
                                                        <span className="font-mono">{formatMoney(quote.docketCharge)}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400">Fixed Fee</div>
                                                </div>
                                            )}
                                            {quote.fuelCharges > 0 && (
                                                <div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-700 font-medium">Fuel Surcharge</span>
                                                        <span className="font-mono">{formatMoney(quote.fuelCharges)}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {params.fuelPercent}% × {formatMoney(params.baseFreight)} (Effective Base)
                                                    </div>
                                                </div>
                                            )}
                                            {quote.rovCharges > 0 && (
                                                <div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-700 font-medium">ROV</span>
                                                        <span className="font-mono">{formatMoney(quote.rovCharges)}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        MAX(Value × {params.rovPercent}%, Fixed {formatMoney(params.rovFixed)})
                                                    </div>
                                                </div>
                                            )}
                                            {/* Other charges as a summary line if relevant */}
                                            <div className="text-xs text-slate-400 italic pt-1">
                                                + Any other applicable charges (ODA, Handling, etc.)
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step 4 */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                                            <span className="bg-blue-100 text-blue-700 w-5 h-5 flex items-center justify-center rounded text-xs">4</span>
                                            Total
                                        </h4>
                                        <div className="bg-slate-900 text-white p-4 rounded-xl">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-slate-400 text-xs">Sum of all components</span>
                                            </div>
                                            <div className="font-mono text-xl font-bold flex justify-between items-center">
                                                <span>Total</span>
                                                <span>{formatMoney(quote.totalCharges)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {glossary.map((item, idx) => (
                                        <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <h3 className="font-bold text-slate-800 text-lg mb-2">{item.term}</h3>
                                            <p className="text-slate-600 text-sm mb-3 leading-relaxed">{item.def}</p>
                                            <div className="bg-blue-50 text-blue-800 px-3 py-2 rounded-lg text-xs font-mono border border-blue-100 flex items-start gap-2">
                                                <Sigma size={14} className="mt-0.5 flex-shrink-0" />
                                                <span>{item.formula}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-8 pt-8 border-t border-slate-200 text-center text-slate-400 text-xs">
                                <p>Freight Calculation Standard v2.2</p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const CalculationDetailsPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const quote = location.state?.quote;
    const [showFormulas, setShowFormulas] = useState(false); // Toggle for "Studious Mode"
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    if (!quote) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <p className="text-slate-500 mb-4">No quote data found.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const params: FormulaParams = quote.formulaParams || {};
    const hasFormulaData = !!quote.formulaParams;

    // Helper to format currency
    const formatMoney = (amount: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <FormulaGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} quote={quote} />

            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-slate-500 hover:text-slate-800 transition-colors mb-4"
                    >
                        <ArrowLeft size={16} className="mr-1" /> Back to Results
                    </button>

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                                <button
                                    onClick={() => setIsGuideOpen(true)}
                                    className="p-1 hover:bg-blue-50 rounded-full transition-colors"
                                    title="Open Formula Guide"
                                >
                                    <Calculator className="text-blue-600" />
                                </button>
                                Calculation Breakdown
                            </h1>
                            <p className="text-slate-500 mt-2">
                                Detailed analysis for <span className="font-semibold text-slate-700">{quote.companyName}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Studious Mode Toggle */}
                            <button
                                onClick={() => setShowFormulas(!showFormulas)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${showFormulas
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Sigma size={16} />
                                <span className="text-sm font-medium">
                                    {showFormulas ? 'Show Values' : 'Show Logic'}
                                </span>
                            </button>

                            {/* Formula Guide Trigger */}
                            <button
                                onClick={() => setIsGuideOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
                            >
                                <BookOpen size={16} />
                                <span className="text-sm font-medium">Formula Guide</span>
                            </button>
                        </div>
                    </div>
                </div>

                {!hasFormulaData ? (
                    <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-dashed border-slate-300">
                        <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700">Detailed Breakdown Not Available</h3>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">
                            This quote was calculated using an older method or external service that does not utilize the detailed formula engine.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* 1. Weight Calculation */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Truck size={20} className="text-slate-400" />
                                    Step 1: Weight Logic
                                </h3>
                                <div className="text-xs font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                                    Chargeable = MAX(Actual, Volumetric)
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Actual Weight</div>
                                    <div className="text-2xl font-light text-slate-700">{quote.actualWeight} <span className="text-sm text-slate-400">kg</span></div>
                                </div>
                                <div className="relative">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Volumetric Weight</div>
                                    <div className="text-2xl font-light text-slate-700">
                                        {showFormulas
                                            ? <span className="text-sm font-mono text-indigo-600">(L×B×H)/{params.kFactor}</span>
                                            : <span>{quote.volumetricWeight} <span className="text-sm text-slate-400">kg</span></span>
                                        }
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1 font-mono">
                                        Divisor (kFactor): {params.kFactor}
                                    </div>
                                    {quote.volumetricWeight > quote.actualWeight && (
                                        <div className="absolute top-0 right-0">
                                            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Applied</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Chargeable Weight</div>
                                    <div className="text-3xl font-bold text-blue-600">{quote.chargeableWeight} <span className="text-lg text-blue-400">kg</span></div>
                                    <div className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                        {quote.actualWeight >= quote.volumetricWeight ? "Actual Weight Applied" : "Volumetric Weight Applied"}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. Base Freight */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                                <h3 className="font-bold text-slate-800">Step 2: Base Freight Calculation</h3>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-slate-600 font-medium">Zone Rate (per kg)</span>
                                    <span className="font-mono text-slate-900">{formatMoney(params.unitPrice)}</span>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-600 font-medium">Chargeable Weight</span>
                                    <span className="font-mono text-slate-900">× {quote.chargeableWeight}</span>
                                </div>
                                <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
                                    <span className="text-slate-600 font-medium">Min Freight Floor</span>
                                    <span className="font-mono text-slate-500">{formatMoney(params.minCharges || 0)}</span>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800">Effective Base Freight</span>
                                        <span className="text-xs text-slate-500 font-mono mt-1">MAX(Calculated, Min)</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-xl text-slate-900">
                                            {showFormulas
                                                ? <span className="font-mono text-lg text-indigo-600">MAX({params.unitPrice * quote.chargeableWeight}, {params.minCharges})</span>
                                                : formatMoney(params.baseFreight)
                                            }
                                        </div>
                                        {params.baseFreight <= params.minCharges && params.minCharges > 0 && (
                                            <div className="text-xs text-amber-600 mt-1 font-medium">
                                                Minimum Floor Applied
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 3. Surcharges (Receipt Style) */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">Step 3: Surcharges & Additional Fees</h3>
                                {showFormulas && <span className="text-xs text-indigo-600 font-medium px-2 py-1 bg-indigo-50 rounded">Logic View Active</span>}
                            </div>
                            <div className="p-6 space-y-5">
                                {/* Docket */}
                                {quote.docketCharge > 0 && (
                                    <div className="flex items-start justify-between group">
                                        <div>
                                            <div className="text-slate-700 font-bold">Docket Charge</div>
                                            <div className="text-xs text-slate-400 mt-0.5">Fixed administrative fee</div>
                                        </div>
                                        <div className="font-mono text-slate-900 font-medium">
                                            {showFormulas
                                                ? <span className="text-indigo-600">Fixed</span>
                                                : formatMoney(quote.docketCharge)
                                            }
                                        </div>
                                    </div>
                                )}

                                {/* Fuel */}
                                {quote.fuelCharges > 0 && (
                                    <div className="flex items-start justify-between group">
                                        <div>
                                            <div className="text-slate-700 font-bold flex items-center gap-1.5">
                                                <Fuel size={14} className="text-slate-400" />
                                                Fuel Surcharge
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                {params.fuelPercent}% of Effective Base Freight
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-slate-900 font-medium">
                                                {showFormulas
                                                    ? <span className="text-indigo-600 text-sm">{formatMoney(params.baseFreight)} × {params.fuelPercent}%</span>
                                                    : formatMoney(quote.fuelCharges)
                                                }
                                            </div>
                                            {!showFormulas && <div className="text-xs text-slate-400 mt-0.5">{params.fuelPercent}% of Base Freight</div>}
                                        </div>
                                    </div>
                                )}

                                {/* ROV */}
                                {quote.rovCharges > 0 && (
                                    <div className="flex items-start justify-between group">
                                        <div>
                                            <div className="text-slate-700 font-bold">ROV (Risk on Value)</div>
                                            <div className="text-xs text-slate-400 mt-0.5">Carrier's risk liability (on Invoice Value)</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-slate-900 font-medium">
                                                {showFormulas
                                                    ? <span className="text-indigo-600 text-sm">MAX(Invoice Value × {params.rovPercent}%, Fixed {formatMoney(params.rovFixed)})</span>
                                                    : formatMoney(quote.rovCharges)
                                                }
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ODA */}
                                {quote.odaCharges > 0 && (
                                    <div className="flex items-start justify-between group">
                                        <div>
                                            <div className="text-slate-700 font-bold">ODA Charge</div>
                                            <div className="text-xs text-slate-400 mt-0.5">Out of Delivery Area Surcharge</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-slate-900 font-medium">
                                                {showFormulas
                                                    ? <span className="text-indigo-600 text-sm">{formatMoney(params.odaConfig.fixed)} + ({quote.chargeableWeight} × {params.odaConfig.variable}%)</span>
                                                    : formatMoney(quote.odaCharges)
                                                }
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Invoice Value Charge */}
                                {quote.invoiceValueCharge > 0 && (
                                    <div className="flex items-start justify-between group">
                                        <div>
                                            <div className="text-slate-700 font-bold">Invoice Value Charge</div>
                                            <div className="text-xs text-slate-400 mt-0.5">Based on declared value</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-slate-900 font-medium">
                                                {showFormulas
                                                    ? <span className="text-indigo-600 text-sm">MAX(Invoice × %, Min)</span>
                                                    : formatMoney(quote.invoiceValueCharge)
                                                }
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Generic Loop for others */}
                                {[
                                    { label: 'Green Tax', val: quote.greenTax, form: "Fixed" },
                                    { label: 'Handling', val: quote.handlingCharges, form: "Fixed + (Wt × Var%)" },
                                    { label: 'Appointment', val: quote.appointmentCharges, form: "Base × %" },
                                    { label: 'DACC', val: quote.daccCharges, form: "Fixed" },
                                    { label: 'Misc', val: quote.miscCharges, form: "Fixed" },
                                    { label: 'Insurance', val: quote.insuaranceCharges, form: "Base × %" },
                                    { label: 'FM Charges', val: quote.fmCharges, form: "Base × %" },
                                ]
                                    .filter(x => x.val > 0)
                                    .map(item => (
                                        <div key={item.label} className="flex items-start justify-between group">
                                            <div className="text-slate-700 font-bold">{item.label}</div>
                                            <div className="font-mono text-slate-900 font-medium">
                                                {showFormulas
                                                    ? <span className="text-indigo-600 text-sm">{item.form}</span>
                                                    : formatMoney(item.val)
                                                }
                                            </div>
                                        </div>
                                    ))}

                                <div className="border-t-2 border-slate-100 mt-6 pt-6 flex items-center justify-between">
                                    <div>
                                        <div className="text-xl font-extrabold text-slate-900">Total Amount</div>
                                        <div className="text-xs text-slate-400 mt-1">Inclusive of all surcharges</div>
                                    </div>
                                    <div className="text-3xl font-extrabold text-blue-600">{formatMoney(quote.totalCharges)}</div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CalculationDetailsPage;
